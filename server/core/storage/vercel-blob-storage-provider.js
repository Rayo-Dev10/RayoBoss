const StorageProvider = require('./storage-provider');
const { assertSafeStorageKey } = require('./storage-keys');
const { badRequest } = require('../../utils/errors');

class VercelBlobStorageProvider extends StorageProvider {
  constructor({ token }) {
    super({ id: 'vercel-blob', writable: Boolean(token), uploadMode: token ? 'direct' : 'none' });
    if (!token) throw new Error('VercelBlobStorageProvider requiere BLOB_READ_WRITE_TOKEN.');
    this.token = token;
  }

  async saveObject({ key, body, contentType = 'application/octet-stream', sizeBytes = null, originalName = null }) {
    const storageKey = assertSafeStorageKey(key);
    const { put } = await import('@vercel/blob');
    const blob = await put(storageKey, body, {
      access: 'public',
      contentType,
      token: this.token,
      addRandomSuffix: false
    });
    return {
      provider: this.id,
      storage: 'vercel-blob',
      storageKey: blob.pathname || storageKey,
      pathname: blob.pathname || storageKey,
      url: blob.url,
      originalName,
      contentType: blob.contentType || contentType,
      size: blob.size == null ? sizeBytes : blob.size
    };
  }

  async getObject(key) {
    const metadata = await this.getMetadata(key);
    const response = await fetch(metadata.url);
    if (!response.ok) throw new Error(`No se pudo leer el objeto Blob (${response.status}).`);
    return Buffer.from(await response.arrayBuffer());
  }

  async getPublicUrl(key) { return (await this.getMetadata(key)).url; }

  async listObjects(prefix = 'rayoboss/') {
    const { list } = await import('@vercel/blob');
    const output = [];
    let cursor;
    do {
      const result = await list({ prefix, cursor, limit: 1000, token: this.token });
      output.push(...result.blobs.map(blob => ({
        key: blob.pathname,
        url: blob.url,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
        provider: this.id
      })));
      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor && output.length < 10_000);
    return output;
  }

  async deleteObject(itemOrKey) {
    const target = typeof itemOrKey === 'string'
      ? itemOrKey
      : (itemOrKey?.url || itemOrKey?.storageKey || itemOrKey?.pathname);
    if (!target) return { deleted: false };
    const { del } = await import('@vercel/blob');
    await del(target, { token: this.token });
    return { deleted: true };
  }

  async exists(key) {
    try { await this.getMetadata(key); return true; }
    catch (_) { return false; }
  }

  async getMetadata(key) {
    const storageKey = assertSafeStorageKey(key);
    const { head } = await import('@vercel/blob');
    const blob = await head(storageKey, { token: this.token });
    return {
      key: blob.pathname || storageKey,
      url: blob.url,
      size: blob.size,
      contentType: blob.contentType,
      uploadedAt: blob.uploadedAt,
      provider: this.id
    };
  }

  async handleDirectUpload({ req, body, getActor, authorizeUpload }) {
    const { handleUpload } = await import('@vercel/blob/client');
    return handleUpload({
      body,
      request: req,
      token: this.token,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const actor = await getActor(req);
        let payload;
        try { payload = JSON.parse(clientPayload || '{}'); }
        catch (_) { badRequest('Metadatos de carga inválidos.'); }
        const storageKey = assertSafeStorageKey(pathname);
        if (payload.storageKey !== storageKey) badRequest('La ruta de carga no coincide con la autorización.');
        const authorization = await authorizeUpload({ actor, storageKey, payload });
        return {
          allowedContentTypes: [authorization.contentType],
          maximumSizeInBytes: authorization.maximumSizeInBytes,
          addRandomSuffix: false,
          cacheControlMaxAge: 60
        };
      }
    });
  }
}

module.exports = VercelBlobStorageProvider;
