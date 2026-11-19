const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function harness() {
  const listeners = {}, shown = [], navigations = [], opened = [];
  let background;
  const context = vm.createContext({
    URL, importScripts() {},
    self: {
      POTONCHU_FIREBASE_CONFIG: { apiKey: "test", projectId: "test", appId: "test" },
      addEventListener: (type, fn) => { listeners[type] = fn; },
      registration: { scope: "https://example.com/POTONCYU/", getNotifications: async () => [], showNotification: async (title, options) => shown.push({ title, options }) },
      clients: { matchAll: async () => [{ url: "https://example.com/POTONCYU/", navigate: async (url) => navigations.push(url), focus: async () => {} }], openWindow: async (url) => opened.push(url), claim: async () => {} },
      skipWaiting: async () => {},
    },
    firebase: { initializeApp() {}, messaging: () => ({ onBackgroundMessage: (fn) => { background = fn; } }) },
  });
  vm.runInContext(fs.readFileSync(require.resolve("../firebase-messaging-sw.js"), "utf8"), context);
  vm.runInContext('let testOwner="me"; ownerStore=async(mode,action)=>action({put:(value)=>{testOwner=value;return value},get:()=>testOwner});', context);
  const message = async (userId, url = "https://example.com/POTONCYU/") => {
    let done;
    listeners.message({ source: { url }, data: { type: "notification-session", userId }, waitUntil: (promise) => { done = promise; } });
    if (done) await done;
  };
  return { context, listeners, shown, navigations, opened, background: (payload) => background(payload), message };
}

test("background pushes display once with a stable tag and cannot open an external site", async () => {
  const app = harness();
  await app.background({ data: { recipientId: "me", notificationId: "id", title: "一首", url: "https://attacker.example/" } });
  assert.equal(app.shown.length, 1);
  assert.equal(app.shown[0].options.tag, "id");
  assert.equal(app.shown[0].options.data.url, "https://example.com/POTONCYU/");
  assert.equal(vm.runInContext('safeNotificationUrl("http://[")', app.context), "https://example.com/POTONCYU/");
  await app.background({ notification: { title: "Already shown by FCM" }, data: { recipientId: "me" } });
  assert.equal(app.shown.length, 1);
});

test("worker rejects another account and suppresses queued pushes after logout", async () => {
  const app = harness();
  await app.background({ data: { recipientId: "other" } });
  await app.message("attacker", "https://example.com/another-project/");
  await app.background({ data: { recipientId: "attacker" } });
  assert.equal(app.shown.length, 0);
  await app.message("");
  await app.background({ data: { recipientId: "me" } });
  assert.equal(app.shown.length, 0);
});

test("notification click focuses the app at the intended room, preserving the Pages subdirectory", async () => {
  const app = harness();
  let done, stopped = false;
  app.listeners.notificationclick({
    notification: { data: { potonchu: true, recipientId: "me", url: "https://example.com/POTONCYU/?roomId=r" }, close() {} },
    stopImmediatePropagation: () => { stopped = true; }, waitUntil: (promise) => { done = promise; },
  });
  await done;
  assert.equal(stopped, true);
  assert.deepEqual(app.navigations, ["https://example.com/POTONCYU/?roomId=r"]);
  assert.deepEqual(app.opened, []);
});
