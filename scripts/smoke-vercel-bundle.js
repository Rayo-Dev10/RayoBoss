#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');

const child = String.raw`
const http = require('http');
const handler = require('./api/index.js');
const server = http.createServer(handler);
server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  http.get({ host: '127.0.0.1', port, path: '/api/health' }, res => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (res.statusCode !== 200 || body.version !== '4.0.1' || body.ok !== true) {
        console.error(JSON.stringify({ status: res.statusCode, body }));
        server.close(() => process.exit(1));
        return;
      }
      server.close(() => process.exit(0));
    });
  }).on('error', error => server.close(() => { console.error(error); process.exit(1); }));
});
`;

function run(name, extraEnv) {
  const result = spawnSync(process.execPath, ['-e', child], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      VERCEL: '1',
      RAYOBOSS_DEV_PASSWORD: 'Smoke-Dev-Password-2026',
      RAYOBOSS_SECRET: 'smoke-secret-0123456789abcdef-0123456789abcdef',
      RAYOBOSS_SCRYPT_N: '16384',
      RAYOBOSS_SCRYPT_MAXMEM_MB: '64',
      RAYOBOSS_STORAGE_PROVIDER: 'auto',
      BLOB_READ_WRITE_TOKEN: '',
      ...extraEnv
    }
  });
  if (result.status !== 0) {
    console.error(`[FALLA] ${name}`);
    if (result.stdout) console.error(result.stdout.trim());
    if (result.stderr) console.error(result.stderr.trim());
    process.exit(1);
  }
  console.log(`[OK] ${name}`);
}

run('Bundle Vercel inicia sin Blob', {});
run('Bundle Vercel inicia con Blob conectado', { BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_smoke_token_not_used_for_network' });
