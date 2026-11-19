// Install our click handler before Firebase's handler.
self.addEventListener("notificationclick", (event) => {
  if (!event.notification.data?.potonchu) return;
  event.stopImmediatePropagation();
  event.notification.close();
  event.waitUntil((async () => {
    // Another account's notification opens the app itself, never that account's room.
    const allowed = await recipientAllowed(event.notification.data.recipientId);
    const targetUrl = allowed ? safeNotificationUrl(event.notification.data.url) : self.registration.scope;
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = clients.find((client) => safeClientUrl(client.url));
    if (existing) {
      try {
        await existing.navigate(targetUrl);
        return await existing.focus();
      } catch { /* Some browsers cannot navigate an open window; open the room instead. */ }
    }
    return self.clients.openWindow(targetUrl);
  })());
});

// Display from the push event itself. The Firebase SDK below only forwards a message to the
// page while the app is visible, and iOS revokes a subscription after pushes that end without
// a notification. Registered before the SDK is loaded so it also works if that load fails.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  event.waitUntil((async () => {
    let payload;
    try { payload = event.data.json(); } catch { return; }
    await showPotonchuNotification(payload);
  })());
});

async function showPotonchuNotification(payload) {
  const data = payload?.data || {};
  if (typeof data.recipientId !== "string" || !data.recipientId) return;
  if (!await recipientAllowed(data.recipientId)) return;
  return self.registration.showNotification(String(data.title || "ぽとんちゅ").slice(0, 120), {
    body: String(data.body || "新しいお知らせが届きました。").slice(0, 300),
    icon: new URL("assets/notification-icon.png", self.registration.scope).href,
    badge: new URL("assets/notification-icon.png", self.registration.scope).href,
    tag: String(data.notificationId || payload.fcmMessageId || payload.messageId || "potonchu").slice(0, 100),
    renotify: false,
    data: { potonchu: true, url: safeNotificationUrl(data.url), recipientId: data.recipientId },
  });
}

// Suppress only when this browser is known to belong to another account or to be signed out.
// An unreadable or never-written owner must not silently drop a notification.
async function recipientAllowed(recipientId) {
  let owner;
  try { owner = await readOwner(); } catch { return true; }
  return owner === undefined || owner === null || owner === recipientId;
}

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

// The SDK keeps the FCM registration alive and forwards messages to an open page.
// Showing the notification is done by the push listener above.
try {
  importScripts("./firebase-config.js?v=20261119-ai1");
  importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js");
  const firebaseConfig = self.POTONCHU_FIREBASE_CONFIG || {};
  if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
    firebase.initializeApp(firebaseConfig);
    firebase.messaging();
  }
} catch {
  console.warn("FCM SDK unavailable; notifications are still shown by the push listener.");
}
