const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const StorageProvider = require('./storage-provider');
const { assertSafeStorageKey, encodePublicPath } = require('./storage-keys');

class LocalDiskStorageProvider extends StorageProvider {
  constructor({ rootDir, publicBasePath = '/media-files' }) {
    super({ id: 'local-disk', writable: true, uploadMode: 'server' });
    if (!rootDir) throw new Error('LocalDiskStorageProvider requiere rootDir.');
    this.rootDir = path.resolve(rootDir);
    this.publicBasePath = String(publicBasePath || '/media-files').replace(/\/$/, '');
    this.tempDir = path.join(this.rootDir, '.tmp');
    fs.mkdirSync(this.tempDir, { recursive: true, mode: 0o700 });
  }

  resolveKey(key) {
    const safeKey = assertSafeStorageKey(key);
    const fullPath = path.resolve(this.rootDir, ...safeKey.split('/'));
    const relative = path.relative(this.rootDir, fullPath);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Ruta local fuera del almacenamiento permitido.');
    return fullPath;
  }

  getServerUploadConfig() { return { tempDir: this.tempDir }; }

  async saveObject({ key, body, contentType = 'application/octet-stream', sizeBytes = null, originalName = null }) {
    const storageKey = assertSafeStorageKey(key);
    const destination = this.resolveKey(storageKey);
    await fsp.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    await fsp.writeFile(destination, body, { mode: 0o600 });
    const stat = await fsp.stat(destination);
    return {
      provider: this.id,
      storage: 'local',
      storageKey,
      url: await this.getPublicUrl(storageKey),
      localPath: destination,
      originalName,
      contentType,
      size: sizeBytes == null ? stat.size : sizeBytes
    };
  }

  async storeUploadedFile({ tempPath, originalName, contentType, sizeBytes, category }) {
    const storageKey = this.createStorageKey({ category, originalName });
    const destination = this.resolveKey(storageKey);
    await fsp.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    try {
      await fsp.rename(tempPath, destination);
    } catch (error) {
      if (error.code !== 'EXDEV') throw error;
      await fsp.copyFile(tempPath, destination);
      await fsp.rm(tempPath, { force: true });
    }
    try { await fsp.chmod(destination, 0o600); } catch (_) { /* no-op */ }
    return {
      provider: this.id,
      storage: 'local',
      storageKey,
      url: await this.getPublicUrl(storageKey),
      localPath: destination,
      originalName,
      contentType,
      size: sizeBytes
    };
  }

  async getObject(key) { return fsp.readFile(this.resolveKey(key)); }

  async getPublicUrl(key) {
    return `${this.publicBasePath}/${encodePublicPath(assertSafeStorageKey(key))}`;
  }

  async listObjects(prefix = 'rayoboss/') {
    const normalized = String(prefix || 'rayoboss/').replace(/^\/+/, '');
    const start = path.resolve(this.rootDir, ...normalized.split('/').filter(Boolean));
    const relative = path.relative(this.rootDir, start);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Prefijo local inválido.');
    const output = [];
    const walk = async directory => {
      let entries;
      try { entries = await fsp.readdir(directory, { withFileTypes: true }); }
      catch (error) { if (error.code === 'ENOENT') return; throw error; }
      for (const entry of entries) {
        if (entry.name === '.tmp') continue;
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) await walk(full);
        else if (entry.isFile()) {
          const stat = await fsp.stat(full);
          const key = path.relative(this.rootDir, full).split(path.sep).join('/');
          output.push({ key, url: await this.getPublicUrl(key), size: stat.size, uploadedAt: stat.mtime.toISOString(), provider: this.id });
        }
      }
    };
    await walk(start);
    return output;
  }

  async deleteObject(itemOrKey) {
    const key = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey?.storageKey;
    const legacyPath = typeof itemOrKey === 'object' ? itemOrKey?.localPath : null;
    let target;
    if (key) target = this.resolveKey(key);
    else if (legacyPath) {
      target = path.resolve(legacyPath);
      const relative = path.relative(this.rootDir, target);
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Archivo local fuera del almacenamiento permitido.');
    } else return { deleted: false };
    await fsp.rm(target, { force: true });
    return { deleted: true };
  }

  async exists(key) {
    try { await fsp.access(this.resolveKey(key)); return true; }
    catch (_) { return false; }
  }

  async getMetadata(key) {
    const storageKey = assertSafeStorageKey(key);
    const stat = await fsp.stat(this.resolveKey(storageKey));
    return { key: storageKey, url: await this.getPublicUrl(storageKey), size: stat.size, uploadedAt: stat.mtime.toISOString(), provider: this.id };
  }
}

module.exports = LocalDiskStorageProvider;
