// Only serve the isolated preview, never the parent project's config or files.
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const root = __dirname;
const types = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml" };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const file = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (!file.startsWith(root + path.sep) || !types[path.extname(file)]) { res.writeHead(404).end(); return; }
    res.setHeader("Content-Type", types[path.extname(file)]);
    res.setHeader("Cache-Control", "no-store");
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404).end(); }
});
const port = Number(process.env.PORT || 4280);
server.listen(port, "127.0.0.1", () => console.log(`Preview: http://127.0.0.1:${port}/`));
server.on("error", (error) => { console.error(error.code === "EADDRINUSE" ? `ポート${port}は使用中です。別のPORTを指定してください。` : error.message); process.exitCode = 1; });
