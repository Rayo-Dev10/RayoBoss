const crypto = require('crypto');
const cfg = require('../config');
const runtimeStore = require('../utils/runtime-store');
const { badRequest, forbidden, notFound } = require('../utils/errors');

const localRooms = new Map();
let queue = Promise.resolve();

function key(broadcastId) { return `rtc-room:${broadcastId}`; }
function nowIso() { return new Date().toISOString(); }
function tokenHash(token) { return crypto.createHash('sha256').update(String(token)).digest('hex'); }
function sameToken(token, expectedHash) {
  const actual = Buffer.from(tokenHash(token), 'hex');
  const expected = Buffer.from(String(expectedHash || ''), 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
function initialRoom(liveStatus) {
  return {
    schemaVersion: 1,
    broadcastId: liveStatus.broadcastId,
    host: liveStatus.host,
    createdAt: nowIso(),
    clients: {},
    joins: [],
    inboxes: { host: [] }
  };
}

async function loadRoom(liveStatus, { create = true } = {}) {
  if (!liveStatus.live || !liveStatus.broadcastId) badRequest('No hay una transmision en vivo activa.');
  let room;
  if (cfg.isVercel) room = await runtimeStore.get(key(liveStatus.broadcastId));
  else room = localRooms.get(liveStatus.broadcastId);
  if (!room && create) room = initialRoom(liveStatus);
  if (!room) return null;
  if (room.host !== liveStatus.host) room.host = liveStatus.host;
  cleanup(room);
  return room;
}

async function saveRoom(room) {
  if (cfg.isVercel) {
    await runtimeStore.set(key(room.broadcastId), room, {
      ttl: cfg.rtc.roomTtlSeconds,
      name: `Sala WebRTC ${room.broadcastId}`,
      tags: [`rayoboss-rtc-${room.broadcastId}`]
    });
  } else {
    localRooms.set(room.broadcastId, room);
  }
}

function mutate(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

function cleanup(room) {
  const cutoff = Date.now() - cfg.rtc.clientTtlSeconds * 1000;
  for (const [id, client] of Object.entries(room.clients || {})) {
    if (Date.parse(client.lastSeen || client.joinedAt || 0) < cutoff) {
      delete room.clients[id];
      delete room.inboxes[id];
      room.joins = room.joins.filter(joinId => joinId !== id);
    }
  }
  for (const name of Object.keys(room.inboxes || {})) {
    room.inboxes[name] = (room.inboxes[name] || []).filter(item => Date.parse(item.createdAt) >= cutoff).slice(-100);
  }
}

function publicIceServers() {
  return cfg.rtc.iceServers.map(server => ({ ...server }));
}

function createClient(kind, identity, liveStatus) {
  return mutate(async () => {
    const room = await loadRoom(liveStatus);
    const currentCount = Object.values(room.clients).filter(client => client.kind === kind).length;
    const limit = kind === 'listener' ? cfg.rtc.maxListeners : cfg.rtc.maxParticipants;
    if (currentCount >= limit) badRequest(`Se alcanzo el limite de ${limit} ${kind === 'listener' ? 'oyentes WebRTC' : 'participantes'}.`);
    const id = crypto.randomBytes(12).toString('hex');
    const token = crypto.randomBytes(24).toString('base64url');
    room.clients[id] = {
      id,
      kind,
      username: identity.username || null,
      displayName: identity.displayName || identity.username || 'Oyente',
      tokenHash: tokenHash(token),
      joinedAt: nowIso(),
      lastSeen: nowIso()
    };
    room.inboxes[id] = [];
    room.joins.push(id);
    await saveRoom(room);
    return {
      connectionId: id,
      token,
      broadcastId: liveStatus.broadcastId,
      pollMs: cfg.rtc.pollMs,
      iceServers: publicIceServers(),
      turnConfigured: cfg.rtc.iceServers.some(server => String(server.urls).startsWith('turn'))
    };
  });
}

async function authorizeClient(room, connectionId, token) {
  const client = room.clients[connectionId];
  if (!client || !sameToken(token, client.tokenHash)) forbidden('Conexion WebRTC no autorizada.');
  client.lastSeen = nowIso();
  return client;
}

function assertHost(actor, liveStatus) {
  if (!liveStatus.live || liveStatus.host !== actor.username) forbidden('Solo quien inicio el vivo puede operar el estudio WebRTC.');
}

function pollHost(actor, liveStatus) {
  return mutate(async () => {
    assertHost(actor, liveStatus);
    const room = await loadRoom(liveStatus);
    const joins = room.joins.splice(0).map(id => room.clients[id]).filter(Boolean).map(client => ({
      id: client.id,
      kind: client.kind,
      username: client.username,
      displayName: client.displayName,
      joinedAt: client.joinedAt
    }));
    const signals = (room.inboxes.host || []).splice(0);
    await saveRoom(room);
    return { joins, signals, pollMs: cfg.rtc.pollMs, iceServers: publicIceServers() };
  });
}

function pollClient(connectionId, token, liveStatus) {
  return mutate(async () => {
    const room = await loadRoom(liveStatus, { create: false });
    if (!room) notFound('La sala WebRTC ya no existe.');
    await authorizeClient(room, connectionId, token);
    const signals = (room.inboxes[connectionId] || []).splice(0);
    await saveRoom(room);
    return { signals, live: true, pollMs: cfg.rtc.pollMs };
  });
}

function sanitizeSignal(signal) {
  if (!signal || typeof signal !== 'object' || Array.isArray(signal)) badRequest('Señal WebRTC invalida.');
  const type = String(signal.type || '');
  if (!['description', 'candidate', 'close'].includes(type)) badRequest('Tipo de señal WebRTC invalido.');
  const payload = signal.payload == null ? null : signal.payload;
  const serialized = JSON.stringify(payload);
  if (serialized.length > 100_000) badRequest('Señal WebRTC demasiado grande.');
  return { type, payload };
}

function signalFromHost(actor, targetId, signal, liveStatus) {
  return mutate(async () => {
    assertHost(actor, liveStatus);
    const room = await loadRoom(liveStatus);
    if (!room.clients[targetId]) notFound('Conexion WebRTC no encontrada.');
    const safe = sanitizeSignal(signal);
    room.inboxes[targetId].push({ from: 'host', ...safe, createdAt: nowIso() });
    await saveRoom(room);
    return true;
  });
}

function signalFromClient(connectionId, token, signal, liveStatus) {
  return mutate(async () => {
    const room = await loadRoom(liveStatus, { create: false });
    if (!room) notFound('La sala WebRTC ya no existe.');
    const client = await authorizeClient(room, connectionId, token);
    const safe = sanitizeSignal(signal);
    room.inboxes.host.push({ from: connectionId, kind: client.kind, username: client.username, ...safe, createdAt: nowIso() });
    await saveRoom(room);
    return true;
  });
}

function leaveClient(connectionId, token, liveStatus) {
  return mutate(async () => {
    const room = await loadRoom(liveStatus, { create: false });
    if (!room) return;
    await authorizeClient(room, connectionId, token);
    delete room.clients[connectionId];
    delete room.inboxes[connectionId];
    room.joins = room.joins.filter(id => id !== connectionId);
    room.inboxes.host.push({ from: connectionId, type: 'close', payload: null, createdAt: nowIso() });
    await saveRoom(room);
  });
}

function disconnectUsername(username, liveStatus) {
  return mutate(async () => {
    const room = await loadRoom(liveStatus, { create: false });
    if (!room) return;
    for (const [id, client] of Object.entries(room.clients)) {
      if (client.username !== username) continue;
      if (room.inboxes[id]) room.inboxes[id].push({ from: 'host', type: 'close', payload: null, createdAt: nowIso() });
      room.inboxes.host.push({ from: id, type: 'close', payload: null, createdAt: nowIso() });
      client.lastSeen = new Date(0).toISOString();
    }
    await saveRoom(room);
  });
}

async function closeRoom(broadcastId) {
  if (!broadcastId) return;
  if (cfg.isVercel) await runtimeStore.del(key(broadcastId));
  else localRooms.delete(broadcastId);
}

module.exports = {
  createClient, pollHost, pollClient, signalFromHost, signalFromClient,
  leaveClient, disconnectUsername, closeRoom, publicIceServers,
  _resetForTests: () => { localRooms.clear(); queue = Promise.resolve(); }
};
