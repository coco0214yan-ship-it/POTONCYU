const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineString } = require("firebase-functions/params");
const { createNotificationService } = require("./notifications");

initializeApp();
const appUrl = defineString("NOTIFICATION_APP_URL", {
  default: "https://coco0214yan-ship-it.github.io/POTONCYU/",
  description: "公開WebアプリのHTTPS URL（末尾の / を含める）",
});
const service = () => createNotificationService({
  db: getFirestore(), messaging: getMessaging(), Timestamp, FieldValue, appUrl: appUrl.value(),
});

exports.generatePoems = require("./generate-poems").generatePoems;

// Keep the existing name and region so deployment updates the old trigger.
exports.sendPoemNotification = onDocumentCreated({
  document: "rooms/{roomId}/messages/{messageId}", retry: true,
}, (event) => service().onMessage(event));

exports.sendTalkNotification = onDocumentCreated({
  document: "rooms/{roomId}/messages/{messageId}/replies/{replyId}", retry: true,
}, (event) => service().onReply(event));

async function deviceRequest(request, enabled) {
  if (!request.auth) throw new HttpsError("unauthenticated", "先にログインしてください。");
  const token = request.data?.token;
  if (typeof token !== "string" || token.length < 20 || token.length > 4096 || /\s/.test(token)) {
    throw new HttpsError("invalid-argument", "通知の登録情報が正しくありません。");
  }
  await service().setDevice(request.auth.uid, token, enabled);
  return { enabled };
}

exports.registerNotificationDevice = onCall({ region: "asia-northeast1" }, (request) => deviceRequest(request, true));
exports.unregisterNotificationDevice = onCall({ region: "asia-northeast1" }, (request) => deviceRequest(request, false));

exports.sendPoemReminders = onSchedule({
  schedule: "every 5 minutes", timeZone: "Asia/Tokyo", region: "asia-northeast1",
  maxInstances: 1, timeoutSeconds: 300,
}, () => service().sendDueReminders());
