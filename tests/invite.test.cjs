const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

// The invite dialog's QR code: the app's own function with the bundled qrcode.js.
function load(withLibrary) {
  const context = vm.createContext({});
  if (withLibrary) vm.runInContext(fs.readFileSync(require.resolve("../qrcode.js"), "utf8") + "\nthis.qrcode = qrcode;", context);
  const source = fs.readFileSync(require.resolve("../script.js"), "utf8");
  const start = source.indexOf("function makeQrSvg(text)");
  vm.runInContext(source.slice(start, source.indexOf("\n}\n", start) + 3), context);
  return context.makeQrSvg;
}

test("an invite link becomes a square QR code with a quiet zone and its three corner markers", () => {
  const link = "https://example.com/POTONCYU/?roomId=room_c7f4e0c3-f4af-4c60-be59-77283f37195a&roomName=%E5%B8%B0%E3%82%8A%E9%81%93&roomType=pair";
  const svg = load(true)(link);
  const size = Number(/viewBox="0 0 (\d+) \1"/.exec(svg)[1]);
  const modules = size - 8;
  assert.equal((modules - 21) % 4, 0);
  const dark = new Set([...svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)].map((m) => `${m[1]},${m[2]}`));
  const finder = (x, y) => [0, 1, 2, 3, 4, 5, 6].every((i) => dark.has(`${x + i},${y}`) && dark.has(`${x + i},${y + 6}`) && dark.has(`${x},${y + i}`) && dark.has(`${x + 6},${y + i}`))
    && dark.has(`${x + 3},${y + 3}`) && !dark.has(`${x + 1},${y + 1}`);
  assert.ok(finder(4, 4) && finder(4 + modules - 7, 4) && finder(4, 4 + modules - 7));
  assert.ok([...dark].every((cell) => cell.split(",").every((n) => n >= 4 && n < 4 + modules)));
  assert.notEqual(load(true)(link + "x"), svg);
});

test("without the QR library the dialog falls back to the link alone", () => {
  assert.equal(load(false)("https://example.com/"), "");
});

test("the invite button opens the dialog and the page loads the QR library before the app", () => {
  const source = fs.readFileSync(require.resolve("../script.js"), "utf8");
  assert.match(source, /if \(action === "copy-invite"\) \{\s+openInviteDialog\(button\.dataset\.roomId\);/);
  const html = fs.readFileSync(require.resolve("../index.html"), "utf8");
  assert.ok(html.indexOf("qrcode.js") > 0 && html.indexOf("qrcode.js") < html.indexOf("script.js?v="));
});
