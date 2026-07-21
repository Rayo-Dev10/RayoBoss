#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const errors = [];
const required = [
  'README.md', '.env.example', '.gitignore', 'package.json', 'package-lock.json', 'vercel.json',
  'api/index.js', 'server/vercel-entry.js', 'server/app.js', 'server/config.js',
  'server/core/storage/storage-factory.js', 'server/core/storage/storage-provider.js',
  'server/core/storage/local-disk-storage-provider.js', 'server/core/storage/vercel-blob-storage-provider.js',
  'public/index.html', 'public/embed.html', 'public/js/blob-client.js'
];
for (const item of required) if (!fs.existsSync(path.join(root, item))) errors.push(`falta ${item}`);

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
if (pkg.version !== '4.0.1') errors.push(`package.json tiene versión ${pkg.version}`);
if (lock.version !== '4.0.1' || lock.packages?.['']?.version !== '4.0.1') errors.push('package-lock.json no está sincronizado con 4.0.1');

const config = fs.readFileSync(path.join(root, 'server/config.js'), 'utf8');
if (!config.includes("version: '4.0.1'")) errors.push('server/config.js no declara 4.0.1');
const bundle = fs.readFileSync(path.join(root, 'api/index.js'), 'utf8');
if (!bundle.includes('bundle Vercel generado')) errors.push('api/index.js no fue generado por el build de 4.0.1');
if (bundle.includes("require('../server/app')")) errors.push('api/index.js todavía depende de un módulo local externo al bundle');

const ignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
for (const rule of ['/node_modules/', '/.env', '/data/', '/storage/', '/.vercel/']) if (!ignore.includes(rule)) errors.push(`.gitignore no contiene ${rule}`);

const forbiddenTrackedNames = ['LEEME-ACTUALIZACION', 'MANIFEST-3.', 'CHANGELOG.md'];
for (const name of forbiddenTrackedNames) {
  const found = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'data') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.includes(name)) found.push(path.relative(root, full));
    }
  })(root);
  if (found.length) errors.push(`archivo histórico no permitido: ${found.join(', ')}`);
}

if (errors.length) {
  console.error('Verificación de release fallida:');
  errors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
}
console.log('Release 4.0.1 verificado: estructura crítica completa y bundle Vercel autocontenido.');
