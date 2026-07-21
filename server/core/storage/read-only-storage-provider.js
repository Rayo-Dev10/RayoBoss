const StorageProvider = require('./storage-provider');
const { badRequest } = require('../../utils/errors');

class ReadOnlyStorageProvider extends StorageProvider {
  constructor({ id = 'vercel-demo-readonly', reason = 'Almacenamiento persistente no configurado.' } = {}) {
    super({ id, writable: false, uploadMode: 'none' });
    this.reason = reason;
  }

  describe() { return { ...super.describe(), reason: this.reason }; }
  async saveObject() { badRequest(this.reason); }
  async storeUploadedFile() { badRequest(this.reason); }
  async deleteObject() { badRequest(this.reason); }
  async handleDirectUpload() { badRequest(this.reason); }
  async getObject() { badRequest(this.reason); }
  async getPublicUrl() { badRequest(this.reason); }
  async listObjects() { return []; }
  async exists() { return false; }
  async getMetadata() { badRequest(this.reason); }
}

module.exports = ReadOnlyStorageProvider;
