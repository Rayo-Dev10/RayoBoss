const path = require('path');
const crypto = require('crypto');
const cfg = require('../config');
const runtimeStore = require('../utils/runtime-store');
const { writePrimary, readRecoverable } = require('../utils/storage');
const { badRequest, notFound, forbidden } = require('../utils/errors');

const CATALOG_KEY = 'media-catalog-v302'; // Se conserva para no perder el catálogo al actualizar desde 3.0.2.
const CATALOG_FILE = cfg.dataDir ? path.join(cfg.dataDir, 'media-catalog.json') : null;
const CATEGORIES = Object.freeze({
  'autodj.libre': { label: 'Música libre y no restrictiva', scope: 'autodj', persistent: true },
  'autodj.sayco': { label: 'SAYCO-ACINPRO', scope: 'autodj', persistent: true, rightsRequired: true },
  'autodj.produccion': { label: 'Producción y continuidad', scope: 'autodj', persistent: true },
  'live.volatil': { label: 'Material temporal del vivo (24 horas)', scope: 'live', persistent: false, maxHours: 24 },
  'live.efectos': { label: 'Efectos de sonido', scope: 'live', persistent: true },
  'live.camas': { label: 'Camas y fondos musicales', scope: 'live', persistent: true }
});
let localCatalog = null;
let queue = Promise.resolve();

function nowIso() { return new Date().toISOString(); }
function id() { return crypto.randomBytes(12).toString('hex'); }
function seed() {
  return {
    schemaVersion: 1,
    revision: 1,
    items: [
      { id: 'demo-indie', title: 'Pieza independiente de demostración', category: 'autodj.libre', kind: 'audio', contentType: 'audio/mpeg', url: '/media/indie-demo.mp3', durationSeconds: 18, active: true, bundled: true, rights: { basis: 'Generación sintética propia para prueba', reference: 'RayoBoss 4.0.0' }, createdAt: nowIso() },
      { id: 'demo-graduacion', title: 'Ceremonia de graduación — video de prueba', category: 'autodj.libre', kind: 'video', contentType: 'video/mp4', url: '/media/graduacion-demo.mp4', durationSeconds: 12, active: true, bundled: true, rights: { basis: 'Video y audio sintéticos propios', reference: 'RayoBoss 4.0.0' }, createdAt: nowIso() },
      { id: 'demo-id', title: 'Identificador RayoBoss de prueba', category: 'autodj.produccion', subtype: 'identificador', kind: 'audio', contentType: 'audio/mpeg', url: '/media/identificador-demo.mp3', durationSeconds: 1, active: true, bundled: true, createdAt: nowIso() },
      { id: 'demo-cuna', title: 'Cuña institucional de prueba', category: 'autodj.produccion', subtype: 'cuna', kind: 'audio', contentType: 'audio/mpeg', url: '/media/cuna-demo.mp3', durationSeconds: 2.4, active: true, bundled: true, createdAt: nowIso() },
      { id: 'demo-bed', title: 'Cama musical de estudio', category: 'live.camas', kind: 'audio', contentType: 'audio/mpeg', url: '/media/cama-demo.mp3', durationSeconds: 20, active: true, bundled: true, createdAt: nowIso() },
      { id: 'demo-laugh', title: 'Efecto: reacción positiva', category: 'live.efectos', kind: 'audio', contentType: 'audio/mpeg', url: '/media/efecto-risa-demo.mp3', durationSeconds: 0.6, active: true, bundled: true, createdAt: nowIso() },
      { id: 'demo-suspense', title: 'Efecto: suspenso', category: 'live.efectos', kind: 'audio', contentType: 'audio/mpeg', url: '/media/efecto-suspenso-demo.mp3', durationSeconds: 2.5, active: true, bundled: true, createdAt: nowIso() }
    ]
  };
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function publicItem(item) { const copy = clone(item); delete copy.localPath; return copy; }
function cleanExpired(catalog) {
  const before = catalog.items.length;
  const now = Date.now();
  catalog.items = catalog.items.filter(item => !item.expiresAt || Date.parse(item.expiresAt) > now);
  return before !== catalog.items.length;
}
function validateCatalog(catalog) {
  if (!catalog || catalog.schemaVersion !== 1 || !Array.isArray(catalog.items)) throw new Error('Catálogo multimedia inválido.');
  for (const item of catalog.items) {
    if (!item || typeof item.id !== 'string' || !CATEGORIES[item.category] || !['audio', 'video'].includes(item.kind)) throw new Error('El catálogo contiene un elemento inválido.');
  }
  return catalog;
}
async function persist(catalog) {
  catalog.revision = (catalog.revision || 0) + 1;
  if (cfg.isVercel) {
    await runtimeStore.set(CATALOG_KEY, catalog, { ttl: 31_536_000, name: 'Catálogo multimedia RayoBoss', tags: ['rayoboss-media'] });
  } else if (CATALOG_FILE) writePrimary(CATALOG_FILE, catalog);
}
async function load({ fresh = false } = {}) {
  if (localCatalog && !fresh && !cfg.isVercel) return localCatalog;
  let catalog = cfg.isVercel ? await runtimeStore.get(CATALOG_KEY) : (CATALOG_FILE ? readRecoverable(CATALOG_FILE) : null);
  if (!catalog) { catalog = seed(); await persist(catalog); }
  validateCatalog(catalog);
  if (cleanExpired(catalog)) await persist(catalog);
  localCatalog = catalog;
  return catalog;
}
function mutate(fn) {
  const run = queue.then(async () => {
    const catalog = await load({ fresh: cfg.isVercel });
    const result = await fn(catalog);
    await persist(catalog);
    localCatalog = catalog;
    return result;
  }, async () => {
    const catalog = await load({ fresh: cfg.isVercel });
    const result = await fn(catalog);
    await persist(catalog);
    localCatalog = catalog;
    return result;
  });
  queue = run.catch(() => {});
  return run;
}
function text(value, name, max = 160) {
  const safe = String(value || '').trim();
  if (!safe || safe.length > max || /[<>]/.test(safe)) badRequest(`${name} inválido.`);
  return safe;
}
function normalizeMetadata(input, actor) {
  const category = String(input.category || '');
  const categoryInfo = CATEGORIES[category];
  if (!categoryInfo) badRequest('Categoría multimedia inválida.');
  const contentType = String(input.contentType || '').toLowerCase();
  if (!/^(audio|video)\//.test(contentType)) badRequest('Solo se permiten archivos de audio o video.');
  const kind = contentType.startsWith('video/') ? 'video' : 'audio';
  const rightsConfirmed = input.rightsConfirmed === true || input.rightsConfirmed === 'true';
  if (categoryInfo.rightsRequired && !rightsConfirmed) forbidden('Confirma que la emisora cuenta con autorización SAYCO-ACINPRO antes de incorporar la obra.');
  const durationSeconds = Number(input.durationSeconds);
  const createdAt = nowIso();
  return {
    id: id(), title: text(input.title, 'Título'), category, subtype: String(input.subtype || '').trim().slice(0, 40) || null,
    kind, contentType, durationSeconds: Number.isFinite(durationSeconds) && durationSeconds > 0 ? Math.min(durationSeconds, 86_400) : 30,
    active: true, bundled: false, uploadedBy: actor.username, createdAt,
    rights: {
      confirmed: rightsConfirmed,
      basis: String(input.rightsBasis || '').trim().slice(0, 240),
      reference: String(input.rightsReference || '').trim().slice(0, 240)
    },
    expiresAt: categoryInfo.maxHours ? new Date(Date.now() + categoryInfo.maxHours * 3600_000).toISOString() : null
  };
}
async function list(filters = {}) {
  const catalog = await load({ fresh: cfg.isVercel });
  return catalog.items.filter(item => (!filters.category || item.category === filters.category) && (filters.includeInactive || item.active)).map(publicItem);
}
async function get(itemId) {
  const catalog = await load({ fresh: cfg.isVercel });
  const item = catalog.items.find(entry => entry.id === itemId);
  if (!item) notFound('Elemento multimedia no encontrado.');
  return clone(item);
}
function addUploaded(actor, input, storage) {
  return mutate(async catalog => {
    const item = { ...normalizeMetadata(input, actor), ...storage };
    catalog.items.push(item);
    return publicItem(item);
  });
}
function update(actor, itemId, input) {
  return mutate(async catalog => {
    const item = catalog.items.find(entry => entry.id === itemId);
    if (!item) notFound('Elemento multimedia no encontrado.');
    if (input.title != null) item.title = text(input.title, 'Título');
    if (input.active != null) item.active = Boolean(input.active);
    if (input.durationSeconds != null) {
      const seconds = Number(input.durationSeconds);
      if (!Number.isFinite(seconds) || seconds <= 0) badRequest('Duración inválida.');
      item.durationSeconds = Math.min(seconds, 86_400);
    }
    item.updatedAt = nowIso(); item.updatedBy = actor.username;
    return publicItem(item);
  });
}
function remove(actor, itemId) {
  return mutate(async catalog => {
    const index = catalog.items.findIndex(entry => entry.id === itemId);
    if (index < 0) notFound('Elemento multimedia no encontrado.');
    const item = catalog.items[index];
    if (item.bundled) forbidden('Los recursos de demostración incluidos no se eliminan; pueden desactivarse.');
    catalog.items.splice(index, 1);
    return clone(item);
  });
}
function categories() { return clone(CATEGORIES); }

module.exports = { list, get, addUploaded, update, remove, categories, normalizeMetadata, _resetForTests: () => { localCatalog = null; queue = Promise.resolve(); } };
