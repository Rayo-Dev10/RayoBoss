// Usuarios, roles, solicitudes de invitado y migracion automatica desde v2.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cfg = require('../config');
const runtimeStore = require('../utils/runtime-store');
const { writePrimary, readRecoverable } = require('../utils/storage');
const { badRequest, forbidden, notFound } = require('../utils/errors');

const ROLES = ['desarrollador', 'administrador', 'locutor', 'periodista', 'invitado', 'anonimo', 'solo_lectura'];
const RANK = Object.fromEntries(ROLES.map((role, index) => [role, ROLES.length - index]));
const STATE_FILE = cfg.dataDir ? path.join(cfg.dataDir, 'state.json') : null;
const V2_USERS_FILE = cfg.dataDir ? path.join(cfg.dataDir, 'users.json') : null;
const VERCEL_STATE_KEY = 'users-state';
let state = null;
let loadPromise = null;
let mutationQueue = Promise.resolve();
let dummyHashPromise = null;
let devPasswordChecked = false;

function normalizeScryptOptions(n = cfg.auth.scryptN, r = cfg.auth.scryptR, p = cfg.auth.scryptP) {
  if (!Number.isInteger(n) || n < 16384 || n > 1048576 || (n & (n - 1)) !== 0) return null;
  if (!Number.isInteger(r) || r < 1 || r > 32) return null;
  if (!Number.isInteger(p) || p < 1 || p > 16) return null;
  return { N: n, r, p, maxmem: Math.max(cfg.auth.scryptMaxmem, 128 * n * r + 1024 * 1024) };
}

function hashPassword(password) {
  const options = normalizeScryptOptions();
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(String(password), salt, 32, options, (error, key) => {
      if (error) return reject(error);
      resolve(`scrypt$${options.N}$${options.r}$${options.p}$${salt.toString('hex')}$${key.toString('hex')}`);
    });
  });
}

function parseStoredHash(stored) {
  const parts = String(stored || '').split('$');
  if (parts[0] !== 'scrypt') return null;
  // Compatibilidad con v2: scrypt$N$salt$key
  if (parts.length === 4) {
    const options = normalizeScryptOptions(Number(parts[1]), 8, 1);
    return options ? { options, saltHex: parts[2], keyHex: parts[3] } : null;
  }
  if (parts.length !== 6) return null;
  const options = normalizeScryptOptions(Number(parts[1]), Number(parts[2]), Number(parts[3]));
  return options ? { options, saltHex: parts[4], keyHex: parts[5] } : null;
}

function verifyPassword(password, stored) {
  return new Promise(resolve => {
    const parsed = parseStoredHash(stored);
    if (!parsed || !/^[0-9a-f]{32}$/i.test(parsed.saltHex) || !/^[0-9a-f]{64}$/i.test(parsed.keyHex)) return resolve(false);
    crypto.scrypt(String(password), Buffer.from(parsed.saltHex, 'hex'), 32, parsed.options, (error, key) => {
      if (error) return resolve(false);
      const expected = Buffer.from(parsed.keyHex, 'hex');
      resolve(expected.length === key.length && crypto.timingSafeEqual(expected, key));
    });
  });
}

async function seedState() {
  return {
    schemaVersion: 3,
    revision: 1,
    users: [{
      username: cfg.auth.devUsername,
      passwordHash: await hashPassword(cfg.auth.devPassword),
      role: 'desarrollador',
      protected: true,
      sessionVersion: 1,
      createdAt: new Date().toISOString()
    }],
    guestRequests: []
  };
}

function validateState(candidate) {
  if (!candidate || candidate.schemaVersion !== 3 || !Array.isArray(candidate.users) || !Array.isArray(candidate.guestRequests)) {
    throw new Error('Formato de state.json invalido.');
  }
  candidate.revision = Number.isInteger(candidate.revision) && candidate.revision > 0 ? candidate.revision : 1;
  const seen = new Set();
  for (const user of candidate.users) {
    if (!user || !/^[a-zA-Z0-9._-]{2,32}$/.test(user.username) || !ROLES.includes(user.role)) {
      throw new Error('state.json contiene un usuario invalido.');
    }
    if (seen.has(user.username)) throw new Error('state.json contiene usuarios duplicados.');
    seen.add(user.username);
    if (!parseStoredHash(user.passwordHash)) throw new Error(`Hash invalido para ${user.username}.`);
    user.sessionVersion = Number.isInteger(user.sessionVersion) && user.sessionVersion > 0 ? user.sessionVersion : 1;
  }
  if (!candidate.users.some(user => user.username === cfg.auth.devUsername && user.protected && user.role === 'desarrollador')) {
    throw new Error('state.json no contiene el usuario desarrollador protegido.');
  }
  for (const request of candidate.guestRequests) {
    if (!request || typeof request.id !== 'string') throw new Error('state.json contiene una solicitud de invitado invalida.');
    if (request.username && !/^[a-zA-Z0-9._-]{2,32}$/.test(request.username)) {
      throw new Error('state.json contiene un usuario temporal invalido.');
    }
  }
  return candidate;
}

async function persist(candidate = state) {
  candidate.revision = (candidate.revision || 0) + 1;
  if (cfg.isVercel) {
    await runtimeStore.set(VERCEL_STATE_KEY, candidate, {
      name: 'Usuarios y solicitudes RayoBoss',
      tags: ['rayoboss-users']
    });
  } else if (STATE_FILE) {
    writePrimary(STATE_FILE, candidate);
  }
}

async function migrateV2() {
  if (!V2_USERS_FILE || !fs.existsSync(V2_USERS_FILE)) return null;
  const users = readRecoverable(V2_USERS_FILE);
  if (!Array.isArray(users)) throw new Error('users.json de v2 no es un arreglo valido.');
  const migrated = {
    schemaVersion: 3,
    revision: 1,
    users: users.map(user => ({ ...user, sessionVersion: 1 })),
    guestRequests: []
  };
  validateState(migrated);
  await persist(migrated);
  const archive = path.join(cfg.dataDir, `users.v2-migrated-${Date.now()}.json`);
  try { fs.copyFileSync(V2_USERS_FILE, archive); } catch (_) { /* no bloquear migracion */ }
  console.log('[rayoboss] users.json de v2 migrado a data/state.json.');
  return migrated;
}

async function readStoredState() {
  if (cfg.isVercel) return runtimeStore.get(VERCEL_STATE_KEY);
  if (!STATE_FILE) return null;
  return readRecoverable(STATE_FILE);
}

async function synchronizeDevPassword(candidate) {
  if (devPasswordChecked && !cfg.isVercel) return false;
  const dev = candidate.users.find(user => user.username === cfg.auth.devUsername);
  if (!dev) return false;
  const matches = await verifyPassword(cfg.auth.devPassword, dev.passwordHash);
  devPasswordChecked = true;
  if (matches) return false;
  dev.passwordHash = await hashPassword(cfg.auth.devPassword);
  dev.sessionVersion = (dev.sessionVersion || 1) + 1;
  dev.passwordChangedAt = new Date().toISOString();
  console.log('[rayoboss] La contraseña de dev se sincronizo automaticamente con RAYOBOSS_DEV_PASSWORD.');
  return true;
}

async function loadState({ fresh = false } = {}) {
  if (state && !fresh && !cfg.isVercel) return state;
  if (loadPromise && !fresh) return loadPromise;
  const loader = (async () => {
    let candidate = await readStoredState();
    if (candidate) candidate = validateState(candidate);
    if (!candidate) candidate = await migrateV2();
    if (!candidate) {
      candidate = await seedState();
      await persist(candidate);
    }
    if (await synchronizeDevPassword(candidate)) await persist(candidate);
    state = candidate;
    return state;
  })();
  if (!fresh) loadPromise = loader;
  try { return await loader; }
  finally { if (!fresh) loadPromise = null; }
}

function serializeMutation(fn) {
  const run = mutationQueue.then(async () => {
    await loadState({ fresh: cfg.isVercel });
    return fn();
  }, async () => {
    await loadState({ fresh: cfg.isVercel });
    return fn();
  });
  mutationQueue = run.catch(() => {});
  return run;
}

function validatePassword(password) {
  if (typeof password !== 'string') badRequest('La contraseña debe ser texto.');
  if (password.length < cfg.auth.minPasswordLength) badRequest(`La contraseña debe tener al menos ${cfg.auth.minPasswordLength} caracteres.`);
  if (password.length > cfg.auth.maxPasswordLength) badRequest(`La contraseña no puede superar ${cfg.auth.maxPasswordLength} caracteres.`);
}
function validateUsername(username) {
  username = String(username || '').trim();
  if (!/^[a-zA-Z0-9._-]{2,32}$/.test(username)) badRequest('Nombre de usuario invalido (2-32 caracteres: letras, numeros, punto, guion o guion bajo).');
  return username;
}
function publicUser(user) {
  return {
    username: user.username,
    role: user.role,
    protected: Boolean(user.protected),
    sessionVersion: user.sessionVersion,
    createdAt: user.createdAt
  };
}

async function findUser(username) {
  const current = await loadState({ fresh: cfg.isVercel });
  return current.users.find(user => user.username === username) || null;
}

async function verifyLogin(username, password) {
  const safeUsername = typeof username === 'string' ? username.trim() : '';
  const safePassword = typeof password === 'string' && password.length <= cfg.auth.maxPasswordLength ? password : '';
  const user = await findUser(safeUsername);
  if (!dummyHashPromise) dummyHashPromise = hashPassword('dummy-password-never-used');
  if (!user) { await verifyPassword(safePassword, await dummyHashPromise); return null; }
  return (await verifyPassword(safePassword, user.passwordHash)) ? user : null;
}

async function createUserUnlocked(actor, input) {
  const username = validateUsername(input.username);
  validatePassword(input.password);
  const role = String(input.role || '');
  if (!ROLES.includes(role)) badRequest('Rol invalido.');
  if (state.users.some(user => user.username === username)) badRequest('El usuario ya existe.');
  if (actor.role !== 'desarrollador') {
    if (actor.role !== 'administrador') forbidden('Sin permiso para crear usuarios.');
    if (role === 'desarrollador') forbidden('Un administrador no puede crear desarrolladores.');
  }
  const user = {
    username,
    passwordHash: await hashPassword(input.password),
    role,
    protected: false,
    sessionVersion: 1,
    createdAt: new Date().toISOString()
  };
  state.users.push(user);
  return user;
}

function createUser(actor, input) {
  return serializeMutation(async () => {
    const user = await createUserUnlocked(actor, input || {});
    await persist();
    return publicUser(user);
  });
}

function deleteUser(actor, username) {
  return serializeMutation(async () => {
    const user = state.users.find(item => item.username === username);
    if (!user) notFound('Usuario no encontrado.');
    if (user.protected) forbidden('El usuario dev esta protegido y no puede eliminarse.');
    if (actor.username === username) forbidden('No puedes eliminar tu propia cuenta.');
    if (actor.role !== 'desarrollador') forbidden('Solo el desarrollador puede eliminar usuarios.');
    state.users = state.users.filter(item => item.username !== username);
    await persist();
    return true;
  });
}

function changePassword(actor, username, newPassword) {
  return serializeMutation(async () => {
    const user = state.users.find(item => item.username === username);
    if (!user) notFound('Usuario no encontrado.');
    const self = actor.username === username;
    const canAdmin = actor.role === 'administrador' && RANK[actor.role] > RANK[user.role];
    if (!self && actor.role !== 'desarrollador' && !canAdmin) forbidden('Sin permiso para cambiar esta contraseña.');
    validatePassword(newPassword);
    user.passwordHash = await hashPassword(newPassword);
    user.sessionVersion = (user.sessionVersion || 1) + 1;
    user.passwordChangedAt = new Date().toISOString();
    await persist();
    return true;
  });
}

async function listUsers() {
  const current = await loadState({ fresh: cfg.isVercel });
  return current.users.map(publicUser);
}

function validatePersonName(value, label) {
  value = String(value || '').trim().replace(/\s+/g, ' ');
  if (!/^[\p{L}\p{M} .'-]{1,60}$/u.test(value)) badRequest(`${label} contiene caracteres no permitidos.`);
  return value;
}
function slug(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
}
function uniqueGuestUsername(nombre, apellido) {
  const base = `${slug(nombre).split('.')[0] || 'invitado'}.${slug(apellido).split('.')[0] || 'unioc'}`.slice(0, 26);
  const reserved = new Set([
    ...state.users.map(user => user.username),
    ...state.guestRequests.map(request => request.username).filter(Boolean)
  ]);
  let candidate = base;
  let suffix = 1;
  while (reserved.has(candidate)) {
    candidate = `${base.slice(0, 28 - String(suffix).length)}${suffix++}`;
  }
  return candidate;
}

function requestGuest(nombre, apellido) {
  return serializeMutation(async () => {
    const safeNombre = validatePersonName(nombre, 'Nombre');
    const safeApellido = validatePersonName(apellido, 'Apellido');
    const request = {
      id: crypto.randomBytes(8).toString('hex'),
      nombre: safeNombre,
      apellido: safeApellido,
      username: uniqueGuestUsername(safeNombre, safeApellido),
      estado: 'pendiente',
      createdAt: new Date().toISOString()
    };
    state.guestRequests.push(request);
    if (state.guestRequests.length > 500) state.guestRequests.shift();
    await persist();
    return { ...request };
  });
}

function approveGuest(actor, id) {
  return serializeMutation(async () => {
    if (!['desarrollador', 'administrador'].includes(actor.role)) forbidden('Sin permiso para aprobar invitados.');
    const request = state.guestRequests.find(item => item.id === id);
    if (!request) notFound('Solicitud no encontrada.');
    if (request.estado !== 'pendiente') badRequest('La solicitud ya fue procesada.');
    const username = request.username || uniqueGuestUsername(request.nombre, request.apellido);
    const temporaryPassword = crypto.randomBytes(18).toString('base64url');
    const user = await createUserUnlocked(actor, { username, password: temporaryPassword, role: 'invitado' });
    request.estado = 'aprobado';
    request.username = user.username;
    request.approvedBy = actor.username;
    request.approvedAt = new Date().toISOString();
    await persist();
    return {
      request: { ...request },
      credentials: { username: user.username, temporaryPassword }
    };
  });
}

async function listGuests() {
  const current = await loadState({ fresh: cfg.isVercel });
  return current.guestRequests.map(request => ({ ...request }));
}

module.exports = {
  ROLES, RANK, verifyLogin, createUser, deleteUser, changePassword, listUsers, findUser,
  requestGuest, approveGuest, listGuests, hashPassword, verifyPassword,
  _resetForTests: () => {
    state = null;
    loadPromise = null;
    mutationQueue = Promise.resolve();
    dummyHashPromise = null;
    devPasswordChecked = false;
  }
};
