const path = require('path');
const crypto = require('crypto');
const cfg = require('../config');
const runtimeStore = require('../utils/runtime-store');
const { writePrimary, readRecoverable } = require('../utils/storage');
const { badRequest, forbidden, notFound } = require('../utils/errors');

const FILE = cfg.dataDir ? path.join(cfg.dataDir, 'microphones.json') : null;
const CACHE_KEY = 'microphone-requests';
const ALLOWED_REQUEST_ROLES = ['invitado', 'periodista'];
let state = null;
let queue = Promise.resolve();

function initialState() {
  return { schemaVersion: 1, revision: 1, requests: [] };
}

function validate(candidate) {
  if (!candidate || candidate.schemaVersion !== 1 || !Array.isArray(candidate.requests)) {
    throw new Error('Formato de microphones.json invalido.');
  }
  candidate.revision = Number.isInteger(candidate.revision) ? candidate.revision : 1;
  return candidate;
}

async function load({ fresh = false } = {}) {
  if (state && !fresh && !cfg.isVercel) return state;
  let candidate;
  if (cfg.isVercel) candidate = await runtimeStore.get(CACHE_KEY);
  else if (FILE) candidate = readRecoverable(FILE);
  state = candidate ? validate(candidate) : initialState();
  if (!candidate) await save();
  return state;
}

async function save() {
  state.revision = (state.revision || 0) + 1;
  if (cfg.isVercel) {
    await runtimeStore.set(CACHE_KEY, state, {
      ttl: 7 * 24 * 3600,
      name: 'Solicitudes de microfono RayoBoss',
      tags: ['rayoboss-microphones']
    });
  } else if (FILE) {
    writePrimary(FILE, state);
  }
}

function mutate(fn) {
  const run = queue.then(async () => {
    await load({ fresh: cfg.isVercel });
    return fn();
  }, async () => {
    await load({ fresh: cfg.isVercel });
    return fn();
  });
  queue = run.catch(() => {});
  return run;
}

function activeFor(request, liveStatus) {
  return liveStatus.live && request.broadcastId === liveStatus.broadcastId && !['revoked', 'expired'].includes(request.state);
}

function publicRequest(request) {
  return { ...request };
}

function createRequest({ username, role, displayName, accessRequestId = null }, liveStatus) {
  if (!liveStatus.live || !liveStatus.broadcastId) badRequest('Solo se puede solicitar microfono durante una transmision en vivo.');
  if (!ALLOWED_REQUEST_ROLES.includes(role)) forbidden('Tu rol no puede solicitar microfono.');
  const duplicate = state.requests.find(item =>
    item.broadcastId === liveStatus.broadcastId && item.username === username && !['revoked', 'expired'].includes(item.state));
  if (duplicate) return duplicate;
  const request = {
    id: crypto.randomBytes(10).toString('hex'),
    broadcastId: liveStatus.broadcastId,
    username,
    role,
    displayName: String(displayName || username).slice(0, 130),
    accessRequestId,
    state: 'requested',
    testStatus: 'not_started',
    createdAt: new Date().toISOString()
  };
  state.requests.push(request);
  if (state.requests.length > 1000) state.requests.splice(0, state.requests.length - 1000);
  return request;
}

function requestForActor(actor, liveStatus) {
  return mutate(async () => {
    const request = createRequest({ username: actor.username, role: actor.role, displayName: actor.username }, liveStatus);
    await save();
    return publicRequest(request);
  });
}

function requestForGuestAccess(guestRequest, liveStatus) {
  return mutate(async () => {
    if (!liveStatus.live) return null;
    const request = createRequest({
      username: guestRequest.username,
      role: 'invitado',
      displayName: `${guestRequest.nombre} ${guestRequest.apellido}`,
      accessRequestId: guestRequest.id
    }, liveStatus);
    await save();
    return publicRequest(request);
  });
}

async function listAll(liveStatus) {
  const current = await load({ fresh: cfg.isVercel });
  return current.requests
    .map(request => ({ ...request, active: activeFor(request, liveStatus) }))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function forUser(username, liveStatus) {
  const current = await load({ fresh: cfg.isVercel });
  const request = current.requests.find(item => item.username === username && activeFor(item, liveStatus));
  return request ? publicRequest(request) : null;
}

function approveTest(actor, id, liveStatus) {
  return mutate(async () => {
    if (!['desarrollador', 'administrador'].includes(actor.role)) forbidden('Solo un administrador puede aprobar pruebas de microfono.');
    const request = state.requests.find(item => item.id === id);
    if (!request) notFound('Solicitud de microfono no encontrada.');
    if (!activeFor(request, liveStatus)) badRequest('La solicitud no pertenece al vivo actual.');
    if (request.state === 'live_approved') return publicRequest(request);
    request.state = 'test_approved';
    request.testApprovedBy = actor.username;
    request.testApprovedAt = new Date().toISOString();
    await save();
    return publicRequest(request);
  });
}

function approveLive(actor, id, liveStatus) {
  return mutate(async () => {
    if (!['desarrollador', 'administrador'].includes(actor.role)) forbidden('Solo un administrador puede aprobar el microfono al aire.');
    const request = state.requests.find(item => item.id === id);
    if (!request) notFound('Solicitud de microfono no encontrada.');
    if (!activeFor(request, liveStatus)) badRequest('La solicitud no pertenece al vivo actual.');
    request.state = 'live_approved';
    request.liveApprovedBy = actor.username;
    request.liveApprovedAt = new Date().toISOString();
    await save();
    return publicRequest(request);
  });
}

function reportTest(actor, result, liveStatus) {
  return mutate(async () => {
    const request = state.requests.find(item => item.username === actor.username && activeFor(item, liveStatus));
    if (!request) notFound('No existe una solicitud de microfono activa.');
    if (!['test_approved', 'live_approved'].includes(request.state)) forbidden('La prueba de microfono aun no fue autorizada.');
    request.testStatus = result === 'ready' ? 'ready' : 'failed';
    request.testReportedAt = new Date().toISOString();
    await save();
    return publicRequest(request);
  });
}

function revoke(actor, id) {
  return mutate(async () => {
    if (!['desarrollador', 'administrador'].includes(actor.role)) forbidden('Solo un administrador puede revocar el microfono.');
    const request = state.requests.find(item => item.id === id);
    if (!request) notFound('Solicitud de microfono no encontrada.');
    request.state = 'revoked';
    request.revokedBy = actor.username;
    request.revokedAt = new Date().toISOString();
    await save();
    return publicRequest(request);
  });
}

function expireBroadcast(broadcastId) {
  if (!broadcastId) return Promise.resolve();
  return mutate(async () => {
    let changed = false;
    for (const request of state.requests) {
      if (request.broadcastId === broadcastId && !['revoked', 'expired'].includes(request.state)) {
        request.state = 'expired';
        request.expiredAt = new Date().toISOString();
        changed = true;
      }
    }
    if (changed) await save();
  });
}

async function canJoinLive(username, liveStatus) {
  const request = await forUser(username, liveStatus);
  return Boolean(request && request.state === 'live_approved');
}

module.exports = {
  requestForActor, requestForGuestAccess, listAll, forUser,
  approveTest, approveLive, reportTest, revoke, expireBroadcast, canJoinLive,
  _resetForTests: () => { state = null; queue = Promise.resolve(); }
};
