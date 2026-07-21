// Persistencia JSON atomica y recuperable para la VPS.
const fs = require('fs');
const path = require('path');

function parseJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function fsyncDirectory(directory) {
  try {
    const fd = fs.openSync(directory, 'r');
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  } catch (_) {
    // Algunos sistemas de archivos no permiten fsync sobre directorios.
  }
}

function writePrimary(file, value, { backupCurrent = true } = {}) {
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(value, null, 2) + '\n';
  let fd;
  try {
    fd = fs.openSync(temp, 'wx', 0o600);
    fs.writeFileSync(fd, payload, 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd = null;
    if (backupCurrent && fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`);
    fs.renameSync(temp, file);
    try { fs.chmodSync(file, 0o600); } catch (_) { /* no-op */ }
    fsyncDirectory(directory);
  } catch (error) {
    if (fd != null) { try { fs.closeSync(fd); } catch (_) { /* no-op */ } }
    try { fs.rmSync(temp, { force: true }); } catch (_) { /* no-op */ }
    throw error;
  }
}

function readRecoverable(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return parseJsonFile(file);
  } catch (primaryError) {
    const backup = `${file}.bak`;
    if (!fs.existsSync(backup)) {
      const error = new Error(`No se pudo leer ${file} y no existe copia .bak.`);
      error.cause = primaryError;
      throw error;
    }
    try {
      const recovered = parseJsonFile(backup);
      const corrupt = `${file}.corrupt-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      try { fs.renameSync(file, corrupt); } catch (_) { /* conservar como sea posible */ }
      writePrimary(file, recovered, { backupCurrent: false });
      console.error(`[rayoboss] Se recupero ${path.basename(file)} desde la copia .bak.`);
      return recovered;
    } catch (backupError) {
      const error = new Error(`Tanto ${file} como su copia .bak estan corruptos.`);
      error.cause = backupError;
      throw error;
    }
  }
}

module.exports = { writePrimary, readRecoverable };
