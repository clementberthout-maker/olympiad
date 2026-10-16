// Mini serveur statique pour prévisualiser le site (docs/) en local, comme
// GitHub Pages : node .claude/serveur-site.js
// - le site est servi à la racine ET sous /olympiad/ (adresse réelle de
//   GitHub Pages) ;
// - une adresse inconnue renvoie docs/404.html s'il existe, comme GitHub Pages.
const http = require('http');
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..', 'docs');
const PORT = 5500;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.md': 'text/markdown; charset=utf-8',
};

function envoyer(res, fichier, statut = 200) {
  fs.readFile(fichier, (err, data) => {
    if (err) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(statut, { 'Content-Type': TYPES[path.extname(fichier)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}

http.createServer((req, res) => {
  let chemin = decodeURIComponent(req.url.split('?')[0]).replace(/^\/olympiad(?=\/|$)/, '') || '/';
  if (chemin.endsWith('/')) chemin += 'index.html';
  const fichier = path.normalize(path.join(RACINE, chemin));
  if (!fichier.startsWith(RACINE)) { res.writeHead(403); res.end(); return; }
  fs.stat(fichier, (err, infos) => {
    if (!err && infos.isFile()) envoyer(res, fichier);
    else if (!err && infos.isDirectory()) envoyer(res, path.join(fichier, 'index.html'));
    else envoyer(res, path.join(RACINE, '404.html'), 404);
  });
}).listen(PORT, () => console.log(`Site : http://localhost:${PORT}/olympiad/ (espace organisateur : /olympiad/espace.html, démo : ?demo=1)`));
