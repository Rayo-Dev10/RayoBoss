// Almacen temporal compartido. En Vercel usa Runtime Cache; fuera de Vercel usa memoria.
const cfg = require('../config');

const memory = new Map();
let cachePromise = null;

async function vercelCache() {
  if (!cfg.isVercel) return null;
  if (!cachePromise) {
    cachePromise = import('@vercel/functions').then(({ getCache }) => getCache({
      // Se conserva el namespace 3.0.1 para que los despliegues 3.x lean el estado existente.
      namespace: 'rayoboss-3.0.1',
      namespaceSeparator: ':'
    }));
  }
  return cachePromise;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function purgeMemory(key) {
  const item = memory.get(key);
  if (!item) return null;
  if (item.expiresAt && item.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return clone(item.value);
}

async function get(key) {
  const cache = await vercelCache();
  if (cache) return clone(await cache.get(key));
  return purgeMemory(key);
}

async function set(key, value, options = {}) {
  const ttl = Number.isFinite(options.ttl) && options.ttl > 0 ? Math.floor(options.ttl) : undefined;
  const cache = await vercelCache();
  if (cache) {
    const cacheOptions = {};
    if (ttl) cacheOptions.ttl = ttl;
    if (options.name) cacheOptions.name = options.name;
    if (Array.isArray(options.tags) && options.tags.length) cacheOptions.tags = options.tags;
    await cache.set(key, clone(value), cacheOptions);
    return;
  }
  memory.set(key, {
    value: clone(value),
    expiresAt: ttl ? Date.now() + ttl * 1000 : null
  });
}

async function del(key) {
  const cache = await vercelCache();
  if (cache) return cache.delete(key);
  memory.delete(key);
}

function resetMemory() {
  memory.clear();
  cachePromise = null;
}

module.exports = { get, set, del, resetMemory };
