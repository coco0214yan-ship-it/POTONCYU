const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

async function harness() {
  const storage = () => {
    const values = new Map();
    return { getItem: (k) => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: (k) => values.delete(k) };
  };
  const node = { addEventListener() {}, classList: { add() {}, remove() {} } };
  const context = vm.createContext({
    console, URLSearchParams, Date, crypto: require("node:crypto"),
    document: { querySelector: () => node }, navigator: { onLine: true },
    window: { POTONCHU_PREVIEW: true, location: { search: "" }, setTimeout(fn) { fn(); }, clearTimeout() {} },
    sessionStorage: storage(), localStorage: storage(),
    PotonchuPoems: require("../poem-engine.js"), PotonchuChatRules: require("../preview/chat-rules.js"),
    PotonchuFeedback: { enabled: false, play() {} },
  });
  const source = fs.readFileSync(path.join(__dirname, "../preview/script.js"), "utf8");
  vm.runInContext(source.slice(0, source.indexOf('app.addEventListener("compositionstart"')), context);
  const run = (code) => vm.runInContext(code, context);
  run(`saveSessionUser({id:"me",name:"お試し"}); refreshAppState(); render = () => refreshAppState();`);
  await run(`(async () => { const room = await createRoom("試す相手", "pair"); await setActiveRoom(room.id); })()`);
  run(`globalThis.submit = (text) => handleSubmit({preventDefault(){}, target:{closest:()=>({dataset:{form:"chat-composer"},elements:{namedItem:()=>({value:text})}})}});`);
  return { run, json: (code) => JSON.parse(run(`JSON.stringify(${code})`)) };
}

test("feeling submission starts gacha without a message; confirmation sends only a poem", async () => {
  const app = await harness();
  await app.run('submit("助けてくれた友達にありがとうを伝えたい")');
  await new Promise(setImmediate);
  assert.equal(app.run("ui.view"), "gacha");
  assert.equal(app.run("currentRoom().messages.length"), 0);
  assert.equal(app.run("ui.composer.draft.choices.length"), 4);
  const first = app.run("ui.composer.draft.templateId");
  await app.run("spinGacha(ui.composer.topic)");
  assert.notEqual(app.run("ui.composer.draft.templateId"), first);
  await app.run("ui.composer.selectedChoice = ui.composer.draft.choices[0]; ui.composer.step = 'confirm'; sendPoem()");
  assert.equal(app.run("currentRoom().messages.length"), 1);
  assert.equal(app.run("currentRoom().messages[0].kind"), "poem");
  assert.equal(app.run("currentRoom().messages[0].topic"), "一首");
  assert.equal(app.run("ui.composeMode"), "text");
  assert.equal(app.run("currentRoom().messages[0].lines.length"), 5);
});

test("actual text submission rejects an expired window and a new poem unlocks it", async () => {
  const app = await harness();
  app.run('ui.composeMode = "text"');
  await app.run('submit("最初の一首より前")');
  assert.equal(app.run("currentRoom().messages.length"), 0);
  await app.run('spinGacha("ありがとう")');
  await app.run("ui.composer.selectedChoice = ui.composer.draft.choices[0]; ui.composer.step = 'confirm'; sendPoem()");
  await app.run('submit("続きの会話")');
  assert.equal(app.run("currentRoom().messages.length"), 2);
  assert.equal(app.run("currentRoom().messages[1].text"), "続きの会話");
  app.run("ui.clockOffset = 12 * PotonchuChatRules.HOUR");
  await app.run('submit("期限後に送ろうとした文章")');
  assert.equal(app.run("currentRoom().messages.length"), 2);
  assert.equal(app.run("ui.composeMode"), "poem");
  await app.run('spinGacha("また会いたい")');
  await app.run("ui.composer.selectedChoice = ui.composer.draft.choices[0]; ui.composer.step = 'confirm'; sendPoem()");
  await app.run('submit("また話せるね")');
  assert.equal(app.run("currentRoom().messages.length"), 4);
});

test("a draft cannot be sent to a different room after its recipient changes", async () => {
  const app = await harness();
  await app.run('spinGacha("ありがとう")');
  await app.run('(async () => { const room = await createRoom("別のグループ", "group"); await setActiveRoom(room.id); })()');
  await app.run("ui.composer.selectedChoice = ui.composer.draft.choices[0]; ui.composer.step = 'confirm'; sendPoem()");
  assert.deepEqual(app.json("appState.rooms.map(r => r.messages.length)"), [0, 0]);
});

test("Enter and mobile send submit; Shift+Enter and Japanese conversion never submit", async () => {
  const app = await harness();
  app.run(`globalThis.sends = 0; globalThis.prevented = 0;
    globalThis.key = (extra = {}) => handleChatEnter({type:"keydown", key:"Enter", target:{id:"chatInput", form:{requestSubmit(){ sends++; }}}, preventDefault(){ prevented++; }, ...extra});`);
  app.run("key()");
  assert.equal(app.run("sends"), 1);
  app.run('key({type:"beforeinput", inputType:"insertLineBreak"})');
  assert.equal(app.run("sends"), 2);
  app.run('key({shiftKey:true}); key({type:"beforeinput",inputType:"insertLineBreak"})');
  assert.equal(app.run("sends"), 2);
  app.run('ui.chatNewlineRequested=false; key({isComposing:true}); key({keyCode:229}); ui.chatComposing=true; key(); ui.chatComposing=false; ui.chatCompositionEndedAt=Date.now(); key()');
  assert.equal(app.run("sends"), 2);
  app.run('ui.chatCompositionEndedAt=0; key({repeat:true}); key({key:"a"})');
  assert.equal(app.run("sends"), 2);
  app.run('key({type:"beforeinput",inputType:"insertParagraph"})');
  assert.equal(app.run("sends"), 3);
});
