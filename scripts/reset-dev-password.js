#!/usr/bin/env node
require('../server/load-env')();
const fs = require('fs');
const path = require('path');
const cfg = require('../server/config');
const users = require('../server/core/users');
const { writePrimary, readRecoverable } = require('../server/utils/storage');

(async () => {
  if (!cfg.dataDir) throw new Error('El restablecimiento solo está disponible en local/VPS, no en Vercel.');
  const stateFile = path.join(cfg.dataDir, 'state.json');
  const state = readRecoverable(stateFile);
  if (!state) throw new Error('No existe data/state.json. Ejecute npm start una vez o elimine data para inicializarlo.');
  const dev = state.users.find(u => u.username === cfg.auth.devUsername);
  if (!dev) throw new Error('No se encontró el usuario dev protegido.');
  dev.passwordHash = await users.hashPassword(cfg.auth.devPassword);
  dev.sessionVersion = (Number(dev.sessionVersion) || 1) + 1;
  dev.passwordChangedAt = new Date().toISOString();
  writePrimary(stateFile, state);
  console.log('Contraseña de dev sincronizada con RAYOBOSS_DEV_PASSWORD del .env.');
  console.log('Los demás usuarios y solicitudes fueron conservados. Todas las sesiones previas de dev quedaron revocadas.');
})().catch(error => {
  console.error(`[reset-dev-password] ${error.message}`);
  process.exit(1);
});
