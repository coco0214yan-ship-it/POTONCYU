// Reproducible app icons, with no additional image library or external service.
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, content) {
  const data = Buffer.concat([Buffer.from(type), content]);
  const output = Buffer.alloc(data.length + 8);
  output.writeUInt32BE(content.length); data.copy(output, 4);
  output.writeUInt32BE(crc32(data), output.length - 4);
  return output;
}
for (const size of [192, 512]) {
  const pixels = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = x / size - 0.5, py = y / size - 0.55;
    const drop = px * px + py * py < 0.24 ** 2 || (y / size > 0.21 && y / size < 0.55 && Math.abs(px) < (y / size - 0.21) * 0.71);
    const eye = ((px - 0.075) ** 2 + (py - 0.005) ** 2 < 0.018 ** 2) || ((px + 0.075) ** 2 + (py - 0.005) ** 2 < 0.018 ** 2);
    const color = eye ? [255, 255, 255] : drop ? [223, 115, 135] : [255, 245, 240];
    const offset = y * (size * 3 + 1) + 1 + x * 3;
    for (let c = 0; c < 3; c++) pixels[offset + c] = color[c];
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 2;
  const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", header), chunk("IDAT", zlib.deflateSync(pixels)), chunk("IEND", Buffer.alloc(0))]);
  fs.writeFileSync(path.join(__dirname, "..", "assets", size === 192 ? "notification-icon.png" : "notification-icon-512.png"), png);
}
console.log("Notification icons: 192px and 512px");
