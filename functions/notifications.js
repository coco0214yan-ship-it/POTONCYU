"use strict";
const { createHash } = require("node:crypto");
const CONVERSATION_MS = 12 * 60 * 60 * 1000;
const LEASE_MS = 5 * 60 * 1000;
const STALE_MS = 90 * 24 * 60 * 60 * 1000;
const TEST_DELAY_MS = 5 * 1000;
const TEST_COOLDOWN_MS = 30 * 1000;
const INVALID_TOKEN_CODES = ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"];
const hash = (value) => createHash("sha256").update(value).digest("hex");
const millis = (value) => value?.toMillis?.() || 0;
const kindOf = (data) => data?.kind === "text" ? "text" : Array.isArray(data?.poemLines) && data.poemLines.length === 5 ? "poem" : null;

function createNotificationService({ db, messaging, Timestamp, FieldValue, appUrl, now = Date.now, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }) {
  const base = new URL(appUrl);
  if (base.protocol !== "https:" || base.username || base.password) throw new Error("NOTIFICATION_APP_URL must be HTTPS");
  base.search = "";
  base.hash = "";
  const roomUrl = (roomId) => { const url = new URL(base); url.searchParams.set("roomId", roomId); return url.href; };
  const tokenRef = (uid, id) => db.doc(`users/${uid}/notificationTokens/${id}`);

  async function setDevice(uid, token, enabled) {
    const id = hash(token);
    const device = db.doc(`_notificationDevices/${id}`);
    await db.runTransaction(async (tx) => {
      const old = (await tx.get(device)).data();
      // A shared browser belongs to only its most recently signed-in account.
      if (old?.userId && old.userId !== uid && enabled) tx.delete(tokenRef(old.userId, id));
      if (enabled) {
        tx.set(device, { userId: uid, updatedAt: FieldValue.serverTimestamp() });
        tx.set(tokenRef(uid, id), { token, userId: uid, updatedAt: FieldValue.serverTimestamp() });
      } else {
        if (old?.userId === uid) tx.delete(device);
        tx.delete(tokenRef(uid, id));
      }
      const legacyId = token.replaceAll("/", "_").replaceAll("+", "-").replaceAll("=", "");
      if (legacyId.length <= 1500 && legacyId !== id) tx.delete(tokenRef(uid, legacyId));
    });
  }

  async function removeInvalidToken(doc, token) {
    const device = db.doc(`_notificationDevices/${hash(token)}`);
    await db.runTransaction(async (tx) => {
      const saved = (await tx.get(device)).data();
      tx.delete(doc.ref);
      if (saved?.userId === doc.data().userId) tx.delete(device);
    });
  }

  async function sendToUser(uid, eventKey, data) {
    const deliveryRef = db.doc(`_notificationDeliveries/${hash(`${eventKey}:${uid}`)}`);
    const lease = await db.runTransaction(async (tx) => {
      const previous = (await tx.get(deliveryRef)).data() || {};
      if (previous.done) return null;
      if (millis(previous.leaseUntil) > now()) throw new Error("Notification delivery is already running");
      tx.set(deliveryRef, {
        done: false, delivered: previous.delivered || [], leaseUntil: Timestamp.fromMillis(now() + LEASE_MS),
        expiresAt: Timestamp.fromMillis(now() + 7 * 24 * 60 * 60 * 1000),
      });
      return new Set(previous.delivered || []);
    });
    if (!lease) return;
    try {
      const snapshot = await db.collection(`users/${uid}/notificationTokens`).get();
      const entries = new Map();
      for (const doc of snapshot.docs) {
        const saved = doc.data();
        if (saved.userId && saved.userId !== uid) continue;
        if (typeof saved.token !== "string" || !saved.token || lease.has(hash(saved.token))) continue;
        if (millis(saved.updatedAt) && millis(saved.updatedAt) < now() - STALE_MS) {
          await removeInvalidToken(doc, saved.token);
          continue;
        }
        if (!entries.has(saved.token)) entries.set(saved.token, []);
        entries.get(saved.token).push(doc);
      }
      const tokens = [...entries.keys()];
      let failed = false;
      for (let offset = 0; offset < tokens.length; offset += 500) {
        const chunk = tokens.slice(offset, offset + 500);
        // Data-only: the service worker's push listener displays exactly one notification.
        // High urgency so a phone in power saving still wakes for a chat message.
        const response = await messaging.sendEachForMulticast({
          tokens: chunk, data: { ...data, recipientId: uid, notificationId: hash(eventKey) },
          webpush: { headers: { TTL: "3600", Urgency: "high" } },
        });
        for (let i = 0; i < chunk.length; i++) {
          const result = response.responses[i];
          const invalid = INVALID_TOKEN_CODES.includes(result?.error?.code);
          if (result?.success || invalid) {
            lease.add(hash(chunk[i]));
            if (invalid) await Promise.all(entries.get(chunk[i]).map((doc) => removeInvalidToken(doc, chunk[i])));
          } else failed = true;
        }
        await deliveryRef.set({ delivered: [...lease], leaseUntil: Timestamp.fromMillis(now() + LEASE_MS) }, { merge: true });
      }
      if (failed) throw new Error("Some notifications failed temporarily; retrying");
      await deliveryRef.set({ done: true, leaseUntil: Timestamp.fromMillis(0) }, { merge: true });
    } catch (error) {
      await deliveryRef.set({ leaseUntil: Timestamp.fromMillis(0) }, { merge: true });
      throw error;
    }
  }

  // 「テスト通知を送る」。押した本人の、その端末だけに送る。
  // 少し待ってから送るので、アプリを閉じた状態でも届くかを確かめられる。
  async function sendTest(uid, token) {
    const saved = await tokenRef(uid, hash(token)).get();
    const device = saved.data();
    if (!device || device.token !== token || (device.userId && device.userId !== uid)) return { status: "not-registered" };
    const remaining = millis(device.testedAt) + TEST_COOLDOWN_MS - now();
    if (remaining > 0) return { status: "cooldown", retryAfterSeconds: Math.ceil(remaining / 1000) };
    await saved.ref.set({ testedAt: Timestamp.fromMillis(now()) }, { merge: true });
    await wait(TEST_DELAY_MS);
    try {
      await messaging.send({
        token,
        data: {
          type: "test", title: "通知のテスト", body: "この端末に通知が届きました。", url: base.href,
          recipientId: uid, notificationId: hash(`test:${uid}:${now()}`),
        },
        webpush: { headers: { TTL: "300", Urgency: "high" } },
      });
      return { status: "sent" };
    } catch (error) {
      if (!INVALID_TOKEN_CODES.includes(error?.code)) throw error;
      await removeInvalidToken(saved, token);
      return { status: "expired" };
    }
  }

  async function queueReminder(roomId, uid, messageId, poemAt) {
    const ref = db.doc(`_poemReminders/${hash(JSON.stringify([roomId, uid]))}`);
    await db.runTransaction(async (tx) => {
      const old = (await tx.get(ref)).data();
      if (old && (millis(old.poemAt) > poemAt || (millis(old.poemAt) === poemAt && old.poemId >= messageId))) return;
      tx.set(ref, {
        roomId, userId: uid, poemId: messageId, poemAt: Timestamp.fromMillis(poemAt),
        dueAt: Timestamp.fromMillis(poemAt + CONVERSATION_MS),
      });
    });
  }

  async function deliverMessage(event, isReply) {
    const message = event.data?.data();
    const kind = isReply ? (message?.kind === "text" ? "text" : null) : kindOf(message);
    if (!kind || (kind === "text" && !(typeof message.text === "string" && message.text.trim()))) return;
    const { roomId, messageId, replyId } = event.params;
    const room = (await db.doc(`rooms/${roomId}`).get()).data();
    const members = [...new Set((room?.memberIds || []).filter((id) => typeof id === "string" && id))];
    if (!members.includes(message.senderId)) return;
    if (!isReply && kind === "poem") {
      const poemAt = millis(event.data.createTime) || millis(message.createdAt);
      if (!poemAt) throw new Error("A server timestamp is required for poem reminders");
      await queueReminder(roomId, message.senderId, messageId, poemAt);
    }
    const data = {
      type: kind === "poem" ? "poem" : "text", roomId, messageId,
      title: kind === "poem" ? "新しい一首が届きました" : "新しいメッセージが届きました",
      body: "ぽとんちゅを開いて確認してね。", url: roomUrl(roomId),
    };
    await Promise.all(members.filter((uid) => uid !== message.senderId).map((uid) =>
      sendToUser(uid, `message:${roomId}:${messageId}:${replyId || ""}`, data)));
  }

  async function sendDueReminders() {
    const due = await db.collection("_poemReminders").where("dueAt", "<=", Timestamp.fromMillis(now())).limit(100).get();
    let failures = 0;
    for (const job of due.docs) {
      try {
        const reminder = job.data();
        const current = (await job.ref.get()).data();
        if (!current?.dueAt || current.poemId !== reminder.poemId || millis(current.dueAt) > now()) continue;
        const [room, poem] = await Promise.all([
          db.doc(`rooms/${current.roomId}`).get(),
          db.doc(`rooms/${current.roomId}/messages/${current.poemId}`).get(),
        ]);
        if (room.data()?.memberIds?.includes(current.userId) && poem.exists) {
          await sendToUser(current.userId, `reminder:${current.roomId}:${current.poemId}`, {
            type: "reminder", roomId: current.roomId, messageId: current.poemId,
            title: "次の一首を、ぽとんと", body: "前の一首から12時間。新しい一首で、また話そう。", url: roomUrl(current.roomId),
          });
        }
        await db.runTransaction(async (tx) => {
          const latest = (await tx.get(job.ref)).data();
          if (latest?.poemId === current.poemId) tx.update(job.ref, { dueAt: FieldValue.delete(), notifiedAt: FieldValue.serverTimestamp() });
        });
      } catch {
        failures++;
      }
    }
    if (failures) throw new Error(`${failures} poem reminders will be retried`);
    return { processed: due.size };
  }

  return { setDevice, sendTest, onMessage: (event) => deliverMessage(event, false), onReply: (event) => deliverMessage(event, true), sendDueReminders };
}

module.exports = { createNotificationService, CONVERSATION_MS, TEST_DELAY_MS, TEST_COOLDOWN_MS };
