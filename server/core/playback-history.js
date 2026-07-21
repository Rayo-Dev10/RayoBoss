const path = require('path');
const crypto = require('crypto');
const cfg = require('../config');
const runtimeStore = require('../utils/runtime-store');
const { writePrimary, readRecoverable } = require('../utils/storage');
const { badRequest } = require('../utils/errors');

const KEY = 'playback-history-v1';
const FILE = cfg.dataDir ? path.join(cfg.dataDir, 'playback-history.json') : null;
const RETENTION_MONTHS = 36;
const MAX_EVENTS = 100_000;
let localState = null;
let queue = Promise.resolve();

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function empty() { return { schemaVersion: 1, revision: 1, events: [] }; }
function validMonth(value) {
  const month = String(value || '').trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) badRequest('Mes inválido; usa AAAA-MM.');
  return month;
}
function monthOf(value) { return String(value).slice(0, 7); }
function retentionCutoff() {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCMonth(date.getUTCMonth() - RETENTION_MONTHS);
  return date.getTime();
}
function validate(state) {
  if (!state || state.schemaVersion !== 1 || !Array.isArray(state.events)) throw new Error('Histórico de reproducción inválido.');
  return state;
}
async function persist(state) {
  state.revision = (state.revision || 0) + 1;
  if (cfg.isVercel) {
    await runtimeStore.set(KEY, state, { ttl: 94_608_000, name: 'Histórico de reproducción RayoBoss', tags: ['rayoboss-playback'] });
  } else if (FILE) writePrimary(FILE, state);
}
async function load({ fresh = false } = {}) {
  if (localState && !fresh && !cfg.isVercel) return localState;
  let state = cfg.isVercel ? await runtimeStore.get(KEY) : (FILE ? readRecoverable(FILE) : null);
  if (!state) {
    state = empty();
    await persist(state);
  }
  validate(state);
  localState = state;
  return state;
}
function mutate(fn) {
  const execute = async () => {
    const state = await load({ fresh: cfg.isVercel });
    const outcome = await fn(state);
    if (outcome && outcome.changed === false) return outcome.result;
    const cutoff = retentionCutoff();
    state.events = state.events.filter(event => Date.parse(event.playedAt) >= cutoff).slice(-MAX_EVENTS);
    await persist(state);
    localState = state;
    return outcome && Object.prototype.hasOwnProperty.call(outcome, 'result') ? outcome.result : outcome;
  };
  const run = queue.then(execute, execute);
  queue = run.catch(() => {});
  return run;
}
function snapshot(item) {
  return {
    itemId: item.id,
    title: item.title,
    artist: item.artist || '',
    album: item.album || '',
    isrc: item.isrc || '',
    category: item.category,
    kind: item.kind,
    durationSeconds: Number(item.durationSeconds) || 0,
    licenseType: item.rights?.licenseType || 'pendiente',
    rightsBasis: item.rights?.basis || '',
    rightsReference: item.rights?.reference || '',
    licenseDocument: Boolean(item.rights?.document)
  };
}
function record(item, { source, playoutKey = '', playedAt = new Date().toISOString(), actor = null } = {}) {
  return mutate(async state => {
    const key = String(playoutKey || '').slice(0, 240);
    if (key) {
      const existing = state.events.find(event => event.playoutKey === key);
      if (existing) return { changed: false, result: { recorded: false, event: clone(existing) } };
    }
    const event = {
      id: crypto.randomBytes(12).toString('hex'),
      playoutKey: key || `manual:${crypto.randomBytes(16).toString('hex')}`,
      playedAt,
      source: String(source || 'autodj').slice(0, 40),
      recordedBy: actor?.username || 'sistema',
      ...snapshot(item)
    };
    state.events.push(event);
    return { changed: true, result: { recorded: true, event: clone(event) } };
  });
}
function recordAutodj(now) {
  if (!now?.item || !now.playoutKey) return Promise.resolve({ recorded: false, event: null });
  return record(now.item, { source: 'autodj', playoutKey: now.playoutKey, playedAt: now.startedAt || new Date().toISOString() });
}
async function report(monthInput) {
  const month = validMonth(monthInput);
  const state = await load({ fresh: cfg.isVercel });
  const events = state.events.filter(event => monthOf(event.playedAt) === month).sort((a, b) => a.playedAt.localeCompare(b.playedAt));
  const groups = new Map();
  for (const event of events) {
    const key = `${event.itemId}|${event.licenseType}`;
    let row = groups.get(key);
    if (!row) {
      row = {
        itemId: event.itemId,
        title: event.title,
        artist: event.artist,
        album: event.album,
        isrc: event.isrc,
        category: event.category,
        licenseType: event.licenseType,
        rightsBasis: event.rightsBasis,
        rightsReference: event.rightsReference,
        licenseDocument: event.licenseDocument,
        plays: 0,
        totalSeconds: 0,
        firstPlayedAt: event.playedAt,
        lastPlayedAt: event.playedAt
      };
      groups.set(key, row);
    }
    row.plays += 1;
    row.totalSeconds += Number(event.durationSeconds) || 0;
    row.lastPlayedAt = event.playedAt;
  }
  const items = [...groups.values()].sort((a, b) => b.plays - a.plays || a.title.localeCompare(b.title, 'es'));
  const byLicense = {};
  for (const row of items) byLicense[row.licenseType] = (byLicense[row.licenseType] || 0) + row.plays;
  return {
    month,
    generatedAt: new Date().toISOString(),
    totals: {
      plays: events.length,
      uniquePieces: items.length,
      totalSeconds: items.reduce((sum, item) => sum + item.totalSeconds, 0),
      byLicense
    },
    items,
    events: events.slice(-5000).reverse()
  };
}

module.exports = {
  record, recordAutodj, report, validMonth,
  _resetForTests: () => { localState = null; queue = Promise.resolve(); }
};
