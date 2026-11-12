const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const destination = path.join(root, "preview");
const files = ["index.html", "script.js", "styles.css", "preview.css", "firebase-config.js", "poem-engine.js", "reaction-feedback.js", "chat-rules.js"];

fs.mkdirSync(destination, { recursive: true });
for (const file of files) {
  if (!fs.existsSync(path.join(destination, file))) throw new Error(`Missing preview file: ${file}`);
}
// The preview now has its own conversation flow. Never overwrite it with the production app.
console.log(`Independent preview ready: ${files.length} files. Run node preview/server.cjs to open it.`);
