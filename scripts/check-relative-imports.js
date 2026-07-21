#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const roots = ['api', 'server', 'scripts'];
const extensions = new Set(['.js', '.cjs', '.mjs']);
const problems = [];
let filesChecked = 0;
let importsChecked = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const output = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...walk(full));
    else if (extensions.has(path.extname(entry.name))) output.push(full);
  }
  return output;
}

function exactCaseExists(candidate) {
  const relative = path.relative(root, candidate);
  if (relative.startsWith('..')) return false;
  let current = root;
  for (const segment of relative.split(path.sep)) {
    const entries = fs.readdirSync(current);
    if (!entries.includes(segment)) return false;
    current = path.join(current, segment);
  }
  return true;
}

function resolveRelative(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [base, `${base}.js`, `${base}.cjs`, `${base}.mjs`, `${base}.json`, path.join(base, 'index.js')];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const patterns = [
  /require\(\s*['"]([^'"]+)['"]\s*\)/g,
  /import\(\s*['"]([^'"]+)['"]\s*\)/g,
  /from\s+['"]([^'"]+)['"]/g
];

for (const base of roots) {
  for (const file of walk(path.join(root, base))) {
    if (path.basename(file) === 'smoke-vercel-bundle.js') continue;
    filesChecked += 1;
    const source = fs.readFileSync(file, 'utf8');
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(source))) {
        const specifier = match[1];
        if (!specifier.startsWith('.')) continue;
        importsChecked += 1;
        const target = resolveRelative(file, specifier);
        if (!target) {
          problems.push(`${path.relative(root, file)}: no existe ${specifier}`);
          continue;
        }
        if (!exactCaseExists(target)) {
          problems.push(`${path.relative(root, file)}: capitalización incorrecta en ${specifier}`);
        }
      }
    }
  }
}

const critical = [
  'server/core/storage/storage-factory.js',
  'server/core/storage/storage-provider.js',
  'server/core/storage/local-disk-storage-provider.js',
  'server/core/storage/vercel-blob-storage-provider.js',
  'server/vercel-entry.js',
  'api/index.js'
];
for (const file of critical) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) problems.push(`falta archivo crítico: ${file}`);
}

if (problems.length) {
  console.error('Verificación de imports fallida:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`Imports verificados: ${importsChecked} referencias relativas en ${filesChecked} archivos.`);
