#!/usr/bin/env node
// Ejecutar como proceso separado: simula Vercel y verifica 60 s de audio contra reloj y bytes.
const crypto = require('crypto');
process.env.VERCEL = '1';
process.env.RAYOBOSS_LIVE_SECONDS = '60';
process.env.RAYOBOSS_DEV_PASSWORD ||= crypto.randomBytes(18).toString('base64url');
process.env.RAYOBOSS_SECRET ||= crypto.randomBytes(48).toString('hex');
process.env.RAYOBOSS_SCRYPT_N ||= '16384';
process.env.RAYOBOSS_SCRYPT_MAXMEM_MB ||= '64';
const http = require('http');
const { app } = require('../server/app');
const cfg = require('../server/config');
const audio = require('../server/core/audio');
console.log('Iniciando simulacion Vercel de 60 segundos...');
const server = app.listen(0, () => {
  const port = server.address().port;
  const started = Date.now();
  let bytes = 0;
  const request = http.get(`http://127.0.0.1:${port}/api/live/stream`, { agent: false }, res => {
    console.log(`Stream conectado: HTTP ${res.statusCode}`);
    res.on('data', chunk => { bytes += chunk.length; });
    res.on('end', () => {
      const seconds = (Date.now() - started) / 1000;
      const expected = 44 + audio.SR * 2 * 60;
      const timeOk = seconds >= 59 && seconds <= 62;
      const bytesOk = bytes === expected;
      console.log(JSON.stringify({ version: cfg.version, seconds, bytes, expected, timeOk, bytesOk }, null, 2));
      if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
      server.close(() => process.exit(timeOk && bytesOk ? 0 : 1));
    });
  });
  request.on('error', error => { console.error(error); server.close(() => process.exit(1)); });
  setTimeout(() => { console.error('Timeout: el stream no cerro en 70 s.'); request.destroy(); if (typeof server.closeAllConnections === 'function') server.closeAllConnections(); server.close(() => process.exit(1)); }, 70000).unref();
});
