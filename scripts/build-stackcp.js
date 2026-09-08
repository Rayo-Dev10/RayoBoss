#!/usr/bin/env node
// Artefacto público por lista permitida; nunca copiar el repositorio completo.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'stackcp');
const files = ['index.php', 'login.css'];
fs.mkdirSync(output, { recursive: true });
for (const name of fs.readdirSync(output)) {
  if (![...files, 'manifest.json'].includes(name)) throw new Error(`Archivo inesperado en artefacto: ${name}`);
  if (fs.lstatSync(path.join(output, name)).isSymbolicLink()) throw new Error('Artefacto con enlace simbólico.');
}
const manifest = { version: require('../package.json').version, files: {} };
for (const name of files) {
  const content = fs.readFileSync(path.join(root, 'hosting', 'stackcp', name));
  fs.writeFileSync(path.join(output, name), content);
  manifest.files[name] = crypto.createHash('sha256').update(content).digest('hex');
}
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`StackCP ${manifest.version}: ${files.length} archivos públicos y manifiesto en dist/stackcp.`);
