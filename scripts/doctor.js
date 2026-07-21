#!/usr/bin/env node
require('../server/load-env')();
const fs = require('fs');
const path = require('path');
let cfg;
let storage;
try {
  cfg = require('../server/config');
  storage = require('../server/core/storage/storageFactory').getStorageProvider();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const root = path.join(__dirname, '..');
const checks = [];
function check(name, ok, detail = '') { checks.push({ name, ok: Boolean(ok), detail }); }
const major = Number(process.versions.node.split('.')[0]);
const storageInfo = storage.describe();
check('Node.js >= 22', major >= 22, process.version);
check('RAYOBOSS_SECRET >= 32', cfg.auth.secret.length >= 32);
check('Contraseña dev valida', cfg.auth.devPassword.length >= cfg.auth.minPasswordLength);
check('Directorio public', fs.existsSync(path.join(root, 'public/index.html')));
check('vercel.json', fs.existsSync(path.join(root, 'vercel.json')));
check('Frame compatible', 6000 % cfg.audio.frameMs === 0, `${cfg.audio.frameMs} ms`);
check('Señalizacion RTC configurada', cfg.rtc.pollMs >= 400, `${cfg.rtc.pollMs} ms`);
check('Contrato StorageProvider', typeof storage.saveObject === 'function' && typeof storage.deleteObject === 'function', storageInfo.provider);
check('Modo de carga coherente', ['none', 'server', 'direct'].includes(storageInfo.uploadMode), storageInfo.uploadMode);
check('Cliente Blob compilado', fs.existsSync(path.join(root, 'public/js/blob-client.js')));
check('@vercel/functions disponible', (() => { try { require.resolve('@vercel/functions'); return true; } catch (_) { return false; } })());
check('Vercel Blob opcional', true, storageInfo.provider === 'vercel-blob' ? 'configurado' : 'no configurado o no requerido');
check('TURN opcional', true, cfg.rtc.iceServers.some(server => String(server.urls).startsWith('turn')) ? 'configurado' : 'no configurado; STUN solamente');
if (cfg.dataDir) {
  try {
    fs.mkdirSync(cfg.dataDir, { recursive: true, mode: 0o700 });
    fs.accessSync(cfg.dataDir, fs.constants.R_OK | fs.constants.W_OK);
    check('data/ legible y escribible', true, cfg.dataDir);
  } catch (error) {
    check('data/ legible y escribible', false, error.message);
  }
}
for (const item of checks) console.log(`[${item.ok ? 'OK' : 'FALLA'}] ${item.name}${item.detail ? ` - ${item.detail}` : ''}`);
if (checks.some(item => !item.ok)) process.exit(1);
console.log(`RayoBoss ${cfg.version}: diagnostico aprobado.`);
