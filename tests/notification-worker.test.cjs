const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function harness(options = {}) {
  const listeners = {}, shown = [], navigations = [], opened = [];
  const context = vm.createContext({
    URL, console, importScripts() { if (options.sdkFails) throw new Error("offline"); },
    self: {
      POTONCHU_FIREBASE_CONFIG: { apiKey: "test", projectId: "test", appId: "test" },
      addEventListener: (type, fn) => { listeners[type] = fn; },
      registration: { scope: "https://example.com/POTONCYU/", getNotifications: async () => [], showNotification: async (title, options) => shown.push({ title, options }) },
      clients: { matchAll: async () => [{ url: "https://example.com/POTONCYU/", navigate: async (url) => navigations.push(url), focus: async () => {} }], openWindow: async (url) => opened.push(url), claim: async () => {} },
      skipWaiting: async () => {},
    },
    firebase: { initializeApp() {}, messaging: () => ({}) },
  });
  vm.runInContext(fs.readFileSync(require.resolve("../firebase-messaging-sw.js"), "utf8"), context);
  vm.runInContext('let testOwner="me"; ownerStore=async(mode,action)=>action({put:(value)=>{testOwner=value;return value},get:()=>testOwner});', context);
  const message = async (userId, url = "https://example.com/POTONCYU/") => {
    let done;
    listeners.message({ source: { url }, data: { type: "notification-session", userId }, waitUntil: (promise) => { done = promise; } });
    if (done) await done;
  };
  // FCM delivers a web push whose JSON carries the message's data map.
  const push = async (payload) => {
    let done;
    listeners.push({ data: payload === undefined ? null : { json: () => payload }, waitUntil: (promise) => { done = promise; } });
    if (done) await done;
  };
  const owner = (code) => vm.runInContext(code, context);
  return { context, listeners, shown, navigations, opened, push, message, owner };
}

test("every push displays once with a stable tag and cannot open an external site", async () => {
  const app = harness();
  await app.push({ data: { recipientId: "me", notificationId: "id", title: "一首", url: "https://attacker.example/" } });
  assert.equal(app.shown.length, 1);
  assert.equal(app.shown[0].title, "一首");
  assert.equal(app.shown[0].options.tag, "id");
  assert.equal(app.shown[0].options.data.url, "https://example.com/POTONCYU/");
  assert.equal(vm.runInContext('safeNotificationUrl("http://[")', app.context), "https://example.com/POTONCYU/");
  await app.push(undefined);
  await app.push({ data: {} });
  assert.equal(app.shown.length, 1);
});

test("the push listener still displays when the Firebase SDK cannot be loaded", async () => {
  const app = harness({ sdkFails: true });
  await app.push({ data: { recipientId: "me", notificationId: "id", title: "一首" } });
  assert.equal(app.shown.length, 1);
});

test("a missing or unreadable owner record does not drop the notification", async () => {
  const app = harness();
  app.owner("testOwner=undefined");
  await app.push({ data: { recipientId: "me", notificationId: "a" } });
  app.owner('ownerStore=async()=>{throw new Error("IndexedDB unavailable")}');
  await app.push({ data: { recipientId: "me", notificationId: "b" } });
  assert.deepEqual(app.shown.map((item) => item.options.tag), ["a", "b"]);
  assert.equal(app.shown[0].title, "ぽとんちゅ");
});

test("worker rejects another account and suppresses queued pushes after logout", async () => {
  const app = harness();
  await app.push({ data: { recipientId: "other" } });
  await app.message("attacker", "https://example.com/another-project/");
  await app.push({ data: { recipientId: "attacker" } });
  assert.equal(app.shown.length, 0);
  await app.message("");
  await app.push({ data: { recipientId: "me" } });
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

test("a click on another account's notification opens the app without that room; a window that cannot navigate falls back to opening", async () => {
  const app = harness();
  const click = async (recipientId) => {
    let done;
    app.listeners.notificationclick({
      notification: { data: { potonchu: true, recipientId, url: "https://example.com/POTONCYU/?roomId=r" }, close() {} },
      stopImmediatePropagation() {}, waitUntil: (promise) => { done = promise; },
    });
    await done;
  };
  await click("other");
  assert.deepEqual(app.navigations, ["https://example.com/POTONCYU/"]);
  app.context.self.clients.matchAll = async () => [{ url: "https://example.com/POTONCYU/", navigate: async () => { throw new Error("unsupported"); }, focus: async () => {} }];
  await click("me");
  assert.deepEqual(app.opened, ["https://example.com/POTONCYU/?roomId=r"]);
});
