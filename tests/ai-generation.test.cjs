const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

function harness() {
  let calls = 0;
  let requestBody;
  const records = new Map([["rooms/room_test", { memberIds: ["member"] }]]);
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
  const document = (id) => ({ id, get: async () => ({ exists: records.has(id), data: () => records.get(id) }) });
  const db = {
    doc: document,
    runTransaction: async (work) => {
      const changes = [];
      await work({ get: (ref) => ref.get(), set: (ref, value) => changes.push([ref.id, value]) });
      changes.forEach(([id, value]) => records.set(id, value));
    },
  };
  const context = {
    exports: {}, AbortSignal,
    require: (name) => {
      if (name === "node:crypto") return require(name);
      if (name === "firebase-functions/v2/https") return { onCall: (options, handler) => handler, HttpsError };
      if (name === "firebase-functions/params") return { defineSecret: () => ({ value: () => "test-key" }), defineString: (name, options) => ({ value: () => options.default }) };
      if (name === "firebase-admin/firestore") return { getFirestore: () => db };
      throw new Error(`Unexpected dependency ${name}`);
    },
    fetch: async (url, options) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      calls += 1;
      requestBody = JSON.parse(options.body);
      const topic = JSON.parse(requestBody.input).topic;
      const poems = ["少し話そう", "ちょっと待ってた", "言いそびれてた"].map((second) => ({
        lines: [topic, second, "__POTON_BLANK__", "帰る途中で", "思い出してる"],
        choices: ["話したい", "待っている", "コンビニ", "少しだけ"],
      }));
      return { ok: true, json: async () => ({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify({ poems }) }] }] }) };
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../functions/generate-poems.js"), "utf8"), context);
  return { invoke: context.exports.generatePoems, calls: () => calls, body: () => requestBody };
}

test("AI generation rejects visitors, nonmembers, and invalid topics before calling the provider", async () => {
  const app = harness();
  await assert.rejects(app.invoke({ data: { topic: "帰り道", roomId: "room_test" } }), { code: "unauthenticated" });
  await assert.rejects(app.invoke({ auth: { uid: "outsider" }, data: { topic: "帰り道", roomId: "room_test" } }), { code: "permission-denied" });
  await assert.rejects(app.invoke({ auth: { uid: "member" }, data: { topic: "あいうえおかきくけこさ", roomId: "room_test" } }), { code: "invalid-argument" });
  assert.equal(app.calls(), 0);
});

test("AI returns validated poem/choice sets, with storage disabled and a per-user limit", async () => {
  const app = harness();
  const request = { auth: { uid: "member" }, data: { topic: "帰り道", roomId: "room_test" } };
  const response = await app.invoke(request);
  assert.equal(response.poems.length, 3);
  assert.equal(response.poems[0].lines[0], "帰り道");
  assert.equal(response.poems[0].choices.length, 4);
  assert.equal(app.body().store, false);
  assert.equal(app.body().text.format.strict, true);
  for (let i = 0; i < 4; i += 1) await app.invoke(request);
  await assert.rejects(app.invoke(request), { code: "resource-exhausted" });
  assert.equal(app.calls(), 5);
});
