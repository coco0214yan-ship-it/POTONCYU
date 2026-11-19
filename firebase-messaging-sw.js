// Install our click handler before Firebase's handler.
self.addEventListener("notificationclick", (event) => {
  if (!event.notification.data?.potonchu) return;
  event.stopImmediatePropagation();
  event.notification.close();
  event.waitUntil((async () => {
    if (await readOwner() !== event.notification.data.recipientId) return;
    const targetUrl = safeNotificationUrl(event.notification.data.url);
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = clients.find((client) => safeClientUrl(client.url));
    if (existing) {
      await existing.navigate(targetUrl);
      return existing.focus();
    }
    return self.clients.openWindow(targetUrl);
  })());
});

self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("message", (event) => {
  if (event.data?.type !== "notification-session" || !safeClientUrl(event.source?.url)) return;
  event.waitUntil((async () => {
    const owner = typeof event.data.userId === "string" ? event.data.userId.slice(0, 128) : "";
    await ownerStore("readwrite", (store) => store.put(owner, "userId"));
    const notifications = await self.registration.getNotifications();
    notifications.filter((notification) => notification.data?.recipientId !== owner).forEach((notification) => notification.close());
    event.ports?.[0]?.postMessage({ saved: true });
  })());
});

function safeClientUrl(raw) {
  try {
    const url = new URL(raw);
    const scope = new URL(self.registration.scope);
    return url.origin === scope.origin && url.pathname.startsWith(scope.pathname);
  } catch { return false; }
}

function safeNotificationUrl(raw) {
  try {
    const url = new URL(raw || "./", self.registration.scope);
    return safeClientUrl(url.href) ? url.href : self.registration.scope;
  } catch { return self.registration.scope; }
}

function ownerStore(mode, action) {
  return new Promise((resolve, reject) => {
    // Namespacing keeps separate GitHub Pages projects on the same origin isolated.
    const request = indexedDB.open(`potonchu-notifications:${self.registration.scope}`, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("session");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("session", mode);
      const result = action(transaction.objectStore("session"));
      transaction.oncomplete = () => { database.close(); resolve(result.result); };
      transaction.onabort = () => { database.close(); reject(transaction.error); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
    };
  });
}
function readOwner() { return ownerStore("readonly", (store) => store.get("userId")); }

importScripts("./firebase-config.js?v=20261117-fcm1");
importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js");

const firebaseConfig = self.POTONCHU_FIREBASE_CONFIG || {};
if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
  firebase.initializeApp(firebaseConfig);
  firebase.messaging().onBackgroundMessage(async (payload) => {
    // Notification payloads are already displayed by FCM; never show a second copy.
    if (payload.notification) return;
    const data = payload.data || {};
    if (!data.recipientId || await readOwner() !== data.recipientId) return;
    return self.registration.showNotification(data.title || "ぽとんちゅ", {
      body: data.body || "新しいお知らせが届きました。",
      icon: new URL("assets/notification-icon.png", self.registration.scope).href,
      tag: data.notificationId || payload.messageId || "potonchu",
      renotify: false,
      data: { potonchu: true, url: safeNotificationUrl(data.url), recipientId: data.recipientId },
    });
  });
}
