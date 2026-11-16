const { test } = require("node:test");
const assert = require("node:assert/strict");
const { HOUR, mora, conversationWindow, reminderDue, createGenerator, common, scenes, BLANK } = require("../preview/chat-rules.js");

test("every sample and every middle choice has the required number of mora", () => {
  for (const [category, scene] of Object.entries({ common, ...scenes })) {
    for (const [part, words] of Object.entries(scene)) {
      if (!Array.isArray(words)) continue;
      for (const word of words) assert.equal(mora(word.reading), ["first", "choices"].includes(part) ? 5 : 7, `${category}.${part}: ${word.text}`);
    }
  }
});
test("the conversation window belongs to the sender and room, with an exact 12-hour boundary", () => {
  const t = 1000000;
  const poem = { author: { id: "me" }, createdAt: t, kind: "poem" };
  assert.equal(conversationWindow([], "me", t).canTalk, false);
  assert.equal(conversationWindow([poem], "other", t).canTalk, false);
  assert.equal(conversationWindow([poem], "me", t + 12 * HOUR - 1).canTalk, true);
  assert.equal(conversationWindow([poem], "me", t + 12 * HOUR).canTalk, false);
  assert.equal(conversationWindow([{ ...poem, status: "failed" }], "me", t).canTalk, false);
  assert.equal(conversationWindow([{ ...poem, createdAt: t + 1 }], "me", t).canTalk, false);
  const text = { ...poem, kind: "text", createdAt: t + 11 * HOUR };
  assert.equal(conversationWindow([poem, text], "me", t + 12 * HOUR).canTalk, false);
  const newPoem = { ...poem, createdAt: t + 12 * HOUR };
  assert.equal(conversationWindow([poem, newPoem], "me", t + 12 * HOUR).canTalk, true);
});
test("24-hour reminders do not repeat before the next full day", () => {
  const start = 1000;
  assert.equal(reminderDue(start, 0, start + 24 * HOUR - 1), false);
  assert.equal(reminderDue(start, 0, start + 24 * HOUR), true);
  assert.equal(reminderDue(start, start + 24 * HOUR, start + 24 * HOUR + 1), false);
  assert.equal(reminderDue(start, start + 24 * HOUR, start + 48 * HOUR), true);
});
test("long feelings choose relevant samples, never insert raw input, and rerolls vary", () => {
  const generate = createGenerator(() => 0);
  const feeling = "困っているときに助けてくれた友達に、ありがとうの気持ちを伝えたい";
  const first = generate(feeling);
  const second = generate(feeling);
  assert.equal(first.category, "thanks");
  assert.equal(first.lines.length, 5);
  assert.equal(first.lines[2], BLANK);
  assert.equal(first.choices.length, 4);
  assert.equal(new Set(first.choices).size, 4);
  assert.equal(first.lines.includes(feeling), false);
  assert.notEqual(first.templateId, second.templateId);
  assert.equal(generate("さっきは言いすぎたので謝りたい").category, "sorry");
  assert.equal(generate("カフェへ誘いたい").category, "invite");
  assert.equal(generate("宇宙のこと").category, "open");
  assert.throws(() => generate(""));
  assert.throws(() => generate("あ".repeat(201)));
});
