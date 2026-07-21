const crypto = require('crypto');
const cfg = require('../config');
const audio = require('./audio');
const runtimeStore = require('../utils/runtime-store');
const { badRequest } = require('../utils/errors');

const LIVE_KEY = 'live-state';
const localState = {
  live: false,
  broadcastId: null,
  startedAt: null,
  title: cfg.branding.autodjTitle,
  host: null,
  totalSessions: 0
};
let localListeners = 0;
const activeStreams = new Set();

function initialState() {
  return {
    live: false,
    broadcastId: null,
    startedAt: null,
    title: cfg.branding.autodjTitle,
    host: null,
    totalSessions: 0
  };
}

async function readState() {
  if (!cfg.isVercel) return localState;
  return (await runtimeStore.get(LIVE_KEY)) || initialState();
}

async function writeState(value) {
  if (!cfg.isVercel) {
    Object.assign(localState, value);
    return;
  }
  await runtimeStore.set(LIVE_KEY, value, {
    ttl: Math.max(cfg.rtc.roomTtlSeconds, 3600),
    name: 'Estado de emision RayoBoss',
    tags: ['rayoboss-live']
  });
}

async function goLive(actor, title) {
  const current = await readState();
  if (current.live && current.host !== actor.username) {
    badRequest(`Ya existe una transmision en vivo conducida por ${current.host}. Finalizala antes de iniciar otra.`);
  }
  const next = {
    ...current,
    live: true,
    broadcastId: current.live && current.broadcastId ? current.broadcastId : crypto.randomBytes(12).toString('hex'),
    startedAt: current.live && current.startedAt ? current.startedAt : new Date().toISOString(),
    host: actor.username,
    title: title || `En vivo con ${actor.username}`
  };
  await writeState(next);
  return formatStatus(next);
}

async function endLive() {
  const current = await readState();
  const endedBroadcastId = current.broadcastId;
  const next = {
    ...initialState(),
    totalSessions: current.totalSessions || 0
  };
  await writeState(next);
  return { status: formatStatus(next), endedBroadcastId };
}

async function attachListener(res) {
  const current = await readState();
  localListeners++;
  current.totalSessions = (current.totalSessions || 0) + 1;
  if (!cfg.isVercel) localState.totalSessions = current.totalSessions;
  const maxSeconds = cfg.isVercel ? cfg.audio.vercelSeconds : 0;
  let end;
  end = audio.streamTo(res, maxSeconds, {
    title: current.title,
    onClose: () => {
      localListeners = Math.max(0, localListeners - 1);
      activeStreams.delete(end);
    }
  });
  activeStreams.add(end);
  return end;
}

function shutdown() {
  for (const end of [...activeStreams]) end();
}

function autodjSlot(hour = new Date().getHours()) {
  for (const slot of cfg.autodj.slots || []) {
    if (hour >= slot.desdeHora && hour < slot.hastaHora) return { franja: slot.franja, playlist: slot.playlist };
  }
  return cfg.autodj.defecto || { franja: 'noche', playlist: 'Nocturna Institucional' };
}

function formatStatus(current) {
  return {
    live: Boolean(current.live),
    broadcastId: current.broadcastId || null,
    source: current.live ? 'live' : 'autodj',
    title: current.live ? current.title : cfg.branding.autodjTitle,
    host: current.live ? current.host : null,
    startedAt: current.live ? current.startedAt : null,
    listeners: localListeners,
    totalSessions: current.totalSessions || 0,
    autodj: autodjSlot(),
    latency: { frameMs: audio.FRAME_MS, sampleRate: audio.SR },
    rtc: {
      enabled: true,
      transport: 'webrtc-http-signaling',
      turnConfigured: cfg.rtc.iceServers.some(server => String(server.urls).startsWith('turn'))
    },
    mode: cfg.mode,
    version: cfg.version
  };
}

async function status() {
  return formatStatus(await readState());
}

module.exports = { goLive, endLive, attachListener, status, autodjSlot, shutdown, _readState: readState };
