const cfg = require('../../config');
const LocalDiskStorageProvider = require('./local-disk-storage-provider');
const VercelBlobStorageProvider = require('./vercel-blob-storage-provider');
const ReadOnlyStorageProvider = require('./read-only-storage-provider');
const { badRequest } = require('../../utils/errors');

let currentProvider = null;
let localProvider = null;
let blobProvider = null;

function createLocalProvider() {
  if (!cfg.storage.localRootDir) throw new Error('El proveedor local no está disponible en este entorno.');
  if (!localProvider) localProvider = new LocalDiskStorageProvider({
    rootDir: cfg.storage.localRootDir,
    publicBasePath: cfg.storage.localPublicPath
  });
  return localProvider;
}

function createBlobProvider() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN no está disponible.');
  if (!blobProvider) blobProvider = new VercelBlobStorageProvider({ token: process.env.BLOB_READ_WRITE_TOKEN });
  return blobProvider;
}

function createStorageProvider() {
  const requested = cfg.storage.provider;
  if (requested === 'local') {
    if (cfg.isVercel) throw new Error('[config] RAYOBOSS_STORAGE_PROVIDER=local no es válido en Vercel. Usa auto o vercel-blob.');
    return createLocalProvider();
  }
  if (requested === 'vercel-blob') return createBlobProvider();
  if (requested !== 'auto') throw new Error(`[config] Proveedor de almacenamiento no soportado: ${requested}`);

  if (cfg.isVercel) {
    return process.env.BLOB_READ_WRITE_TOKEN
      ? createBlobProvider()
      : new ReadOnlyStorageProvider({ reason: 'Crea y conecta un Vercel Blob Store público para habilitar cargas persistentes.' });
  }
  return createLocalProvider();
}

function getStorageProvider() {
  if (!currentProvider) currentProvider = createStorageProvider();
  return currentProvider;
}

function providerIdForItem(item) {
  return item?.provider || (item?.storage === 'local' ? 'local-disk' : item?.storage) || null;
}

function getProviderForItem(item) {
  const id = providerIdForItem(item);
  if (!id || item?.bundled) return null;
  if (id === 'local-disk' || id === 'local') return createLocalProvider();
  if (id === 'vercel-blob') {
    if (!process.env.BLOB_READ_WRITE_TOKEN) badRequest('No hay credenciales de Vercel Blob para eliminar este archivo.');
    return createBlobProvider();
  }
  badRequest(`Proveedor de almacenamiento desconocido en el catálogo: ${id}`);
}

async function deleteStoredObject(item) {
  const provider = getProviderForItem(item);
  if (!provider) return { deleted: false };
  return provider.deleteObject(item);
}

function resetForTests() {
  currentProvider = null;
  localProvider = null;
  blobProvider = null;
}

module.exports = { createStorageProvider, getStorageProvider, getProviderForItem, deleteStoredObject, providerIdForItem, _resetForTests: resetForTests };
