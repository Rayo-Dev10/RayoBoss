const { buildStorageKey } = require('./storage-keys');

class StorageProvider {
  constructor({ id, writable, uploadMode }) {
    if (new.target === StorageProvider) throw new TypeError('StorageProvider es una interfaz abstracta.');
    this.id = id;
    this.writable = Boolean(writable);
    this.uploadMode = uploadMode || 'none';
  }

  describe() {
    return {
      provider: this.id,
      writable: this.writable,
      uploadMode: this.uploadMode,
      directUpload: this.uploadMode === 'direct',
      serverUpload: this.uploadMode === 'server'
    };
  }

  createStorageKey(input) { return buildStorageKey(input); }
  getServerUploadConfig() { return null; }
  async saveObject() { throw new Error(`${this.id}: saveObject() no implementado.`); }
  async storeUploadedFile() { throw new Error(`${this.id}: storeUploadedFile() no implementado.`); }
  async getObject() { throw new Error(`${this.id}: getObject() no implementado.`); }
  async getPublicUrl() { throw new Error(`${this.id}: getPublicUrl() no implementado.`); }
  async listObjects() { throw new Error(`${this.id}: listObjects() no implementado.`); }
  async deleteObject() { throw new Error(`${this.id}: deleteObject() no implementado.`); }
  async exists() { throw new Error(`${this.id}: exists() no implementado.`); }
  async getMetadata() { throw new Error(`${this.id}: getMetadata() no implementado.`); }
  async handleDirectUpload() { throw new Error(`${this.id}: handleDirectUpload() no implementado.`); }
}

module.exports = StorageProvider;
