const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createProvider, validDraft, classify, BLANK } = require("../poem-engine.js");

test("free topics have at least 22 distinct poems before any repeat", () => {
  const provider = createProvider();
  for (const topic of ["テストやばい", "雨の帰り道", "推しのライブ", "就活しんどい", "旅行行こ", "誕生日", "お金ない", "宇宙人きた", "夜ごはん", "ありがとう", "集合時間", "なんか暇"]) {
    assert.ok(provider.count(topic) >= 22, topic);
    const seen = new Set();
    let previous = "";
    for (let i = 0; i < provider.count(topic); i += 1) {
      const draft = provider.generate(topic, previous);
      assert.ok(validDraft(draft, topic), `${topic}: invalid draft`);
      assert.equal(draft.lines[0], topic);
      const signature = draft.lines.join("\n");
      assert.ok(!seen.has(signature), `${topic}: repeated too early`);
      seen.add(signature);
      previous = draft.templateId;
    }
    assert.notEqual(provider.generate(topic, previous).templateId, previous, `${topic}: repeated at cycle boundary`);
  }
});

test("free topics are matched by meaning words, not a single shared character", () => {
  assert.equal(classify("雨の帰り道"), "weather");
  assert.equal(classify("テストやばい"), "study");
  assert.equal(classify("推しのライブ"), "hobby");
  assert.equal(classify("就活しんどい"), "work");
  assert.equal(classify("ありがとう"), "thanks");
  assert.equal(classify("宇宙人きた"), "open");
  assert.equal(classify("映画見たい"), "hobby");
});

test("invalid AI output is rejected and repeated AI poems are skipped", () => {
  const provider = createProvider();
  const draft = { templateId: "ai-1", lines: ["帰り道", "改札の前で", BLANK, "さよならだけが", "少し遅れる"], choices: ["待っている", "言えなかった", "まだいたい", "コンビニ"] };
  assert.equal(provider.accept("帰り道", { ...draft, lines: [...draft.lines, "解説"] }), null);
  assert.equal(provider.accept("帰り道", { ...draft, choices: ["本音", "本音", "本音", "本音"] }), null);
  assert.equal(provider.accept("違うお題", draft), null);
  assert.ok(provider.accept("帰り道", draft));
  assert.equal(provider.accept("帰り道", draft), null);
  assert.equal(provider.recent("帰り道").length, 1);
});

test("topic limits apply to freely entered text and normalize spaces", () => {
  const provider = createProvider();
  assert.throws(() => provider.generate(""));
  assert.throws(() => provider.generate("あいうえおかきくけこさ"));
  assert.equal(provider.generate("　夜ごはん　").topic, "夜ごはん");
  assert.ok(validDraft(provider.generate("😀😀😀😀😀😀😀😀😀😀"), "😀😀😀😀😀😀😀😀😀😀"));
});
