const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

async function main() {
  const url = process.env.POTONCHU_PREVIEW_URL || "http://127.0.0.1:4280/";
  let browser;
  try {
    try { browser = await chromium.launch({ headless: true }); }
    catch (error) { browser = await chromium.launch({ headless: true, channel: "msedge" }); }
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    const blockedRequests = [];
    context.on("page", (page) => page.on("pageerror", (error) => errors.push(error.message)));
    await context.route("**/*", (route) => {
      const hostname = new URL(route.request().url()).hostname;
      if (/^(firestore|identitytoolkit|securetoken|fcm)\.googleapis\.com$|cloudfunctions\.net$|firebasestorage\.googleapis\.com$|^api\.openai\.com$/.test(hostname)
        || route.request().url().includes("www.gstatic.com/firebasejs/")) {
        blockedRequests.push(route.request().url());
        return route.abort();
      }
      return route.continue();
    });
    await context.addInitScript(() => {
      if (location.protocol !== "http:" && location.protocol !== "https:") return;
      localStorage.setItem("potonchu.prototype.v1", "production-sentinel");
      sessionStorage.setItem("potonchu.activeRoomId", "production-room-sentinel");
    });
    const a = await context.newPage();
    await a.goto(url);
    assert.equal(await a.evaluate(() => window.POTONCHU_PREVIEW), true, "Never run this test against the real app");
    assert.equal(await a.evaluate(() => window.POTONCHU_GENERATION_CONFIG.enabled), false);
    await a.getByRole("button", { name: "プレビューをはじめる" }).click();
    await a.locator("#setupName").fill("お試しA");
    await a.locator('[data-form="setup"] button[type="submit"]').click();
    await a.locator('.top-actions [data-action="go-create-room"]').click();
    await a.locator('[name="roomName"]').fill("プレビューの部屋");
    await a.locator('[data-form="room"] button[type="submit"]').click();
    const invite = await a.locator(".invite-link").innerText();
    assert.equal(new URL(invite).pathname, new URL(url).pathname, "Invites stay on the same isolated preview path");
    await a.locator('[data-action="open-room"]').click();
    const b = await context.newPage();
    await b.goto(invite);
    await b.getByRole("button", { name: "プレビューをはじめる" }).click();
    await b.locator("#setupName").fill("お試しB");
    await b.locator('[data-form="setup"] button[type="submit"]').click();
    await b.locator(".chat-header").waitFor();
    assert.equal(await a.locator('[data-action="compose-text"]').isDisabled(), true);
    const feeling = "助けてくれた友達に、ありがとうの気持ちを伝えたい";
    await a.locator("#chatInput").fill(feeling);
    await a.locator("#chatSend").click();
    await a.locator(".gacha-machine").waitFor();
    await a.locator(".choice-grid").waitFor();
    assert.equal(await a.locator(".choice-button").count(), 4);
    assert.notEqual(await a.locator(".poem-paper .poem-line").first().innerText(), feeling);
    const first = await a.locator(".poem-paper").innerText();
    await a.locator('[data-action="reroll"]').click();
    await a.locator(".gacha-machine").waitFor();
    await a.locator(".choice-grid").waitFor();
    assert.notEqual(await a.locator(".poem-paper").innerText(), first);
    const output = path.resolve(__dirname, "../.qa-output");
    await fs.mkdir(output, { recursive: true });
    await a.screenshot({ path: path.join(output, "preview-desktop.png"), fullPage: true });
    await a.locator(".choice-button").first().click();
    await a.locator('[data-action="send-poem"]').click();
    await a.locator(".message-row.is-mine").waitFor();
    await b.locator(".message-row:not(.is-mine)").waitFor();
    assert.equal(await a.locator(".message-list").innerText().then((text) => text.includes(feeling)), false);
    assert.equal(await a.locator('[data-action="compose-text"]').isDisabled(), false);
    assert.equal(await b.locator('[data-action="compose-text"]').isDisabled(), true, "Their poem must not unlock my composer");
    await a.locator("#chatInput").fill("この言葉を伝えたかったよ");
    await a.locator("#chatSend").click();
    await b.locator(".text-bubble").filter({ hasText: "この言葉を伝えたかったよ" }).waitFor();
    await b.setViewportSize({ width: 390, height: 844 });
    await b.locator(".reaction-toggle").click();
    await b.locator('.reaction-picker [data-reaction="😂"]').click();
    await a.locator('.reaction-row [data-reaction="😂"]').waitFor();
    await a.locator(".preview-controls summary").click();
    await a.locator('[data-action="preview-time"][data-hours="12"]').click();
    assert.equal(await a.locator('[data-action="compose-text"]').isDisabled(), true);
    assert.equal(await a.locator(".text-bubble").count(), 1, "Existing text stays visible after the deadline");
    // Opening the clock again is necessary because render rebuilt the details.
    await a.locator(".preview-controls summary").click();
    await a.locator('[data-action="preview-time"][data-hours="24"]').click();
    await a.locator(".reminder-card").waitFor();
    await a.locator('[data-action="dismiss-reminder"]').click();
    assert.equal(await a.locator(".reminder-card").count(), 0);
    await a.locator("#chatInput").fill("また話したいから一首を送りたい");
    await a.locator("#chatSend").click();
    await a.locator(".choice-grid").waitFor();
    await a.locator(".choice-button").first().click();
    await a.locator('[data-action="send-poem"]').click();
    assert.equal(await a.locator('[data-action="compose-text"]').isDisabled(), false);
    await b.screenshot({ path: path.join(output, "preview-mobile.png"), fullPage: true });
    assert.equal(await b.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await b.locator(".poem-bubble").count(), 2);
    assert.equal(await b.locator(".text-bubble").count(), 1);
    assert.equal(await a.evaluate(() => localStorage.getItem("potonchu.prototype.v1")), "production-sentinel");
    assert.equal(await a.evaluate(() => sessionStorage.getItem("potonchu.activeRoomId")), "production-room-sentinel");
    assert.deepEqual(blockedRequests, [], "Preview must not contact Firebase or AI services");
    assert.deepEqual(errors, []);
    console.log("PASS: isolated preview, feeling-to-gacha, reroll, unified conversation, own 12-hour window, 24-hour reminder sample, and two-tab reactions.");
  } finally {
    if (browser) await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
