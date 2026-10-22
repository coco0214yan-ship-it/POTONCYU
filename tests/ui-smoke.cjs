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
  const url = `http://127.0.0.1:${server.address().port}/`;
  let browser;
  try {
    try { browser = await chromium.launch({ headless: true }); }
    catch (error) { browser = await chromium.launch({ headless: true, channel: "msedge" }); }
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    context.on("page", (page) => page.on("pageerror", (error) => errors.push(error.message)));
    const a = await context.newPage();
    await a.goto(url);
    await a.locator('[data-action="google-login"]').click();
    await a.locator("#setupName").fill("ためす人A");
    await a.locator('[data-form="setup"] button[type="submit"]').click();
    await a.locator('.top-actions [data-action="go-create-room"]').click();
    await a.locator('[name="roomName"]').fill("動作確認ルーム");
    await a.locator(".room-type").filter({ hasText: "グループ" }).click();
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
    await a.locator("#topicInput").fill("あいうえおかきくけこさ");
    assert.equal(await a.locator("#topicSubmit").isDisabled(), true);
    await a.locator("#topicInput").fill("テストやばい");
    await a.locator("#topicSubmit").click();
    await a.locator(".choice-grid").waitFor();
    assert.equal(await a.locator(".choice-button").count(), 4);
    const first = await a.locator(".poem-paper").innerText();
    await a.locator('[data-action="reroll"]').click();
    await a.locator(".choice-grid").waitFor();
    assert.notEqual(await a.locator(".poem-paper").innerText(), first);
    await fs.mkdir(path.join(root, ".qa-output"), { recursive: true });
    await a.screenshot({ path: path.join(root, ".qa-output/gacha-desktop.png"), fullPage: true });
    await a.setViewportSize({ width: 390, height: 844 });
    await a.screenshot({ path: path.join(root, ".qa-output/gacha-mobile.png"), fullPage: true });
    assert.equal(await a.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await a.locator(".choice-button").first().click();
    await a.locator('[data-action="send-poem"]').waitFor();
    await a.locator('[data-action="send-poem"]').click();
    await a.locator(".message-row.is-mine").waitFor();
    await b.locator(".message-row:not(.is-mine)").waitFor();
    await b.setViewportSize({ width: 390, height: 844 });
    await b.locator(".reaction-toggle").click();
    await b.screenshot({ path: path.join(root, ".qa-output/reactions-mobile.png"), fullPage: true });
    await b.locator('.reaction-picker [data-reaction="😂"]').click();
    await b.locator('.reaction-row [data-reaction="😂"][aria-pressed="true"]').waitFor();
    await a.locator('.reaction-row [data-reaction="😂"][aria-pressed="false"]').waitFor();
    await b.locator('.reaction-row [data-reaction="😂"]').click();
    await a.locator('.reaction-row [data-reaction="😂"]').waitFor({ state: "detached" });
    await b.locator('[data-setting="reaction-sound"]').uncheck();
    assert.equal(await b.evaluate(() => PotonchuFeedback.enabled), false);
    await b.locator(".reaction-toggle").click();
    await b.keyboard.press("Escape");
    assert.equal(await b.locator(".reaction-picker").count(), 0);
    assert.equal(await b.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    assert.deepEqual(errors, []);
    console.log("PASS: free topic, reroll, word selection, send/receive across two local participants, reaction add/remove/sync, sound switch, Escape, desktop/mobile layout.");
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
