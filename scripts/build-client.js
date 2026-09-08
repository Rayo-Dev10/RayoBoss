const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const publicJs = path.join(root, 'public', 'js');
const apiDir = path.join(root, 'api');
fs.mkdirSync(publicJs, { recursive: true });
fs.mkdirSync(apiDir, { recursive: true });

esbuild.buildSync({
  entryPoints: [path.join(publicJs, 'blob-upload-entry.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  outfile: path.join(publicJs, 'blob-client.js'),
  legalComments: 'none'
});

// Empaqueta todos los módulos locales del servidor en una sola función.
// Las dependencias permanecen externas y Vercel las instala desde pnpm-lock.yaml.
esbuild.buildSync({
  entryPoints: [path.join(root, 'server', 'vercel-entry.js')],
  bundle: true,
  minify: false,
  format: 'cjs',
  platform: 'node',
  target: ['node24'],
  packages: 'external',
  outfile: path.join(apiDir, 'index.js'),
  banner: { js: '// RayoBoss 4.1.0 - bundle Vercel generado; no editar manualmente.' },
  legalComments: 'none'
});

console.log('Cliente Blob y función Vercel compilados.');
