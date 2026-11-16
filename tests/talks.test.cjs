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
    sharedState.rooms = [normalizeRoom({id: "room_test", members: [{id: "me"}], messages: [
      {id: "poem_a", author: {id: "friend"}, lines: ["一", "二", "三", "四", "五"]},
      {id: "poem_b", author: {id: "friend"}, lines: ["六", "七", "八", "九", "十"]}
    ]})];
    refreshAppState(); ui.view = "talk"; ui.talkMessageId = "poem_a";
    render = () => refreshAppState();
    globalThis.writes = []; globalThis.savedReply = null;
    backend.firebase = { db: {}, firestoreModule: {
      doc: (...args) => args.slice(1).join("/"), serverTimestamp: () => null,
      getDoc: async () => ({exists: () => Boolean(savedReply), data: () => savedReply}),
      setDoc: (...args) => new Promise((resolve, reject) => writes.push({args, resolve, reject})),
    }};
  `, context);
  return { run: (code) => vm.runInContext(code, context), json: (code) => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, context)) };
}

test("a text reply belongs only to its original poem, even if the user switches talks", async () => {
  const app = harness();
  app.run('ui.talkDrafts.set(talkKey("room_test", "poem_a"), "この言葉、気になった")');
  const saving = app.run("sendTalkReply()");
  assert.match(app.run("writes[0].args[0]"), /^rooms\/room_test\/messages\/poem_a\/replies\/reply_/);
  assert.equal(app.run("writes[0].args[1].kind"), "text");
  assert.equal(app.run("sharedState.rooms[0].messages.length"), 2);
  assert.equal(app.run('ui.talkDrafts.has(talkKey("room_test", "poem_a"))'), false);
  app.run('ui.talkMessageId = "poem_b"; writes[0].resolve()');
  await saving;
  assert.equal(app.run('sharedState.talks[talkKey("room_test", "poem_a")].length'), 1);
  assert.equal(app.run('sharedState.talks[talkKey("room_test", "poem_a")][0].status'), "");
  assert.equal(app.run('sharedState.talks[talkKey("room_test", "poem_b")]'), undefined);
});

test("a failed reply is preserved; retry recognizes an already saved reply without duplicating it", async () => {
  const app = harness();
  app.run('ui.talkDrafts.set(talkKey("room_test", "poem_a"), "返事の続き")');
  const saving = app.run("sendTalkReply()");
  app.run('writes[0].reject({code: "unavailable"})');
  await saving;
  assert.equal(app.run('sharedState.talks[talkKey("room_test", "poem_a")][0].status'), "failed");
  app.run('savedReply = {...writes[0].args[1], createdAtMillis: Date.now()}');
  const id = app.run('sharedState.talks[talkKey("room_test", "poem_a")][0].id');
  await app.run(`sendTalkReply(${JSON.stringify(id)})`);
  assert.equal(app.run("writes.length"), 1);
  assert.equal(app.run('sharedState.talks[talkKey("room_test", "poem_a")].length'), 1);
  assert.equal(app.run('sharedState.talks[talkKey("room_test", "poem_a")][0].status'), "");
});

test("empty or overlong text never writes to the main room or a talk", async () => {
  const app = harness();
  app.run('ui.talkDrafts.set(talkKey("room_test", "poem_a"), "   ")');
  await app.run("sendTalkReply()");
  app.run('ui.talkDrafts.set(talkKey("room_test", "poem_a"), "あ".repeat(501))');
  await app.run("sendTalkReply()");
  assert.equal(app.run("writes.length"), 0);
  assert.equal(app.run("sharedState.rooms[0].messages.length"), 2);
});
