const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function harness() {
  const storage = () => {
    const values = new Map();
    return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  };
  const node = { addEventListener() {}, classList: { add() {}, remove() {} } };
  const context = vm.createContext({
    console, URLSearchParams, Date, crypto: require("node:crypto"),
    document: { querySelector: () => node }, navigator: { onLine: true },
    window: { location: { search: "" }, setTimeout() {}, clearTimeout() {} },
    sessionStorage: storage(), localStorage: storage(),
    PotonchuPoems: require("../poem-engine.js"), PotonchuFeedback: { enabled: true, play() {} },
  });
  const source = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  vm.runInContext(source.slice(0, source.indexOf('app.addEventListener("click"')), context);
  vm.runInContext(`
    saveSessionUser({ id: "me", name: "ためす人" });
    sessionStorage.setItem(ACTIVE_ROOM_KEY, "room_test");
    backend.mode = "firebase";
    sharedState.rooms = [normalizeRoom({id: "room_test", members: [{id: "me"}], messages: [{
      id: "msg_test", author: {id: "friend"}, lines: ["一", "二", "三", "四", "五"], reactions: {"👍": ["friend"]}
    }]})];
    refreshAppState();
    ui.view = "chat";
    render = () => refreshAppState();
    globalThis.writes = [];
    backend.firebase = { db: {}, firestoreModule: {
      doc: (...args) => args.slice(1).join("/"),
      FieldPath: class { constructor(...segments) { this.segments = segments; } },
      arrayUnion: (uid) => ({ operation: "union", uid }),
      arrayRemove: (uid) => ({ operation: "remove", uid }),
      updateDoc: (...args) => new Promise((resolve, reject) => writes.push({args, resolve, reject})),
    }};
  `, context);
  return { run: (code) => vm.runInContext(code, context), json: (code) => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, context)) };
}

test("a reaction appears immediately; a failed write rolls back only this user", async () => {
  const app = harness();
  const saving = app.run('toggleReaction("room_test", "msg_test", "👍")');
  assert.deepEqual(app.json('sharedState.rooms[0].messages[0].reactions["👍"]'), ["friend", "me"]);
  assert.equal(app.run("writes.length"), 1);
  await app.run('toggleReaction("room_test", "msg_test", "👍")');
  assert.equal(app.run("writes.length"), 1, "double tap must not duplicate writes");
  app.run(`sharedState.rooms[0].messages[0] = overlayPendingReactions("room_test", {
    ...sharedState.rooms[0].messages[0], reactions: {"👍": ["friend", "another"], "わかる": ["another"]}
  }); writes[0].reject({code: "permission-denied"});`);
  await saving;
  assert.deepEqual(app.json('sharedState.rooms[0].messages[0].reactions["👍"]'), ["friend", "another"]);
  assert.deepEqual(app.json('sharedState.rooms[0].messages[0].reactions["わかる"]'), ["another"]);
  assert.equal(app.run("backend.pendingReactions.size"), 0);
  assert.ok(app.run('backend.reactionErrors.has("msg_test")'));
});

test("concurrent labels write only their own field; another tap removes membership", async () => {
  const app = harness();
  const first = app.run('toggleReaction("room_test", "msg_test", "👍")');
  const second = app.run('toggleReaction("room_test", "msg_test", "😂")');
  assert.deepEqual(app.json("writes.map(write => write.args[1].segments)"), [["reactions", "👍"], ["reactions", "😂"]]);
  app.run("writes[0].resolve(); writes[1].resolve();");
  await Promise.all([first, second]);
  const removing = app.run('toggleReaction("room_test", "msg_test", "👍")');
  assert.equal(app.run("writes[2].args[2].operation"), "remove");
  assert.deepEqual(app.json('sharedState.rooms[0].messages[0].reactions["👍"]'), ["friend"]);
  assert.deepEqual(app.json('sharedState.rooms[0].messages[0].reactions["😂"]'), ["me"]);
  app.run("writes[2].resolve()");
  await removing;
});
