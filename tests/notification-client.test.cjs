const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
function harness(permission = "granted") {
  const storage = () => { const values = new Map(); return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }; };
  const events = [], toasts = [];
  const registration = { active: { postMessage: (message) => events.push(["worker", message.userId]) } };
  const notification = { permission, requestPermission: async () => { events.push(["permission"]); return notification.permission; } };
  let listener;
  const context = vm.createContext({
    Date, console, URL, URLSearchParams, crypto: require("node:crypto"),
    localStorage: storage(), sessionStorage: storage(), Notification: notification,
    window: { Notification: notification, isSecureContext: true, location: { hostname: "example.com", search: "", href: "https://example.com/POTONCYU/" }, POTONCHU_FIREBASE_MESSAGING_VAPID_KEY: "test-key" },
    navigator: { serviceWorker: { register: async (url, options) => { events.push(["sw", url, options]); return registration; }, getRegistration: async () => registration } },
    document: { querySelector: () => ({}), visibilityState: "visible" },
    PotonchuPoems: require("../poem-engine"), PotonchuChatRules: require("../chat-rules"),
    calls: events, messages: toasts,
    testModule: { getToken: async (messaging, options) => { events.push(["token", options.vapidKey]); return "test-device-token"; }, deleteToken: async () => { events.push(["delete"]); }, onMessage: (messaging, fn) => { listener = fn; return () => {}; } },
  });
  const source = fs.readFileSync(require.resolve("../script.js"), "utf8");
  vm.runInContext(source.slice(0, source.indexOf('app.addEventListener("keydown", handleChatEnter)')), context);
  const run = (code) => vm.runInContext(code, context);
  run(`saveSessionUser({id:"me",name:"テスト"}); refreshAppState(); render=()=>{}; showToast=(text)=>messages.push(text);
    backend.mode="firebase"; backend.firebase={db:{},messaging:{},messagingModule:testModule,auth:{},authModule:{signOut:async()=>calls.push(["signout"])}};
    backend.notificationCallables={register:async(data)=>calls.push(["register",data.token]),unregister:async(data)=>calls.push(["unregister",data.token])};`);
  return { run, events, toasts, notification, emit: (data) => listener({ data }) };
}

test("permission denial never registers a token or claims success", async () => {
  const app = harness("denied"); await app.run("enableNotifications()");
  assert.deepEqual(app.events, [["permission"]]);
  assert.equal(app.run("backend.notificationEnabled"), false);
  assert.match(app.run("backend.notificationStatus"), /ブロック/);
});

test("explicit enable registers the scoped worker and server token, restores without permission prompt, and logout unregisters first", async () => {
  const app = harness(); await app.run("enableNotifications()");
  assert.equal(app.run("backend.notificationEnabled"), true);
  assert.equal(app.events.find((event) => event[0] === "sw")[2].scope, "./");
  assert.equal(app.events.find((event) => event[0] === "token")[1], "test-key");
  app.run("backend.notificationEnabled=false");
  await app.run("restoreNotifications()");
  assert.equal(app.events.filter((event) => event[0] === "permission").length, 1);
  await app.run("signOutCurrentUser()");
  const unregister = app.events.findIndex((event) => event[0] === "unregister");
  const signout = app.events.findIndex((event) => event[0] === "signout");
  assert.ok(unregister >= 0 && unregister < signout);
  assert.equal(app.run("readNotificationDevice()"), null);
  assert.equal(app.run("backend.notificationEnabled"), false);
  assert.ok(app.events.some((event) => event[0] === "worker" && event[1] === ""));
});

test("foreground messages reject the wrong recipient and duplicates, suppress active chat, and label reminders", async () => {
  const app = harness(); await app.run("enableNotifications()"); app.run("setupForegroundNotifications()");
  app.toasts.length = 0;
  app.emit({ recipientId: "other", type: "text", notificationId: "wrong" });
  app.emit({ recipientId: "me", type: "text", notificationId: "one" });
  app.emit({ recipientId: "me", type: "text", notificationId: "one" });
  assert.equal(app.toasts.length, 1); assert.match(app.toasts[0], /メッセージ/);
  app.run('ui.view="chat"; appState.activeRoomId="r"');
  app.emit({ recipientId: "me", type: "text", roomId: "r", notificationId: "two" });
  assert.equal(app.toasts.length, 1);
  app.emit({ recipientId: "me", type: "reminder", roomId: "r", notificationId: "three" });
  assert.match(app.toasts[1], /12時間/);
});

test("registration failure keeps a safe error code and does not report an enabled device", async () => {
  const app = harness();
  app.run('backend.notificationCallables.register=async()=>{throw {code:"functions/unavailable",message:"secret"}}');
  await app.run("enableNotifications()");
  assert.equal(app.run("backend.notificationEnabled"), false);
  assert.match(app.run("backend.notificationStatus"), /functions\/unavailable/);
  assert.ok(!app.run("backend.notificationStatus").includes("secret"));
});
