const path = require('path');
const esbuild = require('esbuild');
const root = path.join(__dirname, '..');
esbuild.buildSync({
  entryPoints: [path.join(root, 'public', 'js', 'blob-upload-entry.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  outfile: path.join(root, 'public', 'js', 'blob-client.js')
});
console.log('Cliente de Vercel Blob compilado.');
