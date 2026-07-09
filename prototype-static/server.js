/* Minimal dependency-free static server for StackPilot.
   Needed because the app fetches ./.env at runtime, and file:// pages
   (and some static servers that hide dotfiles) can't serve it.
   Run: node server.js  ->  http://localhost:3000                     */

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".md": "text/plain; charset=utf-8",
  ".env": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const file = path.normalize(path.join(ROOT, urlPath === "/" ? "index.html" : urlPath));

    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }

    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(404);
        return res.end("Not found");
      }
      // dotfiles like ".env" have no extname; fall back to the basename
      const ext = path.extname(file).toLowerCase() || path.basename(file).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(buf);
    });
  })
  .listen(PORT, () => {
    console.log(`⚡ StackPilot running at http://localhost:${PORT}`);
  });
