const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

initializeApp();

exports.sendPoemNotification = onDocumentCreated("rooms/{roomId}/messages/{messageId}", async (event) => {
  const message = event.data?.data();
  if (!message) return;

  const roomId = event.params.roomId;
  const senderId = message.senderId;
  const senderName = message.senderName || "誰か";
  const db = getFirestore();
  const roomSnapshot = await db.doc(`rooms/${roomId}`).get();
  const memberIds = roomSnapshot.data()?.memberIds || [];
  const recipientIds = memberIds.filter((uid) => uid && uid !== senderId);
  if (recipientIds.length === 0) return;

  const tokenRefs = [];
  const tokenValues = [];
  const tokenSnapshots = await Promise.all(
    recipientIds.map((uid) => db.collection(`users/${uid}/notificationTokens`).get()),
  );

  tokenSnapshots.forEach((snapshot) => {
    snapshot.docs.forEach((doc) => {
      const token = doc.data().token;
      if (!token) return;
      tokenRefs.push(doc.ref);
      tokenValues.push(token);
    });
  });

  if (tokenValues.length === 0) return;

  const url = message.notificationUrl || `/?roomId=${encodeURIComponent(roomId)}`;
  const response = await getMessaging().sendEachForMulticast({
    tokens: tokenValues,
    notification: {
      title: `${senderName}さんから一首`,
      body: "ぽとんと一首が届きました。",
    },
    data: {
      roomId,
      senderName,
      url,
    },
  });

  await Promise.all(
    response.responses.map((result, index) => {
      const code = result.error?.code || "";
      if (!code.includes("registration-token-not-registered") && !code.includes("invalid-registration-token")) {
        return Promise.resolve();
      }
      return tokenRefs[index].delete();
    }),
  );
});
