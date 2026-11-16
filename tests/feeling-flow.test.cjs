const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const feelings = require("../feeling-poems.js");
const rounds = require("../functions/lib/poem-rounds.js");
const tanka = require("../functions/lib/tanka-contract.js");
const catalog = require("../functions/lib/feeling-catalog-data.js");
const { readingsFor } = require("../functions/lib/japanese-reading.js");

test("mora counts combine small kana but count long vowels, っ and ん separately", () => {
  for (const [reading, expected] of [["きょう", 2], ["きって", 3], ["コーヒー", 4], ["シャンプー", 4], ["ファン", 2], ["ティー", 2], ["ありがとう", 5]]) {
    assert.equal(tanka.countMora(reading), expected, reading);
  }
  for (const reading of ["", "ゃ", "きゃゅ", "漢字", "ーあ"]) assert.equal(Number.isNaN(tanka.countMora(reading)), true);
});

test("all 21 catalog drafts and all 84 completed alternatives have dictionary-verified 5-7-5-7-7 readings", async () => {
  let completions = 0;
  for (const group of catalog) for (const draft of group.poems) {
    assert.equal(tanka.validDraft(draft), true, draft.templateId);
    for (const choice of draft.choices) {
      const complete = tanka.complete(draft, choice);
      assert.equal(tanka.validCompleted(complete.lines, complete.readings), true);
      const actual = await readingsFor(complete.lines);
      assert.deepEqual(actual.map(tanka.countMora), [5, 7, 5, 7, 7], complete.lines.join(" / "));
      completions += 1;
    }
    assert.equal(tanka.complete(draft, "候補にない言葉"), null);
  }
  assert.equal(completions, 84);
});

test("12-hour windows close exactly on time and open a new round after 24 hours", () => {
  const start = 1700000000000;
  const room = { poemWindow: { enabled: true, startedAt: start }, messages: [] };
  assert.equal(rounds.state(room, "me", start - 1).canSend, false);
  assert.equal(rounds.state(room, "me", start).canSend, true);
  assert.equal(rounds.state(room, "me", start + rounds.OPEN - 1).canSend, true);
  assert.equal(rounds.state(room, "me", start + rounds.OPEN).phase, "closed");
  assert.equal(rounds.state(room, "me", start + rounds.CYCLE).index, 1);
  assert.equal(rounds.state(room, "me", start + rounds.CYCLE).canSend, true);
  room.messages.push({ senderId: "me", createdAt: start + 1000 });
  assert.equal(rounds.state(room, "me", start + 2000).phase, "sent");
  assert.equal(rounds.state(room, "friend", start + 2000).canSend, true);
  assert.equal(rounds.state(room, "me", start + rounds.CYCLE).canSend, true);
  room.messages[0].status = "failed";
  assert.equal(rounds.state(room, "me", start + 2000).canSend, true);
  assert.equal(rounds.state({ messages: [] }, "me", start).phase, "unlimited");
});

test("sample mode accepts free input, labels itself honestly, and returns varied four-choice drafts", () => {
  const input = "いつも誘ってくれてうれしい。でも今日は疲れたから断りたい。";
  let previous = "";
  for (let i = 0; i < 10; i += 1) {
    const draft = feelings.sample(input, previous);
    assert.equal(feelings.validDraft(draft), true);
    assert.equal(draft.choices.length, 4);
    assert.equal(draft.source, "sample");
    assert.notEqual(draft.templateId, previous);
    previous = draft.templateId;
    assert.equal(JSON.stringify(draft).includes(input), false);
  }
  assert.throws(() => feelings.sample(" "));
  assert.throws(() => feelings.sample("あ".repeat(501)));
  assert.equal(feelings.valid(["一", "二", "__POTON_BLANK__", "四", "五"]), false);
});

function backend() {
  let now = 1700000000000;
  let providerCalls = 0;
  let requestBody;
  let providerOK = true;
  let invalidMeter = false;
  const records = new Map([
    ["rooms/room_test", { memberIds: ["member"], createdAtMillis: now, poemWindow: { enabled: true, startedAt: now + 999999999 } }],
    ["users/member", { displayName: "ためす人" }],
  ]);
  const doc = (id) => ({ id, get: async () => ({ exists: records.has(id), data: () => records.get(id) }) });
  const db = { doc, runTransaction: async (work) => {
    const writes = [];
    const result = await work({ get: (ref) => ref.get(), set: (ref, value) => writes.push([ref.id, value]) });
    writes.forEach(([id, value]) => records.set(id, value));
    return result;
  } };
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
  class ClockDate extends Date { static now() { return now; } }
  const context = { exports: {}, AbortSignal, Date: ClockDate,
    require: (name) => {
      if (name === "node:crypto") return require(name);
      if (name === "./lib/poem-rounds") return rounds;
      if (name === "./lib/tanka-contract") return tanka;
      if (name === "./lib/japanese-reading") return { readingsFor };
      if (name === "firebase-functions/v2/https") return { onCall: (options, handler) => handler, HttpsError };
      if (name === "firebase-functions/params") return { defineSecret: () => ({ value: () => "mock-key" }), defineString: (name, options) => ({ value: () => options.default }) };
      if (name === "firebase-admin/firestore") return { getFirestore: () => db, FieldValue: { serverTimestamp: () => "server-timestamp" } };
      throw new Error(name);
    },
    fetch: async (url, options) => {
      providerCalls += 1;
      requestBody = JSON.parse(options.body);
      const poems = catalog.find((group) => group.id === "space").poems.map((draft) => ({ lines: draft.lines,
        choices: invalidMeter ? ["休みたいよ", ...draft.choices.slice(1)] : draft.choices,
        choiceReadings: ["ヤスミタイ", "ヤスミタイ", "ヤスミタイ", "ヤスミタイ"] }));
      return { ok: providerOK, json: async () => ({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify({ poems }) }] }] }) };
    },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve("../functions/feeling-chat.js"), "utf8"), context);
  return { ...context.exports, records, advance: (ms) => { now += ms; }, failProvider: () => { providerOK = false; }, wrongMeter: () => { invalidMeter = true; }, calls: () => providerCalls, body: () => requestBody };
}

const fixture = catalog.find((group) => group.id === "open").poems[0];
const lines = tanka.complete(fixture, fixture.choices[0]).lines;
const sendRequest = (clientId = "feeling_a") => ({ auth: { uid: "member" }, data: { roomId: "room_test", clientId, poemLines: lines, selectedWord: lines[2] } });

test("server accepts only members and complete poems; never saves the consultation", async () => {
  const app = backend();
  await assert.rejects(app.sendFeelingPoem({ ...sendRequest(), auth: null }), { code: "unauthenticated" });
  await assert.rejects(app.sendFeelingPoem({ ...sendRequest(), auth: { uid: "outsider" } }), { code: "permission-denied" });
  await assert.rejects(app.sendFeelingPoem({ ...sendRequest(), data: { ...sendRequest().data, poemLines: ["普通の文章"] } }), { code: "invalid-argument" });
  const result = await app.sendFeelingPoem({ ...sendRequest(), data: { ...sendRequest().data, input: "これは保存しない相談文" } });
  assert.equal(result.messageId, "feeling_a");
  const saved = app.records.get("rooms/room_test/messages/feeling_a");
  assert.equal(saved.senderId, "member");
  assert.equal(saved.topic, "今日のぽとん");
  assert.equal(saved.selectedWord, lines[2]);
  assert.deepEqual(saved.poemReadings.map(tanka.countMora), [5, 7, 5, 7, 7]);
  assert.equal(JSON.stringify([...app.records]).includes("これは保存しない相談文"), false);
});

test("server enforces one poem per round, supports safe retry, and uses server time", async () => {
  const app = backend();
  const first = await app.sendFeelingPoem(sendRequest());
  assert.deepEqual(await app.sendFeelingPoem(sendRequest()), first);
  await assert.rejects(app.sendFeelingPoem(sendRequest("feeling_b")), { code: "already-exists" });
  app.advance(rounds.OPEN);
  await assert.rejects(app.sendFeelingPoem(sendRequest("feeling_b")), { code: "failed-precondition" });
  assert.deepEqual(await app.sendFeelingPoem(sendRequest()), first, "retry after deadline must not duplicate a committed write");
  app.advance(rounds.CYCLE - rounds.OPEN);
  await app.sendFeelingPoem(sendRequest("feeling_b"));
  assert.equal(app.records.get("rooms/room_test/messages/feeling_b").roundIndex, 1);
});

test("rooms without a time rule allow another poem, including after twelve hours", async () => {
  const app = backend();
  app.records.get("rooms/room_test").poemWindow = null;
  await app.sendFeelingPoem(sendRequest());
  await app.sendFeelingPoem(sendRequest("feeling_b"));
  app.advance(rounds.OPEN);
  await app.sendFeelingPoem(sendRequest("feeling_c"));
  assert.equal(app.records.get("rooms/room_test/messages/feeling_c").roundIndex, null);
});

test("AI generates metered four-choice drafts from free input and never stores the consultation", async () => {
  const app = backend();
  const request = { auth: { uid: "member" }, data: { roomId: "room_test", input: "疲れたから今日は断りたいけど、嫌いではない" } };
  await assert.rejects(app.generateFeelingPoems({ ...request, auth: { uid: "outsider" } }), { code: "permission-denied" });
  assert.equal(app.calls(), 0);
  const result = await app.generateFeelingPoems(request);
  assert.equal(result.poems.length, 3);
  assert.equal(result.poems.every((poem) => feelings.validDraft(poem)), true);
  assert.equal(app.body().store, false);
  assert.equal(app.body().text.format.strict, true);
  assert.equal(JSON.parse(app.body().input).feeling, request.data.input);
  assert.equal(JSON.stringify([...app.records]).includes(request.data.input), false);
  app.failProvider();
  await assert.rejects(app.generateFeelingPoems(request), { code: "unavailable" });
});

test("AI and send validation reject incorrect mora counts instead of trusting supplied readings", async () => {
  const app = backend();
  app.wrongMeter();
  await assert.rejects(app.generateFeelingPoems({ auth: { uid: "member" }, data: { roomId: "room_test", input: "今日はひとりで休みたい" } }), { code: "unavailable" });
  const request = sendRequest();
  request.data.poemLines = ["きょうはおやすみ", ...lines.slice(1)];
  request.data.poemReadings = ["アアイイウ", "アアイイウウエ", "アアイイウ", "アアイイウウエ", "アアイイウウエ"];
  await assert.rejects(app.sendFeelingPoem(request), { code: "invalid-argument" });
  await assert.rejects(app.sendFeelingPoem({ ...sendRequest(), data: { ...sendRequest().data, selectedWord: "" } }), { code: "invalid-argument" });
  assert.equal(app.records.has("rooms/room_test/messages/feeling_a"), false);
});
