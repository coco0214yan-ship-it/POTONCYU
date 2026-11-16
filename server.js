const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 4173);
const root = __dirname;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

const server = http.createServer((request, response) => {
  const parsedUrl = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);
  if (parsedUrl.pathname === "/") {
    response.writeHead(200, { "Content-Type": types[".html"] });
    response.end(fs.readFileSync(path.join(root, "index.html")));
    return;
  }

  const routes = {
    "/honne-dialogue-mvp": "/honne-dialogue-mvp/index.html",
    "/honne-dialogue-mvp/": "/honne-dialogue-mvp/index.html",
    "/prototype": "/honnebell-prototype/index.html",
    "/prototype/": "/honnebell-prototype/index.html",
  };
  const urlPath = routes[parsedUrl.pathname] || parsedUrl.pathname;
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  const filePath = path.join(root, safePath);

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "text/plain; charset=utf-8",
    });
    response.end(data);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Potonchu prototype is running at http://127.0.0.1:${port}/`);
});
