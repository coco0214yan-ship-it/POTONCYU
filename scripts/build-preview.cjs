const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const destination = path.join(root, "preview");
const files = ["script.js", "styles.css", "poem-engine.js", "reaction-feedback.js", "feeling-poems.js", "honne-flow.css", "functions/lib/poem-rounds.js", "functions/lib/tanka-contract.js", "functions/lib/feeling-catalog-data.js"];

fs.mkdirSync(destination, { recursive: true });
for (const file of files) {
  fs.mkdirSync(path.dirname(path.join(destination, file)), { recursive: true });
  fs.copyFileSync(path.join(root, file), path.join(destination, file));
}
console.log(`Preview snapshot updated: ${files.length} files.`);
