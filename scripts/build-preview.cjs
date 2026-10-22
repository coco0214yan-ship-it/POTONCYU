const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const destination = path.join(root, "preview");
const files = ["script.js", "styles.css", "poem-engine.js", "reaction-feedback.js"];

fs.mkdirSync(destination, { recursive: true });
for (const file of files) {
  fs.copyFileSync(path.join(root, file), path.join(destination, file));
}
console.log(`Preview snapshot updated: ${files.length} files.`);
