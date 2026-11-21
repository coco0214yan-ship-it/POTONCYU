const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ai = require("../ai-logic.js");

const sample = () => ({
  lines: ["ありがとう", "君の言葉に", ai.BLANK, "心がほどけ", "そっと届ける"],
  readings: ["ありがとう", "きみのことばに", "", "こころがほどけ", "そっととどける"],
  choices: ["あたたかい", "うれしいな", "忘れない", "君がいる"],
  choiceReadings: ["あたたかい", "うれしいな", "わすれない", "きみがいる"],
});
const other = () => { const poem = sample(); poem.lines[3] = "お礼をこめて"; poem.readings[3] = "おれいをこめて"; return poem; };
const third = () => { const poem = sample(); poem.lines[1] = "助けられたよ"; poem.readings[1] = "たすけられたよ"; return poem; };
const reply = (value) => ({ response: { text: () => JSON.stringify(value) } });
const provider = (generateContent, config = {}) => ai.createProvider({ enabled: true, ...config }, { makeModel: () => ({ generateContent }) });

test("validates all five lines and every middle choice", () => {
  assert.equal(ai.validateDraft(sample()).source, "firebase-ai-logic");
  const wrong = sample(); wrong.choiceReadings[3] = "きみ"; assert.throws(() => ai.validateDraft(wrong));
  const bad = sample(); bad.lines[2] = "入力"; assert.throws(() => ai.validateDraft(bad));
  const duplicate = sample(); duplicate.choices[3] = duplicate.choices[0]; assert.throws(() => ai.validateDraft(duplicate));
  const punctuation = sample(); punctuation.readings[0] = "あり。がとう"; assert.throws(() => ai.validateDraft(punctuation));
  assert.equal(ai.mora("きょうはちょっと"), 6);
});

test("disabled mode never initializes Firebase or contacts a model", async () => {
  let calls = 0; const p = ai.createProvider({ enabled: false }, { makeModel: () => { calls++; } });
  await assert.rejects(p.generate("ありがとう"), { code: "ai/disabled" }); assert.equal(calls, 0);
});

test("rejects invalid input before any model call", async () => {
  let calls = 0; const p = ai.createProvider({ enabled: true }, { makeModel: () => { calls++; } });
  await assert.rejects(p.generate("")); await assert.rejects(p.generate("あ".repeat(201))); assert.equal(calls, 0);
});

test("sends only the entered text, repairs once, and labels real AI output", async () => {
  const requests = []; const bad = sample(); bad.readings[0] = "あ";
  const p = provider(async (prompt) => { requests.push(prompt); return reply(requests.length === 1 ? { poems: [bad] } : { poems: [sample()] }); });
  const draft = await p.generate("助けてくれた友達にありがとうを伝えたい");
  assert.equal(requests.length, 2); assert.equal(draft.source, "firebase-ai-logic"); assert.equal(draft.choices.length, 4);
  assert.match(requests[0], /入力データ/); assert.match(requests[0], /助けてくれた友達にありがとうを伝えたい/);
  assert.doesNotMatch(requests[0], /senderId|roomId|sessionUser/);
  assert.match(requests[1], /作り直して/);
});

test("one answer with several candidates keeps the valid ones for the next pulls without another request", async () => {
  let calls = 0; const bad = sample(); bad.readings[1] = "きみ";
  const p = provider(async () => { calls++; return reply({ poems: calls === 1 ? [bad, sample(), other()] : [third()] }); });
  const first = await p.generate("ありがとう"); const second = await p.generate("ありがとう");
  assert.equal(calls, 1); assert.notEqual(first.templateId, second.templateId);
  await p.generate("別の内容"); assert.equal(calls, 2);
});

test("a single poem object is still accepted", async () => {
  const draft = await provider(async () => reply(sample())).generate("ありがとう");
  assert.deepEqual(draft.lines, sample().lines);
});

test("invalid output stops after two requests instead of returning a sample as AI", async () => {
  let calls = 0; const p = provider(async () => { calls++; return calls === 1 ? reply({ poems: [] }) : { response: { text: () => "not json" } }; });
  await assert.rejects(p.generate("ありがとう"), { code: "ai/invalid-poem" }); assert.equal(calls, 2);
});

test("backend errors are surfaced and are not retried as content repairs", async () => {
  let calls = 0; const p = provider(async () => { calls++; throw Object.assign(new Error("unavailable"), { code: "ai/service-disabled" }); });
  await assert.rejects(p.generate("ありがとう"), { code: "ai/service-disabled" }); assert.equal(calls, 1);
  await assert.rejects(p.generate("ありがとう"), { code: "ai/service-disabled" }); assert.equal(calls, 2);
});

test("a slow answer times out", async () => {
  const p = provider(() => new Promise(() => {}), { timeoutMs: 20 });
  await assert.rejects(p.generate("ありがとう"), { code: "ai/timeout" });
});

test("quick repeated taps are answered one at a time, never in parallel", async () => {
  let running = 0, peak = 0; const answers = [sample(), other()];
  const p = provider(async () => { running++; peak = Math.max(peak, running); await new Promise(setImmediate); running--; return reply({ poems: [answers.shift()] }); });
  const [first, second] = await Promise.all([p.generate("ありがとう"), p.generate("また回す")]);
  assert.equal(peak, 1); assert.notEqual(first.templateId, second.templateId);
});

test("rerolls reject a poem that was already shown and accept a new one", async () => {
  let calls = 0;
  const p = provider(async () => reply({ poems: [++calls < 3 ? sample() : third()] }));
  const first = await p.generate("ありがとう"); const next = await p.generate("ありがとう");
  assert.notEqual(first.templateId, next.templateId); assert.equal(calls, 3);
});

test("the preview keeps the same module", () => {
  assert.equal(fs.readFileSync(require.resolve("../preview/ai-logic.js"), "utf8"), fs.readFileSync(require.resolve("../ai-logic.js"), "utf8"));
});

// The app's own entry point: AI first, the prepared poem when AI cannot answer.
function app(config, generate) {
  const storage = () => { const values = new Map(); return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }; };
  const made = [];
  const context = vm.createContext({
    Date, console: { warn() {} }, URL, URLSearchParams, crypto: require("node:crypto"),
    localStorage: storage(), sessionStorage: storage(),
    window: {
      location: { hostname: "example.com", search: "", href: "https://example.com/POTONCYU/" },
      POTONCHU_FIREBASE_CONFIG: { apiKey: "k", authDomain: "d", projectId: "p", appId: "a" },
      POTONCHU_AI_LOGIC_CONFIG: config,
      PotonchuAILogic: { createProvider: (options) => { made.push(options); return { generate }; } },
    },
    navigator: {}, document: { querySelector: () => ({}) },
    PotonchuPoems: require("../poem-engine"), PotonchuChatRules: require("../chat-rules"),
  });
  context.PotonchuAILogic = context.window.PotonchuAILogic;
  const source = fs.readFileSync(require.resolve("../script.js"), "utf8");
  vm.runInContext(source.slice(0, source.indexOf('app.addEventListener("keydown", handleChatEnter)')), context);
  return { run: (code) => vm.runInContext(code, context), made };
}

test("the app asks Firebase AI Logic with the public config only, and falls back to a prepared poem on failure", async () => {
  const working = app({ enabled: true, model: "m", appCheckSiteKey: "site" }, async (text) => ({ ...sample(), source: "firebase-ai-logic", templateId: text }));
  const draft = await working.run('generatePoem("ありがとうを伝えたい", "", "room")');
  assert.equal(draft.source, "firebase-ai-logic"); assert.equal(draft.templateId, "ありがとうを伝えたい");
  assert.equal(working.made[0].firebaseConfig.projectId, "p"); assert.equal(working.made[0].appCheckDebugToken, "");
  assert.equal(working.run("aiLogicEnabled()"), true);

  const failing = app({ enabled: true }, async () => { throw Object.assign(new Error("blocked"), { code: "AI/fetch-error" }); });
  const fallback = await failing.run('generatePoem("ありがとうを伝えたい", "", "room")');
  assert.equal(fallback.source, "sample"); assert.equal(fallback.lines.length, 5);

  const off = app({ enabled: false }, async () => { throw new Error("must not be called"); });
  assert.equal(off.run("aiLogicEnabled()"), false);
  assert.equal((await off.run('generatePoem("ありがとう", "", "room")')).source, "sample");
});

test("AI titles are validated",()=>{assert.equal(ai.validateDraft({...sample(),title:"おなかすいた"}).title,"おなかすいた");assert.throws(()=>ai.validateDraft({...sample(),title:"あ".repeat(21)}));assert.throws(()=>ai.validateDraft({...sample(),title:"タイトル\n改行"}));});
