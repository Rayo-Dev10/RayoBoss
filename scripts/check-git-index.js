#!/usr/bin/env node
const { execFileSync } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
function git(args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); }
try { git(['rev-parse', '--is-inside-work-tree']); }
catch (_) { console.error('El repositorio Git todavía no está inicializado.'); process.exit(1); }
const tracked = new Set(git(['ls-files']).split(/\r?\n/).filter(Boolean));
const required = [
  'server/core/storage/storage-factory.js',
  'server/core/storage/storage-provider.js',
  'server/core/storage/local-disk-storage-provider.js',
  'server/core/storage/vercel-blob-storage-provider.js',
  'server/vercel-entry.js', 'api/index.js', 'package.json', 'package-lock.json', 'vercel.json'
];
const forbidden = ['.env', 'data/state.json', '.vercel/project.json'];
const errors = [];
for (const item of required) if (!tracked.has(item)) errors.push(`Git no está siguiendo ${item}`);
for (const item of forbidden) if (tracked.has(item)) errors.push(`Git no debe seguir ${item}`);
const untracked = git(['status', '--porcelain']).split(/\r?\n/).filter(line => line.startsWith('??'));
if (untracked.length) errors.push(`hay archivos sin agregar: ${untracked.join(', ')}`);
if (errors.length) { errors.forEach(e => console.error(`- ${e}`)); process.exit(1); }
console.log('Índice Git verificado: archivos críticos incluidos y secretos excluidos.');
