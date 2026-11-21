const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const siteRoot = path.resolve(process.argv[2]);
const port = Number(process.argv[3] || 8077);
const contentTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.webp': 'image/webp',
  '.xml': 'application/xml',
};
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const webPath = decodeURIComponent(url.pathname);
  const filePath = path.resolve(siteRoot, '.' + webPath);
  if (!filePath.startsWith(siteRoot + path.sep) && filePath !== siteRoot) {
    res.writeHead(403).end();
    return;
  }
  try {
    const stat = await fs.stat(filePath);
    const resolved = stat.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    const bytes = await fs.readFile(resolved);
    res.writeHead(200, { 'Content-Type': contentTypes[path.extname(resolved)] || 'application/octet-stream' });
    res.end(bytes);
  } catch {
    res.writeHead(404).end();
  }
}).listen(port, '127.0.0.1', () => console.log('Local site at http://127.0.0.1:' + port));
