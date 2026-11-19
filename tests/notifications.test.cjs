const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { createNotificationService, CONVERSATION_MS } = require("../functions/notifications");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const deleted = Symbol("delete");
class Timestamp {
  constructor(value) { this.value = value; }
  toMillis() { return this.value; }
  static fromMillis(value) { return new Timestamp(value); }
}

// An in-memory Firestore double that enforces read-before-write transactions.
function harness() {
  const records = new Map();
  let clock = 2_000_000_000_000;
  let transactionQueue = Promise.resolve();
  const calls = [], singles = [], waits = [];
  let respond = (tokens) => tokens.map(() => ({ success: true }));
  let single = async () => "message-id";
  const snapshot = (path) => ({ id: path.split("/").at(-1), ref: db.doc(path), exists: records.has(path), data: () => records.get(path) });
  function set(path, data, merge) {
    const next = merge ? { ...records.get(path), ...data } : { ...data };
    for (const key of Object.keys(next)) if (next[key] === deleted) delete next[key];
    records.set(path, next);
  }
  function query(path, predicate = () => true, count = Infinity) {
    return {
      where: (field, op, value) => query(path, (data) => predicate(data) && field in data && op === "<=" && data[field].toMillis() <= value.toMillis(), count),
      limit: (limit) => query(path, predicate, limit),
      get: async () => {
        const docs = [...records.keys()].filter((key) => key.startsWith(path + "/") && key.split("/").length === path.split("/").length + 1 && predicate(records.get(key))).slice(0, count).map(snapshot);
        return { docs, size: docs.length };
      },
    };
  }
  const db = {
    doc: (path) => ({ path, get: async () => snapshot(path), set: async (data, options) => set(path, data, options?.merge) }),
    collection: (path) => query(path),
    runTransaction: (fn) => {
      const result = transactionQueue.then(async () => {
        const writes = [];
        const value = await fn({
          get: async (ref) => { assert.equal(writes.length, 0, "all reads must precede writes"); return snapshot(ref.path); },
          set: (ref, data, options) => writes.push(() => set(ref.path, data, options?.merge)),
          update: (ref, data) => writes.push(() => set(ref.path, data, true)),
          delete: (ref) => writes.push(() => records.delete(ref.path)),
        });
        writes.forEach((write) => write());
        return value;
      });
      transactionQueue = result.catch(() => {});
      return result;
    },
  };
  const service = createNotificationService({
    db, Timestamp, FieldValue: { serverTimestamp: () => new Timestamp(clock), delete: () => deleted },
    now: () => clock, appUrl: "https://example.com/POTONCYU/",
    wait: async (ms) => { waits.push(ms); },
    messaging: {
      sendEachForMulticast: async (message) => { calls.push(message); return { responses: respond(message.tokens) }; },
      send: async (message) => { singles.push(message); return single(message); },
    },
  });
  records.set("rooms/r", { memberIds: ["sender", "friend", "friend"] });
  const token = (uid, value) => records.set(`users/${uid}/notificationTokens/${hash(value)}`, { token: value, userId: uid, updatedAt: new Timestamp(clock) });
  const event = (id = "p1", data = {}) => {
    const message = { senderId: "sender", poemLines: ["一", "二", "三", "四", "五"], createdAt: new Timestamp(clock), ...data };
    records.set(`rooms/r/messages/${id}`, message);
    return { params: { roomId: "r", messageId: id }, data: { data: () => message, createTime: new Timestamp(clock) } };
  };
  return { records, service, calls, singles, waits, token, event, advance: (time) => { clock += time; }, respond: (fn) => { respond = fn; }, single: (fn) => { single = fn; } };
}

test("message notification reaches current members, excludes sender, protects body and trusted URL, and deduplicates retries", async () => {
  const app = harness();
  app.token("sender", "own"); app.token("friend", "friend-token"); app.token("outsider", "outside");
  const event = app.event("p1", { notificationUrl: "https://attacker.example", senderName: "秘密の名前" });
  await app.service.onMessage(event);
  await app.service.onMessage(event);
  assert.equal(app.calls.length, 1);
  assert.deepEqual(app.calls[0].tokens, ["friend-token"]);
  assert.equal(app.calls[0].notification, undefined);
  assert.equal(app.calls[0].webpush.headers.Urgency, "high");
  assert.equal(app.calls[0].data.recipientId, "friend");
  assert.equal(app.calls[0].data.url, "https://example.com/POTONCYU/?roomId=r");
  assert.ok(!JSON.stringify(app.calls).includes("秘密の名前"));
  assert.equal([...app.records.keys()].filter((key) => key.startsWith("_poemReminders/")).length, 1);
});

test("text and legacy replies use message wording; nonmembers and unknown documents cannot trigger pushes", async () => {
  const app = harness(); app.token("friend", "token");
  await app.service.onMessage(app.event("t1", { kind: "text", text: "秘密の本文" }));
  assert.equal(app.calls[0].data.type, "text");
  assert.ok(!JSON.stringify(app.calls).includes("秘密の本文"));
  const reply = app.event("p1", { kind: "text", text: "返事" }); reply.params.replyId = "reply1";
  await app.service.onReply(reply);
  assert.equal(app.calls.length, 2);
  await app.service.onMessage(app.event("bad", { senderId: "outsider" }));
  await app.service.onMessage(app.event("unknown", { poemLines: [] }));
  assert.equal(app.calls.length, 2);
  assert.equal([...app.records.keys()].filter((key) => key.startsWith("_poemReminders/")).length, 0);
});

test("multicast splits at 500, removes invalid tokens and retries only temporary failures", async () => {
  const app = harness();
  for (let i = 0; i < 503; i++) app.token("friend", `token-${i}`);
  app.respond((tokens) => tokens.map((token) => token === "token-0" ? { error: { code: "messaging/registration-token-not-registered" } } : token === "token-501" ? { error: { code: "messaging/server-unavailable" } } : { success: true }));
  const event = app.event();
  await assert.rejects(app.service.onMessage(event), /temporarily/);
  assert.deepEqual(app.calls.map((call) => call.tokens.length), [500, 3]);
  assert.ok(!app.records.has(`users/friend/notificationTokens/${hash("token-0")}`));
  app.respond((tokens) => tokens.map(() => ({ success: true })));
  await app.service.onMessage(event);
  assert.deepEqual(app.calls[2].tokens, ["token-501"]);
});

test("reminders fire at the twelve-hour boundary once; new poems replace earlier deadlines and text does not move them", async () => {
  const app = harness(); app.token("sender", "own");
  const old = app.event("old"); await app.service.onMessage(old);
  app.advance(CONVERSATION_MS / 2);
  await app.service.onMessage(app.event("new"));
  await app.service.onMessage(old); // late retry must not restore the old deadline
  await app.service.onMessage(app.event("text", { kind: "text", text: "続き" }));
  app.advance(CONVERSATION_MS - 1);
  await app.service.sendDueReminders(); assert.equal(app.calls.length, 0);
  app.advance(1);
  await app.service.sendDueReminders();
  await app.service.sendDueReminders();
  assert.equal(app.calls.length, 1);
  assert.equal(app.calls[0].data.type, "reminder");
  assert.deepEqual(app.calls[0].tokens, ["own"]);
});

test("left rooms and deleted source poems do not generate reminders", async () => {
  for (const remove of ["membership", "poem"]) {
    const app = harness(); app.token("sender", "own"); await app.service.onMessage(app.event());
    if (remove === "membership") app.records.set("rooms/r", { memberIds: ["friend"] });
    else app.records.delete("rooms/r/messages/p1");
    app.advance(CONVERSATION_MS);
    await app.service.sendDueReminders();
    assert.equal(app.calls.length, 0);
  }
});

test("device registration moves ownership between accounts and a previous account cannot unregister the current one", async () => {
  const app = harness();
  await app.service.setDevice("one", "shared-token", true);
  await app.service.setDevice("two", "shared-token", true);
  assert.ok(!app.records.has(`users/one/notificationTokens/${hash("shared-token")}`));
  assert.ok(app.records.has(`users/two/notificationTokens/${hash("shared-token")}`));
  await app.service.setDevice("one", "shared-token", false);
  assert.equal(app.records.get(`_notificationDevices/${hash("shared-token")}`).userId, "two");
  await app.service.setDevice("two", "shared-token", false);
  assert.ok(!app.records.has(`users/two/notificationTokens/${hash("shared-token")}`));
});

test("callable endpoints reject signed-out/invalid registrations and derive ownership from auth, not client input", async () => {
  const fs = require("node:fs"), vm = require("node:vm");
  const calls = [];
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
  const modules = {
    "firebase-admin/app": { initializeApp() {} },
    "firebase-admin/firestore": { getFirestore() {}, Timestamp, FieldValue: {} },
    "firebase-admin/messaging": { getMessaging() {} },
    "firebase-functions/v2/firestore": { onDocumentCreated: (options, fn) => fn },
    "firebase-functions/v2/https": { onCall: (options, fn) => fn, HttpsError },
    "firebase-functions/v2/scheduler": { onSchedule: (options, fn) => fn },
    "firebase-functions/params": { defineString: (name, options) => ({ value: () => options.default }) },
    "./generate-poems": {},
    "./notifications": { createNotificationService: () => ({ setDevice: async (...args) => calls.push(args), sendTest: async (...args) => { calls.push(["test", ...args]); return { status: "sent" }; } }) },
  };
  const context = vm.createContext({ exports: {}, require: (name) => { assert.ok(name in modules); return modules[name]; } });
  vm.runInContext(fs.readFileSync(require.resolve("../functions/index.js"), "utf8"), context);
  const register = context.exports.registerNotificationDevice;
  await assert.rejects(register({ data: { token: "x".repeat(30) } }), { code: "unauthenticated" });
  for (const token of ["", 123, "x".repeat(4097), "contains spaces in this token"]) {
    await assert.rejects(register({ auth: { uid: "me" }, data: { token } }), { code: "invalid-argument" });
  }
  await register({ auth: { uid: "me" }, data: { token: "x".repeat(30), userId: "victim" } });
  assert.deepEqual(calls[0], ["me", "x".repeat(30), true]);
  const sendTest = context.exports.sendTestNotification;
  await assert.rejects(sendTest({ data: { token: "x".repeat(30) } }), { code: "unauthenticated" });
  await assert.rejects(sendTest({ auth: { uid: "me" }, data: { token: "short" } }), { code: "invalid-argument" });
  assert.equal((await sendTest({ auth: { uid: "me" }, data: { token: "y".repeat(30), userId: "victim" } })).status, "sent");
  assert.deepEqual(calls.at(-1), ["test", "me", "y".repeat(30)]);
});

test("a test notification goes only to the caller's own registered device, after a pause, and not too often", async () => {
  const { TEST_DELAY_MS, TEST_COOLDOWN_MS } = require("../functions/notifications");
  const app = harness();
  app.token("me", "my-device"); app.token("friend", "friend-device");
  assert.deepEqual(await app.service.sendTest("me", "friend-device"), { status: "not-registered" });
  assert.deepEqual(await app.service.sendTest("me", "unknown-device"), { status: "not-registered" });
  assert.equal(app.singles.length, 0);

  assert.deepEqual(await app.service.sendTest("me", "my-device"), { status: "sent" });
  assert.deepEqual(app.waits, [TEST_DELAY_MS]);
  assert.equal(app.singles.length, 1);
  assert.equal(app.singles[0].token, "my-device");
  assert.equal(app.singles[0].notification, undefined);
  assert.equal(app.singles[0].data.type, "test");
  assert.equal(app.singles[0].data.recipientId, "me");
  assert.equal(app.singles[0].data.url, "https://example.com/POTONCYU/");
  assert.equal(app.singles[0].webpush.headers.Urgency, "high");

  app.advance(TEST_COOLDOWN_MS - 4000);
  assert.deepEqual(await app.service.sendTest("me", "my-device"), { status: "cooldown", retryAfterSeconds: 4 });
  assert.equal(app.singles.length, 1);
  app.advance(4000);
  assert.deepEqual(await app.service.sendTest("me", "my-device"), { status: "sent" });
  assert.notEqual(app.singles[1].data.notificationId, app.singles[0].data.notificationId);
});

test("a test to an expired device removes its registration; other send failures are reported as errors", async () => {
  const app = harness();
  app.token("me", "old-device"); app.token("me", "good-device");
  app.single(async () => { throw Object.assign(new Error("gone"), { code: "messaging/registration-token-not-registered" }); });
  assert.deepEqual(await app.service.sendTest("me", "old-device"), { status: "expired" });
  assert.equal(app.records.has(`users/me/notificationTokens/${hash("old-device")}`), false);
  app.single(async () => { throw Object.assign(new Error("down"), { code: "messaging/internal-error" }); });
  await assert.rejects(app.service.sendTest("me", "good-device"), { code: "messaging/internal-error" });
  assert.equal(app.records.has(`users/me/notificationTokens/${hash("good-device")}`), true);
});
