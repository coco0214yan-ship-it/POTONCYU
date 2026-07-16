importScripts("./firebase-config.js");
importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js");

const firebaseConfig = self.POTONCHU_FIREBASE_CONFIG || {};

if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || "ぽとんちゅ";
    const body = payload.notification?.body || payload.data?.body || "一首が届きました。";
    const roomId = payload.data?.roomId || "";
    const url = payload.data?.url || payload.data?.notificationUrl || (roomId ? `./?roomId=${encodeURIComponent(roomId)}` : "./");

    self.registration.showNotification(title, {
      body,
      data: { url },
    });
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || "./";
  const targetUrl = new URL(rawUrl, self.location.origin + self.registration.scope).toString();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((client) => client.url === targetUrl);
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    }),
  );
});
