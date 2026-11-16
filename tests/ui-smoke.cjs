const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");

async function main() {
  const server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const file = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (!file.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end(); return; }
    try {
      if (pathname === "/firebase-config.js") {
        response.setHeader("Content-Type", "application/javascript");
        response.end("window.POTONCHU_FIREBASE_CONFIG = {};");
        return;
      }
      response.setHeader("Content-Type", ({ ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" })[path.extname(file)] || "application/octet-stream");
      response.end(await fs.readFile(file));
    } catch (error) { response.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = process.env.POTONCHU_UI_TEST_URL || `http://127.0.0.1:${server.address().port}/?demo=1`;
  let browser;
  try {
    try { browser = await chromium.launch({ headless: true }); }
    catch (error) { browser = await chromium.launch({ headless: true, channel: "msedge" }); }
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    context.on("page", (page) => page.on("pageerror", (error) => errors.push(error.message)));
    const a = await context.newPage();
    await a.goto(url);
    if (process.env.POTONCHU_UI_TEST_URL) assert.equal(await a.evaluate(() => window.POTONCHU_PREVIEW), true, "Only test isolated preview URLs");
    assert.equal(await a.evaluate(() => hasFirebaseConfig()), false);
    await a.locator('[data-action="google-login"]').click();
    await a.locator("#setupName").fill("ためす人A");
    await a.locator('[data-form="setup"] button[type="submit"]').click();
    await a.locator('.top-actions [data-action="go-create-room"]').click();
    await a.locator('[name="roomName"]').fill("動作確認ルーム");
    await a.locator(".room-type").filter({ hasText: "グループ" }).click();
    assert.equal(await a.locator('[name="poemWindow"]').isChecked(), false, "new rooms have no time restriction by default");
    await a.locator(".round-experiment summary").click();
    await a.locator('[name="poemWindow"]').check();
    await a.locator('[data-form="room"] button[type="submit"]').click();
    const invite = await a.locator(".invite-link").innerText();
    await a.locator('[data-action="open-room"]').click();

    const b = await context.newPage();
    await b.goto(invite);
    await b.locator('[data-action="google-login"]').click();
    await b.locator("#setupName").fill("ためす人B");
    await b.locator('[data-form="setup"] button[type="submit"]').click();
    await b.locator(".chat-header").waitFor();
    await a.locator('.composer-dock [data-action="go-topic"]').click();
    await a.locator("#topicInput").fill("あ".repeat(501));
    assert.equal(await a.locator("#topicSubmit").isDisabled(), true);
    const privateInput = "誘ってくれるのはうれしい。でも今日は疲れたから、ひとりで休みたい。嫌いになったわけではない。";
    await a.locator("#topicInput").fill(privateInput);
    assert.equal(await a.locator("#topicSubmit").isDisabled(), false);
    await a.locator("#topicSubmit").click();
    await a.locator(".choice-grid").waitFor();
    assert.equal(await a.locator(".choice-button").count(), 4);
    assert.equal(await a.locator('[data-action="send-poem"]').count(), 0);
    assert.equal(await a.evaluate(() => PotonchuFeelings.validDraft(ui.composer.draft)), true);
    assert.equal(await a.locator(".poem-paper .poem-line").count(), 5);
    assert.equal((await a.locator("#app").innerText()).includes(privateInput), false);
    const first = await a.locator(".poem-paper").innerText();
    await a.locator('[data-action="reroll"]').click();
    await a.locator(".choice-grid").waitFor();
    assert.notEqual(await a.locator(".poem-paper").innerText(), first);
    await fs.mkdir(path.join(root, ".qa-output"), { recursive: true });
    await a.screenshot({ path: path.join(root, ".qa-output/gacha-desktop.png"), fullPage: true });
    await a.setViewportSize({ width: 390, height: 844 });
    await a.screenshot({ path: path.join(root, ".qa-output/choices-mobile.png"), fullPage: true });
    await a.setViewportSize({ width: 320, height: 780 });
    assert.equal(await a.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await a.setViewportSize({ width: 390, height: 844 });
    await a.locator(".choice-button").first().click();
    await a.locator(".falling-word").waitFor();
    assert.equal(await a.locator('[data-action="send-poem"]').count(), 0);
    await a.locator('[data-action="send-poem"]').waitFor();
    const originalMiddle = await a.locator(".poem-paper .poem-line").nth(2).innerText();
    await a.locator('[data-action="choose-again"]').click();
    await a.locator(".choice-button").nth(1).click();
    await a.locator('[data-action="send-poem"]').waitFor();
    assert.notEqual(await a.locator(".poem-paper .poem-line").nth(2).innerText(), originalMiddle);
    await a.screenshot({ path: path.join(root, ".qa-output/gacha-mobile.png"), fullPage: true });
    assert.equal(await a.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await a.setViewportSize({ width: 320, height: 780 });
    assert.equal(await a.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await a.setViewportSize({ width: 390, height: 844 });
    await a.locator('[data-action="go-topic"]').click();
    assert.equal(await a.locator("#topicInput").inputValue(), privateInput, "editing preserves private draft");
    await a.screenshot({ path: path.join(root, ".qa-output/feeling-input-mobile.png"), fullPage: true });
    await a.locator("#topicSubmit").click();
    await a.locator(".choice-grid").waitFor();
    await a.locator(".choice-button").nth(2).click();
    await a.locator('[data-action="send-poem"]').waitFor();
    const selectedWord = await a.locator(".poem-paper .poem-line").nth(2).innerText();
    await a.locator('[data-action="send-poem"]').click();
    await a.locator(".message-row.is-mine").waitFor();
    await b.locator(".message-row:not(.is-mine)").waitFor();
    assert.equal(await b.locator(".message-row .poem-line").nth(2).innerText(), selectedWord);
    assert.equal(await b.evaluate(() => currentRoom().messages[0].selectedWord), selectedWord);
    assert.deepEqual(await b.evaluate(() => currentRoom().messages[0].poemReadings.map(PotonchuFeelings.countMora)), [5, 7, 5, 7, 7]);
    await b.setViewportSize({ width: 390, height: 844 });
    assert.equal(await b.locator(".reaction-toggle").count(), 0);
    assert.equal(await b.locator(".conversation-start").count(), 1);
    assert.equal(await a.locator('.composer-dock [data-poem-entry]').isDisabled(), true, "one poem per round");
    assert.equal(await b.locator('.composer-dock [data-poem-entry]').isDisabled(), false);
    assert.equal(await b.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await b.locator(".poem-open-talk").click();
    await b.locator("#talkReplyInput").fill("この一首、いまの自分っぽい");
    await b.locator("#talkReplySubmit").click();
    await b.locator(".talk-text").filter({ hasText: "この一首、いまの自分っぽい" }).waitFor();
    await a.locator(".poem-open-talk").click();
    await a.locator(".talk-text").filter({ hasText: "この一首、いまの自分っぽい" }).waitFor();
    await a.locator("#talkReplyInput").fill("わかる、そこを選んだ");
    await a.locator("#talkReplySubmit").click();
    await b.locator(".talk-text").filter({ hasText: "わかる、そこを選んだ" }).waitFor();
    await b.locator("#talkReplyInput").fill("書きかけの返事");
    await a.locator("#talkReplyInput").fill("入力中でも消えないかな");
    await a.locator("#talkReplySubmit").click();
    await b.locator(".talk-text").filter({ hasText: "入力中でも消えないかな" }).waitFor();
    assert.equal(await b.locator("#talkReplyInput").inputValue(), "書きかけの返事");
    await b.screenshot({ path: path.join(root, ".qa-output/talk-mobile.png"), fullPage: true });
    assert.equal(await b.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await b.locator('[data-action="close-talk"]').click();
    assert.equal(await b.locator("#talkReplyInput").count(), 0);
    assert.equal(await b.locator(".message-row").count(), 1, "ordinary replies must not appear in the main poem room");
    await b.locator(".poem-open-talk").click();
    assert.equal(await b.locator(".talk-text").count(), 3);
    await b.locator('[data-action="close-talk"]').click();
    await b.evaluate(() => {
      currentRoom().poemWindow.startedAt = Date.now() - PotonchuRounds.OPEN;
      roomStore.save(sharedState);
      render();
    });
    assert.equal(await b.locator('.composer-dock [data-poem-entry]').isDisabled(), true);
    assert.match(await b.locator(".round-notice").innerText(), /受付はおしまい/);
    await b.locator(".conversation-start").click();
    await b.locator("#talkReplyInput").fill("受付が終わっても、話せるね");
    await b.locator("#talkReplySubmit").click();
    await b.locator(".talk-text").filter({ hasText: "受付が終わっても、話せるね" }).waitFor();
    await b.locator('[data-action="close-talk"]').click();
    await b.evaluate(() => {
      currentRoom().poemWindow.startedAt = Date.now() - PotonchuRounds.CYCLE;
      roomStore.save(sharedState);
      render();
    });
    assert.equal(await b.locator('.composer-dock [data-poem-entry]').isDisabled(), false);
    assert.match(await b.locator(".round-notice").innerText(), /今日のぽとんが始まりました/);
    assert.equal(await b.evaluate((text) => JSON.stringify(sharedState).includes(text), privateInput), false);
    await b.locator('[data-action="go-home"]').click();
    await b.locator('.top-actions [data-action="go-create-room"]').click();
    await b.locator('[name="roomName"]').fill("時間制限なしの部屋");
    await b.locator('[data-form="room"] button[type="submit"]').click();
    await b.locator('[data-action="open-room"]').click();
    assert.equal(await b.locator(".round-notice").count(), 0);
    assert.equal(await b.locator('.composer-dock [data-poem-entry]').isDisabled(), false);
    assert.equal(await b.evaluate(() => currentRoom().poemWindow), null);
    assert.deepEqual(errors, []);
    console.log("PASS: private free input, four 5-mora choices, drop/rest/reselection, metered poem send, two-way talks, optional rounds, and mobile/desktop layout.");
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
