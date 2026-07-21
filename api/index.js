// RayoBoss 4.0.1 - bundle Vercel generado; no editar manualmente.
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// config/default.json
var require_default = __commonJS({
  "config/default.json"(exports2, module2) {
    module2.exports = {
      server: {
        port: 3e3,
        jsonLimit: "200kb",
        sessionHours: 12,
        trustProxy: "loopback, linklocal, uniquelocal",
        cookieSecure: "auto"
      },
      auth: {
        devUsername: "dev",
        minPasswordLength: 12,
        maxPasswordLength: 256,
        loginMaxAttempts: 10,
        loginWindowMinutes: 10,
        scryptN: 131072,
        scryptR: 8,
        scryptP: 1,
        scryptMaxmemMb: 256
      },
      audio: {
        sampleRate: 22050,
        frameMs: 200,
        gain: 0.7,
        vercelSeconds: 90
      },
      autodj: {
        slots: [
          {
            desdeHora: 5,
            hastaHora: 10,
            franja: "manana",
            playlist: "Amanecer UNIOC"
          },
          {
            desdeHora: 10,
            hastaHora: 14,
            franja: "mediodia",
            playlist: "Campus al Aire"
          },
          {
            desdeHora: 14,
            hastaHora: 19,
            franja: "tarde",
            playlist: "Tarde Academica"
          }
        ],
        defecto: {
          franja: "noche",
          playlist: "Nocturna Institucional"
        }
      },
      branding: {
        stationName: "RayoBoss | UNIOC Radio",
        autodjTitle: "AutoDJ - Continuidad UNIOC Radio"
      },
      rtc: {
        pollMs: 900,
        roomTtlSeconds: 900,
        clientTtlSeconds: 180,
        maxParticipants: 8,
        maxListeners: 40,
        stunUrls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302"
        ]
      },
      storage: {
        provider: "auto",
        localPublicPath: "/media-files"
      }
    };
  }
});

// server/config.js
var require_config = __commonJS({
  "server/config.js"(exports2, module2) {
    var path = require("path");
    var file = require_default();
    function envInt(name, fallback) {
      const value = Number.parseInt(process.env[name], 10);
      return Number.isFinite(value) ? value : fallback;
    }
    function envFloat(name, fallback) {
      const value = Number.parseFloat(process.env[name]);
      return Number.isFinite(value) ? value : fallback;
    }
    function envString(name, fallback = "") {
      const value = process.env[name];
      return value == null ? fallback : String(value).trim();
    }
    function assert(condition, message) {
      if (!condition) throw new Error(`[config] ${message}`);
    }
    function isPowerOfTwo(value) {
      return Number.isInteger(value) && value > 0 && (value & value - 1) === 0;
    }
    var isVercel = Boolean(process.env.VERCEL);
    var isProduction = process.env.NODE_ENV === "production" || isVercel;
    var devPassword = envString("RAYOBOSS_DEV_PASSWORD");
    var secret = envString("RAYOBOSS_SECRET");
    var frameMs = envInt("RAYOBOSS_FRAME_MS", file.audio.frameMs);
    var sampleRate = envInt("RAYOBOSS_SAMPLE_RATE", file.audio.sampleRate);
    var scryptN = envInt("RAYOBOSS_SCRYPT_N", file.auth.scryptN);
    var cookieSecure = envString("RAYOBOSS_COOKIE_SECURE", file.server.cookieSecure).toLowerCase();
    assert(
      devPassword.length >= file.auth.minPasswordLength,
      `RAYOBOSS_DEV_PASSWORD es obligatoria y debe tener al menos ${file.auth.minPasswordLength} caracteres.`
    );
    assert(
      devPassword.length <= file.auth.maxPasswordLength,
      `RAYOBOSS_DEV_PASSWORD supera ${file.auth.maxPasswordLength} caracteres.`
    );
    assert(secret.length >= 32, "RAYOBOSS_SECRET es obligatorio y debe tener al menos 32 caracteres.");
    assert(
      ["auto", "always", "never"].includes(cookieSecure),
      "RAYOBOSS_COOKIE_SECURE debe ser auto, always o never."
    );
    assert(sampleRate >= 8e3 && sampleRate <= 48e3, "RAYOBOSS_SAMPLE_RATE debe estar entre 8000 y 48000.");
    assert(frameMs >= 50 && frameMs <= 1e3, "RAYOBOSS_FRAME_MS debe estar entre 50 y 1000.");
    assert(
      6e3 % frameMs === 0,
      "RAYOBOSS_FRAME_MS debe dividir exactamente el ciclo de 6000 ms (por ejemplo: 50, 60, 75, 100, 120, 125, 150, 200, 250, 300, 375, 400, 500, 600, 750 o 1000)."
    );
    assert(
      isPowerOfTwo(scryptN) && scryptN >= 16384 && scryptN <= 1048576,
      "RAYOBOSS_SCRYPT_N debe ser potencia de 2 entre 16384 y 1048576."
    );
    var trustProxyRaw = envString("RAYOBOSS_TRUST_PROXY", isVercel ? "1" : file.server.trustProxy);
    var trustProxy = /^\d+$/.test(trustProxyRaw) ? Number(trustProxyRaw) : trustProxyRaw;
    var dataDirEnv = envString("RAYOBOSS_DATA_DIR");
    var dataDir = isVercel ? null : dataDirEnv ? path.resolve(dataDirEnv) : path.join(__dirname, "..", "data");
    var storageProvider = envString("RAYOBOSS_STORAGE_PROVIDER", "auto").toLowerCase();
    var allowedOrigins = envString("RAYOBOSS_ALLOWED_ORIGINS").split(",").map((x) => x.trim()).filter(Boolean);
    var cfg = {
      isVercel,
      isProduction,
      mode: isVercel ? "vercel-poc" : "vps-local",
      version: "4.0.1",
      server: {
        port: envInt("PORT", file.server.port),
        jsonLimit: envString("RAYOBOSS_JSON_LIMIT", file.server.jsonLimit),
        sessionHours: envInt("RAYOBOSS_SESSION_HOURS", file.server.sessionHours),
        trustProxy,
        cookieSecure,
        allowedOrigins
      },
      auth: {
        devUsername: file.auth.devUsername,
        devPassword,
        secret,
        minPasswordLength: envInt("RAYOBOSS_MIN_PASSWORD", file.auth.minPasswordLength),
        maxPasswordLength: envInt("RAYOBOSS_MAX_PASSWORD", file.auth.maxPasswordLength),
        loginMaxAttempts: envInt("RAYOBOSS_LOGIN_MAX", file.auth.loginMaxAttempts),
        loginWindowMinutes: envInt("RAYOBOSS_LOGIN_WINDOW", file.auth.loginWindowMinutes),
        scryptN,
        scryptR: envInt("RAYOBOSS_SCRYPT_R", file.auth.scryptR),
        scryptP: envInt("RAYOBOSS_SCRYPT_P", file.auth.scryptP),
        scryptMaxmem: envInt("RAYOBOSS_SCRYPT_MAXMEM_MB", file.auth.scryptMaxmemMb) * 1024 * 1024
      },
      audio: {
        sampleRate,
        frameMs,
        gain: Math.min(1, Math.max(0, envFloat("RAYOBOSS_GAIN", file.audio.gain))),
        vercelSeconds: Math.min(290, Math.max(60, envInt("RAYOBOSS_LIVE_SECONDS", file.audio.vercelSeconds)))
      },
      rtc: {
        pollMs: Math.min(3e3, Math.max(400, envInt("RAYOBOSS_RTC_POLL_MS", file.rtc.pollMs))),
        roomTtlSeconds: Math.min(3600, Math.max(300, envInt("RAYOBOSS_RTC_ROOM_TTL", file.rtc.roomTtlSeconds))),
        clientTtlSeconds: Math.min(600, Math.max(60, envInt("RAYOBOSS_RTC_CLIENT_TTL", file.rtc.clientTtlSeconds))),
        maxParticipants: Math.min(20, Math.max(1, envInt("RAYOBOSS_RTC_MAX_PARTICIPANTS", file.rtc.maxParticipants))),
        maxListeners: Math.min(100, Math.max(1, envInt("RAYOBOSS_RTC_MAX_LISTENERS", file.rtc.maxListeners))),
        iceServers: (() => {
          const servers = [{ urls: file.rtc.stunUrls }];
          const turnUrl = envString("RAYOBOSS_TURN_URL");
          const turnUsername = envString("RAYOBOSS_TURN_USERNAME");
          const turnCredential = envString("RAYOBOSS_TURN_CREDENTIAL");
          if (turnUrl) servers.push({ urls: turnUrl, username: turnUsername, credential: turnCredential });
          return servers;
        })()
      },
      autodj: file.autodj,
      media: {
        maxUploadBytes: Math.min(5 * 1024 * 1024 * 1024, Math.max(1024 * 1024, envInt("RAYOBOSS_MAX_UPLOAD_MB", 500) * 1024 * 1024))
      },
      storage: {
        provider: storageProvider,
        localRootDir: dataDir ? path.join(dataDir, "media") : null,
        localPublicPath: envString("RAYOBOSS_LOCAL_MEDIA_PATH", "/media-files")
      },
      public: {
        audioUrl: envString("RAYOBOSS_PUBLIC_AUDIO_URL"),
        videoUrl: envString("RAYOBOSS_PUBLIC_VIDEO_URL"),
        hlsUrl: envString("RAYOBOSS_PUBLIC_HLS_URL")
      },
      branding: file.branding,
      dataDir
    };
    assert(
      ["auto", "local", "vercel-blob"].includes(cfg.storage.provider),
      "RAYOBOSS_STORAGE_PROVIDER debe ser auto, local o vercel-blob."
    );
    assert(
      cfg.server.sessionHours >= 1 && cfg.server.sessionHours <= 168,
      "RAYOBOSS_SESSION_HOURS debe estar entre 1 y 168."
    );
    assert(
      cfg.auth.minPasswordLength >= 10 && cfg.auth.minPasswordLength <= cfg.auth.maxPasswordLength,
      "Longitud minima de contrase\xF1a invalida."
    );
    assert(cfg.auth.scryptR >= 1 && cfg.auth.scryptR <= 32, "RAYOBOSS_SCRYPT_R invalido.");
    assert(cfg.auth.scryptP >= 1 && cfg.auth.scryptP <= 16, "RAYOBOSS_SCRYPT_P invalido.");
    assert(
      128 * cfg.auth.scryptN * cfg.auth.scryptR < cfg.auth.scryptMaxmem,
      "RAYOBOSS_SCRYPT_MAXMEM_MB es insuficiente para los parametros scrypt elegidos."
    );
    module2.exports = cfg;
  }
});

// server/core/sessions.js
var require_sessions = __commonJS({
  "server/core/sessions.js"(exports2, module2) {
    var crypto = require("crypto");
    var cfg = require_config();
    function b64u(value) {
      return Buffer.from(value).toString("base64url");
    }
    function signature(payload) {
      return crypto.createHmac("sha256", cfg.auth.secret).update(payload).digest();
    }
    function createSession(user) {
      const now = Date.now();
      const payload = b64u(JSON.stringify({
        u: user.username,
        r: user.role,
        sv: Number(user.sessionVersion || 1),
        iat: now,
        exp: now + cfg.server.sessionHours * 3600 * 1e3
      }));
      return `${payload}.${signature(payload).toString("base64url")}`;
    }
    function getSession(token) {
      if (typeof token !== "string" || token.length < 20 || token.length > 4096) return null;
      const split = token.lastIndexOf(".");
      if (split < 1) return null;
      const payload = token.slice(0, split);
      let supplied;
      try {
        supplied = Buffer.from(token.slice(split + 1), "base64url");
      } catch (_) {
        return null;
      }
      const expected = signature(payload);
      if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
      let data;
      try {
        data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      } catch (_) {
        return null;
      }
      const now = Date.now();
      const maxLife = cfg.server.sessionHours * 3600 * 1e3 + 6e4;
      if (!data || typeof data.u !== "string" || typeof data.r !== "string") return null;
      if (!Number.isInteger(data.sv) || data.sv < 1) return null;
      if (!Number.isFinite(data.iat) || !Number.isFinite(data.exp)) return null;
      if (data.iat > now + 6e4 || data.exp <= now || data.exp - data.iat > maxLife) return null;
      return { username: data.u, role: data.r, sessionVersion: data.sv, exp: data.exp };
    }
    module2.exports = { createSession, getSession };
  }
});

// server/utils/runtime-store.js
var require_runtime_store = __commonJS({
  "server/utils/runtime-store.js"(exports2, module2) {
    var cfg = require_config();
    var memory = /* @__PURE__ */ new Map();
    var cachePromise = null;
    async function vercelCache() {
      if (!cfg.isVercel) return null;
      if (!cachePromise) {
        cachePromise = import("@vercel/functions").then(({ getCache }) => getCache({
          // Namespace estable para compartir el estado temporal entre invocaciones y redeploys.
          namespace: "rayoboss",
          namespaceSeparator: ":"
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
      const ttl = Number.isFinite(options.ttl) && options.ttl > 0 ? Math.floor(options.ttl) : void 0;
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
        expiresAt: ttl ? Date.now() + ttl * 1e3 : null
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
    module2.exports = { get, set, del, resetMemory };
  }
});

// server/utils/storage.js
var require_storage = __commonJS({
  "server/utils/storage.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    function parseJsonFile(file) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
    function fsyncDirectory(directory) {
      try {
        const fd = fs.openSync(directory, "r");
        try {
          fs.fsyncSync(fd);
        } finally {
          fs.closeSync(fd);
        }
      } catch (_) {
      }
    }
    function writePrimary(file, value, { backupCurrent = true } = {}) {
      const directory = path.dirname(file);
      fs.mkdirSync(directory, { recursive: true, mode: 448 });
      const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
      const payload = JSON.stringify(value, null, 2) + "\n";
      let fd;
      try {
        fd = fs.openSync(temp, "wx", 384);
        fs.writeFileSync(fd, payload, "utf8");
        fs.fsyncSync(fd);
        fs.closeSync(fd);
        fd = null;
        if (backupCurrent && fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`);
        fs.renameSync(temp, file);
        try {
          fs.chmodSync(file, 384);
        } catch (_) {
        }
        fsyncDirectory(directory);
      } catch (error) {
        if (fd != null) {
          try {
            fs.closeSync(fd);
          } catch (_) {
          }
        }
        try {
          fs.rmSync(temp, { force: true });
        } catch (_) {
        }
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
          const corrupt = `${file}.corrupt-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}`;
          try {
            fs.renameSync(file, corrupt);
          } catch (_) {
          }
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
    module2.exports = { writePrimary, readRecoverable };
  }
});

// server/utils/errors.js
var require_errors = __commonJS({
  "server/utils/errors.js"(exports2, module2) {
    var AppError = class extends Error {
      constructor(message, status = 400, expose = true) {
        super(message);
        this.name = "AppError";
        this.status = status;
        this.expose = expose;
      }
    };
    function badRequest(message) {
      throw new AppError(message, 400, true);
    }
    function forbidden(message = "Sin permiso para esta accion.") {
      throw new AppError(message, 403, true);
    }
    function notFound(message = "Recurso no encontrado.") {
      throw new AppError(message, 404, true);
    }
    module2.exports = { AppError, badRequest, forbidden, notFound };
  }
});

// server/core/users.js
var require_users = __commonJS({
  "server/core/users.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    var crypto = require("crypto");
    var cfg = require_config();
    var runtimeStore = require_runtime_store();
    var { writePrimary, readRecoverable } = require_storage();
    var { badRequest, forbidden, notFound } = require_errors();
    var ROLES = ["desarrollador", "administrador", "locutor", "periodista", "invitado", "anonimo", "solo_lectura"];
    var RANK = Object.fromEntries(ROLES.map((role, index) => [role, ROLES.length - index]));
    var STATE_FILE = cfg.dataDir ? path.join(cfg.dataDir, "state.json") : null;
    var V2_USERS_FILE = cfg.dataDir ? path.join(cfg.dataDir, "users.json") : null;
    var VERCEL_STATE_KEY = "users-state";
    var state = null;
    var loadPromise = null;
    var mutationQueue = Promise.resolve();
    var dummyHashPromise = null;
    var devPasswordChecked = false;
    function normalizeScryptOptions(n = cfg.auth.scryptN, r = cfg.auth.scryptR, p = cfg.auth.scryptP) {
      if (!Number.isInteger(n) || n < 16384 || n > 1048576 || (n & n - 1) !== 0) return null;
      if (!Number.isInteger(r) || r < 1 || r > 32) return null;
      if (!Number.isInteger(p) || p < 1 || p > 16) return null;
      return { N: n, r, p, maxmem: Math.max(cfg.auth.scryptMaxmem, 128 * n * r + 1024 * 1024) };
    }
    function hashPassword(password) {
      const options = normalizeScryptOptions();
      return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16);
        crypto.scrypt(String(password), salt, 32, options, (error, key) => {
          if (error) return reject(error);
          resolve(`scrypt$${options.N}$${options.r}$${options.p}$${salt.toString("hex")}$${key.toString("hex")}`);
        });
      });
    }
    function parseStoredHash(stored) {
      const parts = String(stored || "").split("$");
      if (parts[0] !== "scrypt") return null;
      if (parts.length === 4) {
        const options2 = normalizeScryptOptions(Number(parts[1]), 8, 1);
        return options2 ? { options: options2, saltHex: parts[2], keyHex: parts[3] } : null;
      }
      if (parts.length !== 6) return null;
      const options = normalizeScryptOptions(Number(parts[1]), Number(parts[2]), Number(parts[3]));
      return options ? { options, saltHex: parts[4], keyHex: parts[5] } : null;
    }
    function verifyPassword(password, stored) {
      return new Promise((resolve) => {
        const parsed = parseStoredHash(stored);
        if (!parsed || !/^[0-9a-f]{32}$/i.test(parsed.saltHex) || !/^[0-9a-f]{64}$/i.test(parsed.keyHex)) return resolve(false);
        crypto.scrypt(String(password), Buffer.from(parsed.saltHex, "hex"), 32, parsed.options, (error, key) => {
          if (error) return resolve(false);
          const expected = Buffer.from(parsed.keyHex, "hex");
          resolve(expected.length === key.length && crypto.timingSafeEqual(expected, key));
        });
      });
    }
    async function seedState() {
      return {
        schemaVersion: 3,
        revision: 1,
        users: [{
          username: cfg.auth.devUsername,
          passwordHash: await hashPassword(cfg.auth.devPassword),
          role: "desarrollador",
          protected: true,
          sessionVersion: 1,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }],
        guestRequests: []
      };
    }
    function validateState(candidate) {
      if (!candidate || candidate.schemaVersion !== 3 || !Array.isArray(candidate.users) || !Array.isArray(candidate.guestRequests)) {
        throw new Error("Formato de state.json invalido.");
      }
      candidate.revision = Number.isInteger(candidate.revision) && candidate.revision > 0 ? candidate.revision : 1;
      const seen = /* @__PURE__ */ new Set();
      for (const user of candidate.users) {
        if (!user || !/^[a-zA-Z0-9._-]{2,32}$/.test(user.username) || !ROLES.includes(user.role)) {
          throw new Error("state.json contiene un usuario invalido.");
        }
        if (seen.has(user.username)) throw new Error("state.json contiene usuarios duplicados.");
        seen.add(user.username);
        if (!parseStoredHash(user.passwordHash)) throw new Error(`Hash invalido para ${user.username}.`);
        user.sessionVersion = Number.isInteger(user.sessionVersion) && user.sessionVersion > 0 ? user.sessionVersion : 1;
      }
      if (!candidate.users.some((user) => user.username === cfg.auth.devUsername && user.protected && user.role === "desarrollador")) {
        throw new Error("state.json no contiene el usuario desarrollador protegido.");
      }
      for (const request of candidate.guestRequests) {
        if (!request || typeof request.id !== "string") throw new Error("state.json contiene una solicitud de invitado invalida.");
        if (request.username && !/^[a-zA-Z0-9._-]{2,32}$/.test(request.username)) {
          throw new Error("state.json contiene un usuario temporal invalido.");
        }
      }
      return candidate;
    }
    async function persist(candidate = state) {
      candidate.revision = (candidate.revision || 0) + 1;
      if (cfg.isVercel) {
        await runtimeStore.set(VERCEL_STATE_KEY, candidate, {
          name: "Usuarios y solicitudes RayoBoss",
          tags: ["rayoboss-users"]
        });
      } else if (STATE_FILE) {
        writePrimary(STATE_FILE, candidate);
      }
    }
    async function migrateV2() {
      if (!V2_USERS_FILE || !fs.existsSync(V2_USERS_FILE)) return null;
      const users = readRecoverable(V2_USERS_FILE);
      if (!Array.isArray(users)) throw new Error("users.json de v2 no es un arreglo valido.");
      const migrated = {
        schemaVersion: 3,
        revision: 1,
        users: users.map((user) => ({ ...user, sessionVersion: 1 })),
        guestRequests: []
      };
      validateState(migrated);
      await persist(migrated);
      const archive = path.join(cfg.dataDir, `users.v2-migrated-${Date.now()}.json`);
      try {
        fs.copyFileSync(V2_USERS_FILE, archive);
      } catch (_) {
      }
      console.log("[rayoboss] users.json de v2 migrado a data/state.json.");
      return migrated;
    }
    async function readStoredState() {
      if (cfg.isVercel) return runtimeStore.get(VERCEL_STATE_KEY);
      if (!STATE_FILE) return null;
      return readRecoverable(STATE_FILE);
    }
    async function synchronizeDevPassword(candidate) {
      if (devPasswordChecked && !cfg.isVercel) return false;
      const dev = candidate.users.find((user) => user.username === cfg.auth.devUsername);
      if (!dev) return false;
      const matches = await verifyPassword(cfg.auth.devPassword, dev.passwordHash);
      devPasswordChecked = true;
      if (matches) return false;
      dev.passwordHash = await hashPassword(cfg.auth.devPassword);
      dev.sessionVersion = (dev.sessionVersion || 1) + 1;
      dev.passwordChangedAt = (/* @__PURE__ */ new Date()).toISOString();
      console.log("[rayoboss] La contrase\xF1a de dev se sincronizo automaticamente con RAYOBOSS_DEV_PASSWORD.");
      return true;
    }
    async function loadState({ fresh = false } = {}) {
      if (state && !fresh && !cfg.isVercel) return state;
      if (loadPromise && !fresh) return loadPromise;
      const loader = (async () => {
        let candidate = await readStoredState();
        if (candidate) candidate = validateState(candidate);
        if (!candidate) candidate = await migrateV2();
        if (!candidate) {
          candidate = await seedState();
          await persist(candidate);
        }
        if (await synchronizeDevPassword(candidate)) await persist(candidate);
        state = candidate;
        return state;
      })();
      if (!fresh) loadPromise = loader;
      try {
        return await loader;
      } finally {
        if (!fresh) loadPromise = null;
      }
    }
    function serializeMutation(fn) {
      const run = mutationQueue.then(async () => {
        await loadState({ fresh: cfg.isVercel });
        return fn();
      }, async () => {
        await loadState({ fresh: cfg.isVercel });
        return fn();
      });
      mutationQueue = run.catch(() => {
      });
      return run;
    }
    function validatePassword(password) {
      if (typeof password !== "string") badRequest("La contrase\xF1a debe ser texto.");
      if (password.length < cfg.auth.minPasswordLength) badRequest(`La contrase\xF1a debe tener al menos ${cfg.auth.minPasswordLength} caracteres.`);
      if (password.length > cfg.auth.maxPasswordLength) badRequest(`La contrase\xF1a no puede superar ${cfg.auth.maxPasswordLength} caracteres.`);
    }
    function validateUsername(username) {
      username = String(username || "").trim();
      if (!/^[a-zA-Z0-9._-]{2,32}$/.test(username)) badRequest("Nombre de usuario invalido (2-32 caracteres: letras, numeros, punto, guion o guion bajo).");
      return username;
    }
    function publicUser(user) {
      return {
        username: user.username,
        role: user.role,
        protected: Boolean(user.protected),
        sessionVersion: user.sessionVersion,
        createdAt: user.createdAt
      };
    }
    async function findUser(username) {
      const current = await loadState({ fresh: cfg.isVercel });
      return current.users.find((user) => user.username === username) || null;
    }
    async function verifyLogin(username, password) {
      const safeUsername = typeof username === "string" ? username.trim() : "";
      const safePassword = typeof password === "string" && password.length <= cfg.auth.maxPasswordLength ? password : "";
      const user = await findUser(safeUsername);
      if (!dummyHashPromise) dummyHashPromise = hashPassword("dummy-password-never-used");
      if (!user) {
        await verifyPassword(safePassword, await dummyHashPromise);
        return null;
      }
      return await verifyPassword(safePassword, user.passwordHash) ? user : null;
    }
    async function createUserUnlocked(actor, input) {
      const username = validateUsername(input.username);
      validatePassword(input.password);
      const role = String(input.role || "");
      if (!ROLES.includes(role)) badRequest("Rol invalido.");
      if (state.users.some((user2) => user2.username === username)) badRequest("El usuario ya existe.");
      if (actor.role !== "desarrollador") {
        if (actor.role !== "administrador") forbidden("Sin permiso para crear usuarios.");
        if (role === "desarrollador") forbidden("Un administrador no puede crear desarrolladores.");
      }
      const user = {
        username,
        passwordHash: await hashPassword(input.password),
        role,
        protected: false,
        sessionVersion: 1,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      state.users.push(user);
      return user;
    }
    function createUser(actor, input) {
      return serializeMutation(async () => {
        const user = await createUserUnlocked(actor, input || {});
        await persist();
        return publicUser(user);
      });
    }
    function deleteUser(actor, username) {
      return serializeMutation(async () => {
        const user = state.users.find((item) => item.username === username);
        if (!user) notFound("Usuario no encontrado.");
        if (user.protected) forbidden("El usuario dev esta protegido y no puede eliminarse.");
        if (actor.username === username) forbidden("No puedes eliminar tu propia cuenta.");
        if (actor.role !== "desarrollador") forbidden("Solo el desarrollador puede eliminar usuarios.");
        state.users = state.users.filter((item) => item.username !== username);
        await persist();
        return true;
      });
    }
    function changePassword(actor, username, newPassword) {
      return serializeMutation(async () => {
        const user = state.users.find((item) => item.username === username);
        if (!user) notFound("Usuario no encontrado.");
        const self = actor.username === username;
        const canAdmin = actor.role === "administrador" && RANK[actor.role] > RANK[user.role];
        if (!self && actor.role !== "desarrollador" && !canAdmin) forbidden("Sin permiso para cambiar esta contrase\xF1a.");
        validatePassword(newPassword);
        user.passwordHash = await hashPassword(newPassword);
        user.sessionVersion = (user.sessionVersion || 1) + 1;
        user.passwordChangedAt = (/* @__PURE__ */ new Date()).toISOString();
        await persist();
        return true;
      });
    }
    async function listUsers() {
      const current = await loadState({ fresh: cfg.isVercel });
      return current.users.map(publicUser);
    }
    function validatePersonName(value, label) {
      value = String(value || "").trim().replace(/\s+/g, " ");
      if (!/^[\p{L}\p{M} .'-]{1,60}$/u.test(value)) badRequest(`${label} contiene caracteres no permitidos.`);
      return value;
    }
    function slug(value) {
      return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
    }
    function uniqueGuestUsername(nombre, apellido) {
      const base = `${slug(nombre).split(".")[0] || "invitado"}.${slug(apellido).split(".")[0] || "unioc"}`.slice(0, 26);
      const reserved = /* @__PURE__ */ new Set([
        ...state.users.map((user) => user.username),
        ...state.guestRequests.map((request) => request.username).filter(Boolean)
      ]);
      let candidate = base;
      let suffix = 1;
      while (reserved.has(candidate)) {
        candidate = `${base.slice(0, 28 - String(suffix).length)}${suffix++}`;
      }
      return candidate;
    }
    function requestGuest(nombre, apellido) {
      return serializeMutation(async () => {
        const safeNombre = validatePersonName(nombre, "Nombre");
        const safeApellido = validatePersonName(apellido, "Apellido");
        const request = {
          id: crypto.randomBytes(8).toString("hex"),
          nombre: safeNombre,
          apellido: safeApellido,
          username: uniqueGuestUsername(safeNombre, safeApellido),
          estado: "pendiente",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        state.guestRequests.push(request);
        if (state.guestRequests.length > 500) state.guestRequests.shift();
        await persist();
        return { ...request };
      });
    }
    function approveGuest(actor, id) {
      return serializeMutation(async () => {
        if (!["desarrollador", "administrador"].includes(actor.role)) forbidden("Sin permiso para aprobar invitados.");
        const request = state.guestRequests.find((item) => item.id === id);
        if (!request) notFound("Solicitud no encontrada.");
        if (request.estado !== "pendiente") badRequest("La solicitud ya fue procesada.");
        const username = request.username || uniqueGuestUsername(request.nombre, request.apellido);
        const temporaryPassword = crypto.randomBytes(18).toString("base64url");
        const user = await createUserUnlocked(actor, { username, password: temporaryPassword, role: "invitado" });
        request.estado = "aprobado";
        request.username = user.username;
        request.approvedBy = actor.username;
        request.approvedAt = (/* @__PURE__ */ new Date()).toISOString();
        await persist();
        return {
          request: { ...request },
          credentials: { username: user.username, temporaryPassword }
        };
      });
    }
    async function listGuests() {
      const current = await loadState({ fresh: cfg.isVercel });
      return current.guestRequests.map((request) => ({ ...request }));
    }
    module2.exports = {
      ROLES,
      RANK,
      verifyLogin,
      createUser,
      deleteUser,
      changePassword,
      listUsers,
      findUser,
      requestGuest,
      approveGuest,
      listGuests,
      hashPassword,
      verifyPassword,
      _resetForTests: () => {
        state = null;
        loadPromise = null;
        mutationQueue = Promise.resolve();
        dummyHashPromise = null;
        devPasswordChecked = false;
      }
    };
  }
});

// server/middleware/security.js
var require_security = __commonJS({
  "server/middleware/security.js"(exports2, module2) {
    var cfg = require_config();
    var sessions = require_sessions();
    var users = require_users();
    function securityHeaders(req, res, next) {
      const embed = req.path === "/embed" || req.path === "/embed.html";
      res.set("X-Content-Type-Options", "nosniff");
      if (!embed) res.set("X-Frame-Options", "DENY");
      res.set("Referrer-Policy", embed ? "strict-origin-when-cross-origin" : "no-referrer");
      res.set("Permissions-Policy", "camera=(self), microphone=(self), display-capture=(self), autoplay=(self), geolocation=(), payment=(), usb=()");
      res.set("Cross-Origin-Opener-Policy", embed ? "unsafe-none" : "same-origin");
      res.set("Content-Security-Policy", [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "media-src 'self' blob: data: https:",
        "connect-src 'self' blob: https:",
        "object-src 'none'",
        "base-uri 'none'",
        embed ? "frame-ancestors *" : "frame-ancestors 'none'",
        "form-action 'self'"
      ].join("; "));
      if (req.secure) res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
      next();
    }
    function sameOrigin(req, res, next) {
      if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
      const origin = req.get("origin");
      if (!origin) return next();
      const expected = `${req.protocol}://${req.get("host")}`;
      if (origin !== expected && !cfg.server.allowedOrigins.includes(origin)) {
        return res.status(403).json({ error: "Origen no permitido." });
      }
      next();
    }
    var attempts = /* @__PURE__ */ new Map();
    function clientIp(req) {
      return req.ip || req.socket.remoteAddress || "unknown";
    }
    function aliveAttempts(ip, now = Date.now()) {
      const cutoff = now - cfg.auth.loginWindowMinutes * 60 * 1e3;
      return (attempts.get(ip) || []).filter((time) => time > cutoff);
    }
    setInterval(() => {
      for (const ip of attempts.keys()) {
        const alive = aliveAttempts(ip);
        if (alive.length) attempts.set(ip, alive);
        else attempts.delete(ip);
      }
    }, 6e4).unref();
    function loginLimiter(req, res, next) {
      const current = aliveAttempts(clientIp(req));
      if (current.length >= cfg.auth.loginMaxAttempts) {
        return res.status(429).json({ error: "Demasiados intentos fallidos. Espera unos minutos." });
      }
      next();
    }
    function recordLoginFailure(req) {
      const ip = clientIp(req);
      const current = aliveAttempts(ip);
      current.push(Date.now());
      attempts.set(ip, current);
    }
    function clearLoginAttempts(req) {
      attempts.delete(clientIp(req));
    }
    function getToken(req) {
      const cookies = req.headers.cookie || "";
      const match = cookies.match(/(?:^|;\s*)rb_session=([^;]+)/);
      if (!match) return null;
      try {
        return decodeURIComponent(match[1]);
      } catch (_) {
        return null;
      }
    }
    function shouldSecureCookie(req) {
      if (cfg.server.cookieSecure === "always") return true;
      if (cfg.server.cookieSecure === "never") return false;
      return Boolean(req.secure || cfg.isVercel);
    }
    function setSessionCookie(req, res, token) {
      const secure = shouldSecureCookie(req) ? "; Secure" : "";
      res.set("Set-Cookie", `rb_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${cfg.server.sessionHours * 3600}; Priority=High${secure}`);
    }
    function clearSessionCookie(req, res) {
      const secure = shouldSecureCookie(req) ? "; Secure" : "";
      res.set("Set-Cookie", `rb_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0; Priority=High${secure}`);
    }
    function asyncRoute(handler) {
      return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
    }
    function auth(...roles) {
      return asyncRoute(async (req, res, next) => {
        const session = sessions.getSession(getToken(req));
        if (!session) return res.status(401).json({ error: "Sesion requerida." });
        const current = await users.findUser(session.username);
        if (!current || current.role !== session.role || current.sessionVersion !== session.sessionVersion) {
          clearSessionCookie(req, res);
          return res.status(401).json({ error: "La sesion ya no es valida. Ingresa nuevamente." });
        }
        if (roles.length && !roles.includes(current.role)) return res.status(403).json({ error: "Sin permiso para esta accion." });
        req.actor = { username: current.username, role: current.role, sessionVersion: current.sessionVersion };
        next();
      });
    }
    module2.exports = {
      securityHeaders,
      sameOrigin,
      loginLimiter,
      recordLoginFailure,
      clearLoginAttempts,
      getToken,
      setSessionCookie,
      clearSessionCookie,
      auth,
      asyncRoute,
      _resetRateLimiterForTests: () => attempts.clear()
    };
  }
});

// server/core/audio.js
var require_audio = __commonJS({
  "server/core/audio.js"(exports2, module2) {
    var cfg = require_config();
    var SR = cfg.audio.sampleRate;
    var FRAME_MS = cfg.audio.frameMs;
    var CYCLE_SECONDS = 6;
    var CYCLE_MS = CYCLE_SECONDS * 1e3;
    var TOTAL_FRAMES = CYCLE_MS / FRAME_MS;
    var SCALE = [261.63, 293.66, 329.63, 392, 440, 523.25];
    function wavHeader() {
      const header = Buffer.alloc(44);
      header.write("RIFF", 0);
      header.writeUInt32LE(4294967295, 4);
      header.write("WAVE", 8);
      header.write("fmt ", 12);
      header.writeUInt32LE(16, 16);
      header.writeUInt16LE(1, 20);
      header.writeUInt16LE(1, 22);
      header.writeUInt32LE(SR, 24);
      header.writeUInt32LE(SR * 2, 28);
      header.writeUInt16LE(2, 32);
      header.writeUInt16LE(16, 34);
      header.write("data", 36);
      header.writeUInt32LE(4294967295, 40);
      return header;
    }
    var frameCache = [];
    function buildCache() {
      if (frameCache.length) return;
      for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
        const sampleStart = Math.round(frame * SR * FRAME_MS / 1e3);
        const sampleEnd = Math.round((frame + 1) * SR * FRAME_MS / 1e3);
        const sampleCount = sampleEnd - sampleStart;
        const buffer = Buffer.alloc(sampleCount * 2);
        for (let i = 0; i < sampleCount; i++) {
          const globalSample = sampleStart + i;
          const tGlobal = globalSample / SR;
          const second = Math.floor(tGlobal) % CYCLE_SECONDS;
          const t = tGlobal - Math.floor(tGlobal);
          const f1 = SCALE[second];
          const f2 = SCALE[(second + 2) % SCALE.length] / 2;
          const envelope = Math.min(1, t * 8) * Math.min(1, (1 - t) * 4);
          const sample = 0.28 * Math.sin(2 * Math.PI * f1 * t) + 0.14 * Math.sin(2 * Math.PI * f2 * t);
          buffer.writeInt16LE(Math.round(sample * envelope * 32767 * cfg.audio.gain), i * 2);
        }
        frameCache.push(buffer);
      }
    }
    buildCache();
    function currentFrameIndex(now = Date.now()) {
      return Math.floor(now / FRAME_MS) % frameCache.length;
    }
    function streamTo(res, maxSeconds, meta = {}) {
      res.writeHead(200, {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Accept-Ranges": "none",
        "Connection": "keep-alive",
        "icy-name": cfg.branding.stationName,
        "icy-description": String(meta.title || "").replace(/[^\x20-\x7E]/g, " ").trim() || "RayoBoss",
        "Access-Control-Allow-Origin": "*"
      });
      if (typeof res.flushHeaders === "function") res.flushHeaders();
      if (res.socket && typeof res.socket.setNoDelay === "function") res.socket.setNoDelay(true);
      res.write(wavHeader());
      let sent = 0;
      const frameLimit = maxSeconds > 0 ? Math.max(1, Math.floor(maxSeconds * 1e3 / FRAME_MS)) : null;
      let closed = false;
      let timer = null;
      let deadlineTimer = null;
      const startedAt = Date.now();
      const end = () => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        clearTimeout(deadlineTimer);
        if (typeof meta.onClose === "function") meta.onClose();
        try {
          res.end();
        } catch (_) {
        }
      };
      if (maxSeconds > 0) deadlineTimer = setTimeout(end, Math.max(1, Math.round(maxSeconds * 1e3)));
      const tick = () => {
        if (closed) return;
        if (frameLimit !== null && sent >= frameLimit) return end();
        const frame = frameCache[currentFrameIndex()];
        const ok = res.write(frame);
        sent++;
        const nextAt = startedAt + sent * FRAME_MS;
        const schedule = () => {
          if (!closed) timer = setTimeout(tick, Math.max(0, nextAt - Date.now()));
        };
        if (ok) schedule();
        else res.once("drain", schedule);
      };
      tick();
      res.on("close", end);
      res.on("error", end);
      return end;
    }
    module2.exports = {
      streamTo,
      wavHeader,
      frameCache,
      FRAME_MS,
      currentFrameIndex,
      SR,
      CYCLE_SECONDS,
      TOTAL_FRAMES,
      get totalCachedSamples() {
        return frameCache.reduce((sum, frame) => sum + frame.length / 2, 0);
      }
    };
  }
});

// server/core/live.js
var require_live = __commonJS({
  "server/core/live.js"(exports2, module2) {
    var crypto = require("crypto");
    var cfg = require_config();
    var audio = require_audio();
    var runtimeStore = require_runtime_store();
    var { badRequest } = require_errors();
    var LIVE_KEY = "live-state";
    var localState = {
      live: false,
      broadcastId: null,
      startedAt: null,
      title: cfg.branding.autodjTitle,
      host: null,
      totalSessions: 0
    };
    var localListeners = 0;
    var activeStreams = /* @__PURE__ */ new Set();
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
      return await runtimeStore.get(LIVE_KEY) || initialState();
    }
    async function writeState(value) {
      if (!cfg.isVercel) {
        Object.assign(localState, value);
        return;
      }
      await runtimeStore.set(LIVE_KEY, value, {
        ttl: Math.max(cfg.rtc.roomTtlSeconds, 3600),
        name: "Estado de emision RayoBoss",
        tags: ["rayoboss-live"]
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
        broadcastId: current.live && current.broadcastId ? current.broadcastId : crypto.randomBytes(12).toString("hex"),
        startedAt: current.live && current.startedAt ? current.startedAt : (/* @__PURE__ */ new Date()).toISOString(),
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
    function autodjSlot(hour = (/* @__PURE__ */ new Date()).getHours()) {
      for (const slot of cfg.autodj.slots || []) {
        if (hour >= slot.desdeHora && hour < slot.hastaHora) return { franja: slot.franja, playlist: slot.playlist };
      }
      return cfg.autodj.defecto || { franja: "noche", playlist: "Nocturna Institucional" };
    }
    function formatStatus(current) {
      return {
        live: Boolean(current.live),
        broadcastId: current.broadcastId || null,
        source: current.live ? "live" : "autodj",
        title: current.live ? current.title : cfg.branding.autodjTitle,
        host: current.live ? current.host : null,
        startedAt: current.live ? current.startedAt : null,
        listeners: localListeners,
        totalSessions: current.totalSessions || 0,
        autodj: autodjSlot(),
        latency: { frameMs: audio.FRAME_MS, sampleRate: audio.SR },
        rtc: {
          enabled: true,
          transport: "webrtc-http-signaling",
          turnConfigured: cfg.rtc.iceServers.some((server) => String(server.urls).startsWith("turn"))
        },
        mode: cfg.mode,
        version: cfg.version
      };
    }
    async function status() {
      return formatStatus(await readState());
    }
    module2.exports = { goLive, endLive, attachListener, status, autodjSlot, shutdown, _readState: readState };
  }
});

// server/utils/validation.js
var require_validation = __commonJS({
  "server/utils/validation.js"(exports2, module2) {
    var { badRequest } = require_errors();
    function objectBody(req) {
      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) badRequest("Cuerpo JSON invalido.");
      return req.body;
    }
    function text(value, name, { min = 0, max = 200, trim = true } = {}) {
      if (typeof value !== "string") badRequest(`${name} debe ser texto.`);
      const result = trim ? value.trim() : value;
      if (result.length < min) badRequest(`${name} debe tener al menos ${min} caracteres.`);
      if (result.length > max) badRequest(`${name} no puede superar ${max} caracteres.`);
      return result;
    }
    module2.exports = { objectBody, text };
  }
});

// server/routes/auth.js
var require_auth = __commonJS({
  "server/routes/auth.js"(exports2, module2) {
    var router = require("express").Router();
    var users = require_users();
    var sessions = require_sessions();
    var validation = require_validation();
    var {
      loginLimiter,
      recordLoginFailure,
      clearLoginAttempts,
      setSessionCookie,
      clearSessionCookie,
      auth,
      asyncRoute
    } = require_security();
    router.post("/login", loginLimiter, asyncRoute(async (req, res) => {
      const body = validation.objectBody(req);
      const username = validation.text(body.username, "Usuario", { min: 1, max: 64 });
      const password = validation.text(body.password, "Contrase\xF1a", { min: 1, max: 256, trim: false });
      const user = await users.verifyLogin(username, password);
      if (!user) {
        recordLoginFailure(req);
        return res.status(401).json({ error: "Usuario o contrase\xF1a incorrectos." });
      }
      clearLoginAttempts(req);
      setSessionCookie(req, res, sessions.createSession(user));
      res.json({ ok: true, user: { username: user.username, role: user.role } });
    }));
    router.post("/logout", (req, res) => {
      clearSessionCookie(req, res);
      res.json({ ok: true });
    });
    router.get("/me", auth(), (req, res) => res.json({ user: req.actor }));
    module2.exports = router;
  }
});

// server/core/microphones.js
var require_microphones = __commonJS({
  "server/core/microphones.js"(exports2, module2) {
    var path = require("path");
    var crypto = require("crypto");
    var cfg = require_config();
    var runtimeStore = require_runtime_store();
    var { writePrimary, readRecoverable } = require_storage();
    var { badRequest, forbidden, notFound } = require_errors();
    var FILE = cfg.dataDir ? path.join(cfg.dataDir, "microphones.json") : null;
    var CACHE_KEY = "microphone-requests";
    var ALLOWED_REQUEST_ROLES = ["invitado", "periodista"];
    var state = null;
    var queue = Promise.resolve();
    function initialState() {
      return { schemaVersion: 1, revision: 1, requests: [] };
    }
    function validate(candidate) {
      if (!candidate || candidate.schemaVersion !== 1 || !Array.isArray(candidate.requests)) {
        throw new Error("Formato de microphones.json invalido.");
      }
      candidate.revision = Number.isInteger(candidate.revision) ? candidate.revision : 1;
      return candidate;
    }
    async function load({ fresh = false } = {}) {
      if (state && !fresh && !cfg.isVercel) return state;
      let candidate;
      if (cfg.isVercel) candidate = await runtimeStore.get(CACHE_KEY);
      else if (FILE) candidate = readRecoverable(FILE);
      state = candidate ? validate(candidate) : initialState();
      if (!candidate) await save();
      return state;
    }
    async function save() {
      state.revision = (state.revision || 0) + 1;
      if (cfg.isVercel) {
        await runtimeStore.set(CACHE_KEY, state, {
          ttl: 7 * 24 * 3600,
          name: "Solicitudes de microfono RayoBoss",
          tags: ["rayoboss-microphones"]
        });
      } else if (FILE) {
        writePrimary(FILE, state);
      }
    }
    function mutate(fn) {
      const run = queue.then(async () => {
        await load({ fresh: cfg.isVercel });
        return fn();
      }, async () => {
        await load({ fresh: cfg.isVercel });
        return fn();
      });
      queue = run.catch(() => {
      });
      return run;
    }
    function activeFor(request, liveStatus) {
      return liveStatus.live && request.broadcastId === liveStatus.broadcastId && !["revoked", "expired"].includes(request.state);
    }
    function publicRequest(request) {
      return { ...request };
    }
    function createRequest({ username, role, displayName, accessRequestId = null }, liveStatus) {
      if (!liveStatus.live || !liveStatus.broadcastId) badRequest("Solo se puede solicitar microfono durante una transmision en vivo.");
      if (!ALLOWED_REQUEST_ROLES.includes(role)) forbidden("Tu rol no puede solicitar microfono.");
      const duplicate = state.requests.find((item) => item.broadcastId === liveStatus.broadcastId && item.username === username && !["revoked", "expired"].includes(item.state));
      if (duplicate) return duplicate;
      const request = {
        id: crypto.randomBytes(10).toString("hex"),
        broadcastId: liveStatus.broadcastId,
        username,
        role,
        displayName: String(displayName || username).slice(0, 130),
        accessRequestId,
        state: "requested",
        testStatus: "not_started",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      state.requests.push(request);
      if (state.requests.length > 1e3) state.requests.splice(0, state.requests.length - 1e3);
      return request;
    }
    function requestForActor(actor, liveStatus) {
      return mutate(async () => {
        const request = createRequest({ username: actor.username, role: actor.role, displayName: actor.username }, liveStatus);
        await save();
        return publicRequest(request);
      });
    }
    function requestForGuestAccess(guestRequest, liveStatus) {
      return mutate(async () => {
        if (!liveStatus.live) return null;
        const request = createRequest({
          username: guestRequest.username,
          role: "invitado",
          displayName: `${guestRequest.nombre} ${guestRequest.apellido}`,
          accessRequestId: guestRequest.id
        }, liveStatus);
        await save();
        return publicRequest(request);
      });
    }
    async function listAll(liveStatus) {
      const current = await load({ fresh: cfg.isVercel });
      return current.requests.map((request) => ({ ...request, active: activeFor(request, liveStatus) })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    }
    async function forUser(username, liveStatus) {
      const current = await load({ fresh: cfg.isVercel });
      const request = current.requests.find((item) => item.username === username && activeFor(item, liveStatus));
      return request ? publicRequest(request) : null;
    }
    function approveTest(actor, id, liveStatus) {
      return mutate(async () => {
        if (!["desarrollador", "administrador"].includes(actor.role)) forbidden("Solo un administrador puede aprobar pruebas de microfono.");
        const request = state.requests.find((item) => item.id === id);
        if (!request) notFound("Solicitud de microfono no encontrada.");
        if (!activeFor(request, liveStatus)) badRequest("La solicitud no pertenece al vivo actual.");
        if (request.state === "live_approved") return publicRequest(request);
        request.state = "test_approved";
        request.testApprovedBy = actor.username;
        request.testApprovedAt = (/* @__PURE__ */ new Date()).toISOString();
        await save();
        return publicRequest(request);
      });
    }
    function approveLive(actor, id, liveStatus) {
      return mutate(async () => {
        if (!["desarrollador", "administrador"].includes(actor.role)) forbidden("Solo un administrador puede aprobar el microfono al aire.");
        const request = state.requests.find((item) => item.id === id);
        if (!request) notFound("Solicitud de microfono no encontrada.");
        if (!activeFor(request, liveStatus)) badRequest("La solicitud no pertenece al vivo actual.");
        request.state = "live_approved";
        request.liveApprovedBy = actor.username;
        request.liveApprovedAt = (/* @__PURE__ */ new Date()).toISOString();
        await save();
        return publicRequest(request);
      });
    }
    function reportTest(actor, result, liveStatus) {
      return mutate(async () => {
        const request = state.requests.find((item) => item.username === actor.username && activeFor(item, liveStatus));
        if (!request) notFound("No existe una solicitud de microfono activa.");
        if (!["test_approved", "live_approved"].includes(request.state)) forbidden("La prueba de microfono aun no fue autorizada.");
        request.testStatus = result === "ready" ? "ready" : "failed";
        request.testReportedAt = (/* @__PURE__ */ new Date()).toISOString();
        await save();
        return publicRequest(request);
      });
    }
    function revoke(actor, id) {
      return mutate(async () => {
        if (!["desarrollador", "administrador"].includes(actor.role)) forbidden("Solo un administrador puede revocar el microfono.");
        const request = state.requests.find((item) => item.id === id);
        if (!request) notFound("Solicitud de microfono no encontrada.");
        request.state = "revoked";
        request.revokedBy = actor.username;
        request.revokedAt = (/* @__PURE__ */ new Date()).toISOString();
        await save();
        return publicRequest(request);
      });
    }
    function expireBroadcast(broadcastId) {
      if (!broadcastId) return Promise.resolve();
      return mutate(async () => {
        let changed = false;
        for (const request of state.requests) {
          if (request.broadcastId === broadcastId && !["revoked", "expired"].includes(request.state)) {
            request.state = "expired";
            request.expiredAt = (/* @__PURE__ */ new Date()).toISOString();
            changed = true;
          }
        }
        if (changed) await save();
      });
    }
    async function canJoinLive(username, liveStatus) {
      const request = await forUser(username, liveStatus);
      return Boolean(request && request.state === "live_approved");
    }
    module2.exports = {
      requestForActor,
      requestForGuestAccess,
      listAll,
      forUser,
      approveTest,
      approveLive,
      reportTest,
      revoke,
      expireBroadcast,
      canJoinLive,
      _resetForTests: () => {
        state = null;
        queue = Promise.resolve();
      }
    };
  }
});

// server/routes/users.js
var require_users2 = __commonJS({
  "server/routes/users.js"(exports2, module2) {
    var router = require("express").Router();
    var users = require_users();
    var validation = require_validation();
    var live = require_live();
    var microphones = require_microphones();
    var { auth, asyncRoute } = require_security();
    router.get("/users", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      res.json({ users: await users.listUsers() });
    }));
    router.post("/users", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      res.json({ ok: true, user: await users.createUser(req.actor, validation.objectBody(req)) });
    }));
    router.delete("/users/:username", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      await users.deleteUser(req.actor, req.params.username);
      res.json({ ok: true });
    }));
    router.post("/users/:username/password", auth(), asyncRoute(async (req, res) => {
      const body = validation.objectBody(req);
      await users.changePassword(req.actor, req.params.username, body.newPassword);
      res.json({ ok: true, reloginRequired: true });
    }));
    router.post("/guests/request", asyncRoute(async (req, res) => {
      const body = validation.objectBody(req);
      const request = await users.requestGuest(body.nombre, body.apellido);
      const liveStatus = await live.status();
      const microphoneRequest = await microphones.requestForGuestAccess(request, liveStatus);
      res.json({ ok: true, request, microphoneRequest });
    }));
    router.get("/guests", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      res.json({ guests: await users.listGuests() });
    }));
    router.post("/guests/:id/approve", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      const result = await users.approveGuest(req.actor, req.params.id);
      res.json({ ok: true, ...result });
    }));
    module2.exports = router;
  }
});

// server/core/rtc.js
var require_rtc = __commonJS({
  "server/core/rtc.js"(exports2, module2) {
    var crypto = require("crypto");
    var cfg = require_config();
    var runtimeStore = require_runtime_store();
    var { badRequest, forbidden, notFound } = require_errors();
    var localRooms = /* @__PURE__ */ new Map();
    var queue = Promise.resolve();
    function key(broadcastId) {
      return `rtc-room:${broadcastId}`;
    }
    function nowIso() {
      return (/* @__PURE__ */ new Date()).toISOString();
    }
    function tokenHash(token) {
      return crypto.createHash("sha256").update(String(token)).digest("hex");
    }
    function sameToken(token, expectedHash) {
      const actual = Buffer.from(tokenHash(token), "hex");
      const expected = Buffer.from(String(expectedHash || ""), "hex");
      return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
    }
    function initialRoom(liveStatus) {
      return {
        schemaVersion: 1,
        broadcastId: liveStatus.broadcastId,
        host: liveStatus.host,
        createdAt: nowIso(),
        clients: {},
        joins: [],
        inboxes: { host: [] }
      };
    }
    async function loadRoom(liveStatus, { create = true } = {}) {
      if (!liveStatus.live || !liveStatus.broadcastId) badRequest("No hay una transmision en vivo activa.");
      let room;
      if (cfg.isVercel) room = await runtimeStore.get(key(liveStatus.broadcastId));
      else room = localRooms.get(liveStatus.broadcastId);
      if (!room && create) room = initialRoom(liveStatus);
      if (!room) return null;
      if (room.host !== liveStatus.host) room.host = liveStatus.host;
      cleanup(room);
      return room;
    }
    async function saveRoom(room) {
      if (cfg.isVercel) {
        await runtimeStore.set(key(room.broadcastId), room, {
          ttl: cfg.rtc.roomTtlSeconds,
          name: `Sala WebRTC ${room.broadcastId}`,
          tags: [`rayoboss-rtc-${room.broadcastId}`]
        });
      } else {
        localRooms.set(room.broadcastId, room);
      }
    }
    function mutate(fn) {
      const run = queue.then(fn, fn);
      queue = run.catch(() => {
      });
      return run;
    }
    function cleanup(room) {
      const cutoff = Date.now() - cfg.rtc.clientTtlSeconds * 1e3;
      for (const [id, client] of Object.entries(room.clients || {})) {
        if (Date.parse(client.lastSeen || client.joinedAt || 0) < cutoff) {
          delete room.clients[id];
          delete room.inboxes[id];
          room.joins = room.joins.filter((joinId) => joinId !== id);
        }
      }
      for (const name of Object.keys(room.inboxes || {})) {
        room.inboxes[name] = (room.inboxes[name] || []).filter((item) => Date.parse(item.createdAt) >= cutoff).slice(-100);
      }
    }
    function publicIceServers() {
      return cfg.rtc.iceServers.map((server) => ({ ...server }));
    }
    function createClient(kind, identity, liveStatus) {
      return mutate(async () => {
        const room = await loadRoom(liveStatus);
        const currentCount = Object.values(room.clients).filter((client) => client.kind === kind).length;
        const limit = kind === "listener" ? cfg.rtc.maxListeners : cfg.rtc.maxParticipants;
        if (currentCount >= limit) badRequest(`Se alcanzo el limite de ${limit} ${kind === "listener" ? "oyentes WebRTC" : "participantes"}.`);
        const id = crypto.randomBytes(12).toString("hex");
        const token = crypto.randomBytes(24).toString("base64url");
        room.clients[id] = {
          id,
          kind,
          username: identity.username || null,
          displayName: identity.displayName || identity.username || "Oyente",
          tokenHash: tokenHash(token),
          joinedAt: nowIso(),
          lastSeen: nowIso()
        };
        room.inboxes[id] = [];
        room.joins.push(id);
        await saveRoom(room);
        return {
          connectionId: id,
          token,
          broadcastId: liveStatus.broadcastId,
          pollMs: cfg.rtc.pollMs,
          iceServers: publicIceServers(),
          turnConfigured: cfg.rtc.iceServers.some((server) => String(server.urls).startsWith("turn"))
        };
      });
    }
    async function authorizeClient(room, connectionId, token) {
      const client = room.clients[connectionId];
      if (!client || !sameToken(token, client.tokenHash)) forbidden("Conexion WebRTC no autorizada.");
      client.lastSeen = nowIso();
      return client;
    }
    function assertHost(actor, liveStatus) {
      if (!liveStatus.live || liveStatus.host !== actor.username) forbidden("Solo quien inicio el vivo puede operar el estudio WebRTC.");
    }
    function pollHost(actor, liveStatus) {
      return mutate(async () => {
        assertHost(actor, liveStatus);
        const room = await loadRoom(liveStatus);
        const joins = room.joins.splice(0).map((id) => room.clients[id]).filter(Boolean).map((client) => ({
          id: client.id,
          kind: client.kind,
          username: client.username,
          displayName: client.displayName,
          joinedAt: client.joinedAt
        }));
        const signals = (room.inboxes.host || []).splice(0);
        await saveRoom(room);
        return { joins, signals, pollMs: cfg.rtc.pollMs, iceServers: publicIceServers() };
      });
    }
    function pollClient(connectionId, token, liveStatus) {
      return mutate(async () => {
        const room = await loadRoom(liveStatus, { create: false });
        if (!room) notFound("La sala WebRTC ya no existe.");
        await authorizeClient(room, connectionId, token);
        const signals = (room.inboxes[connectionId] || []).splice(0);
        await saveRoom(room);
        return { signals, live: true, pollMs: cfg.rtc.pollMs };
      });
    }
    function sanitizeSignal(signal) {
      if (!signal || typeof signal !== "object" || Array.isArray(signal)) badRequest("Se\xF1al WebRTC invalida.");
      const type = String(signal.type || "");
      if (!["description", "candidate", "close"].includes(type)) badRequest("Tipo de se\xF1al WebRTC invalido.");
      const payload = signal.payload == null ? null : signal.payload;
      const serialized = JSON.stringify(payload);
      if (serialized.length > 1e5) badRequest("Se\xF1al WebRTC demasiado grande.");
      return { type, payload };
    }
    function signalFromHost(actor, targetId, signal, liveStatus) {
      return mutate(async () => {
        assertHost(actor, liveStatus);
        const room = await loadRoom(liveStatus);
        if (!room.clients[targetId]) notFound("Conexion WebRTC no encontrada.");
        const safe = sanitizeSignal(signal);
        room.inboxes[targetId].push({ from: "host", ...safe, createdAt: nowIso() });
        await saveRoom(room);
        return true;
      });
    }
    function signalFromClient(connectionId, token, signal, liveStatus) {
      return mutate(async () => {
        const room = await loadRoom(liveStatus, { create: false });
        if (!room) notFound("La sala WebRTC ya no existe.");
        const client = await authorizeClient(room, connectionId, token);
        const safe = sanitizeSignal(signal);
        room.inboxes.host.push({ from: connectionId, kind: client.kind, username: client.username, ...safe, createdAt: nowIso() });
        await saveRoom(room);
        return true;
      });
    }
    function leaveClient(connectionId, token, liveStatus) {
      return mutate(async () => {
        const room = await loadRoom(liveStatus, { create: false });
        if (!room) return;
        await authorizeClient(room, connectionId, token);
        delete room.clients[connectionId];
        delete room.inboxes[connectionId];
        room.joins = room.joins.filter((id) => id !== connectionId);
        room.inboxes.host.push({ from: connectionId, type: "close", payload: null, createdAt: nowIso() });
        await saveRoom(room);
      });
    }
    function disconnectUsername(username, liveStatus) {
      return mutate(async () => {
        const room = await loadRoom(liveStatus, { create: false });
        if (!room) return;
        for (const [id, client] of Object.entries(room.clients)) {
          if (client.username !== username) continue;
          if (room.inboxes[id]) room.inboxes[id].push({ from: "host", type: "close", payload: null, createdAt: nowIso() });
          room.inboxes.host.push({ from: id, type: "close", payload: null, createdAt: nowIso() });
          client.lastSeen = (/* @__PURE__ */ new Date(0)).toISOString();
        }
        await saveRoom(room);
      });
    }
    async function closeRoom(broadcastId) {
      if (!broadcastId) return;
      if (cfg.isVercel) await runtimeStore.del(key(broadcastId));
      else localRooms.delete(broadcastId);
    }
    module2.exports = {
      createClient,
      pollHost,
      pollClient,
      signalFromHost,
      signalFromClient,
      leaveClient,
      disconnectUsername,
      closeRoom,
      publicIceServers,
      _resetForTests: () => {
        localRooms.clear();
        queue = Promise.resolve();
      }
    };
  }
});

// server/routes/live.js
var require_live2 = __commonJS({
  "server/routes/live.js"(exports2, module2) {
    var router = require("express").Router();
    var live = require_live();
    var microphones = require_microphones();
    var rtc = require_rtc();
    var validation = require_validation();
    var { auth, asyncRoute } = require_security();
    router.get("/live/status", asyncRoute(async (req, res) => res.json(await live.status())));
    router.post("/live/start", auth("desarrollador", "administrador", "locutor"), asyncRoute(async (req, res) => {
      const body = validation.objectBody(req);
      const title = body.title == null || body.title === "" ? "" : validation.text(body.title, "Titulo", { min: 1, max: 120 });
      res.json({ ok: true, status: await live.goLive(req.actor, title), streamUrl: "/api/live/stream" });
    }));
    router.post("/live/end", auth("desarrollador", "administrador", "locutor"), asyncRoute(async (req, res) => {
      const result = await live.endLive();
      await Promise.all([
        microphones.expireBroadcast(result.endedBroadcastId),
        rtc.closeRoom(result.endedBroadcastId)
      ]);
      res.json({ ok: true, status: result.status });
    }));
    router.get("/live/stream", asyncRoute(async (req, res) => live.attachListener(res)));
    module2.exports = router;
  }
});

// server/routes/microphones.js
var require_microphones2 = __commonJS({
  "server/routes/microphones.js"(exports2, module2) {
    var router = require("express").Router();
    var microphones = require_microphones();
    var live = require_live();
    var rtc = require_rtc();
    var validation = require_validation();
    var { auth, asyncRoute } = require_security();
    router.get("/microphones", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      const liveStatus = await live.status();
      res.json({ requests: await microphones.listAll(liveStatus), live: liveStatus });
    }));
    router.get("/microphones/me", auth(), asyncRoute(async (req, res) => {
      const liveStatus = await live.status();
      res.json({ request: await microphones.forUser(req.actor.username, liveStatus), live: liveStatus });
    }));
    router.post("/microphones/request", auth("invitado", "periodista"), asyncRoute(async (req, res) => {
      const liveStatus = await live.status();
      res.json({ ok: true, request: await microphones.requestForActor(req.actor, liveStatus) });
    }));
    router.post("/microphones/:id/approve-test", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      const liveStatus = await live.status();
      res.json({ ok: true, request: await microphones.approveTest(req.actor, req.params.id, liveStatus) });
    }));
    router.post("/microphones/:id/approve-live", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      const liveStatus = await live.status();
      res.json({ ok: true, request: await microphones.approveLive(req.actor, req.params.id, liveStatus) });
    }));
    router.post("/microphones/me/test-result", auth("invitado", "periodista"), asyncRoute(async (req, res) => {
      const body = validation.objectBody(req);
      const result = body.result === "ready" ? "ready" : "failed";
      const liveStatus = await live.status();
      res.json({ ok: true, request: await microphones.reportTest(req.actor, result, liveStatus) });
    }));
    router.post("/microphones/:id/revoke", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      const liveStatus = await live.status();
      const request = await microphones.revoke(req.actor, req.params.id);
      await rtc.disconnectUsername(request.username, liveStatus);
      res.json({ ok: true, request });
    }));
    module2.exports = router;
  }
});

// server/routes/rtc.js
var require_rtc2 = __commonJS({
  "server/routes/rtc.js"(exports2, module2) {
    var router = require("express").Router();
    var live = require_live();
    var rtc = require_rtc();
    var microphones = require_microphones();
    var validation = require_validation();
    var { auth, asyncRoute } = require_security();
    var { forbidden } = require_errors();
    router.post("/rtc/listeners/join", asyncRoute(async (req, res) => {
      const liveStatus = await live.status();
      res.json({ ok: true, session: await rtc.createClient("listener", { displayName: "Oyente" }, liveStatus) });
    }));
    router.post("/rtc/participants/join", auth("invitado", "periodista"), asyncRoute(async (req, res) => {
      const liveStatus = await live.status();
      if (!await microphones.canJoinLive(req.actor.username, liveStatus)) {
        forbidden("El administrador aun no aprobo tu microfono para salir al aire.");
      }
      res.json({ ok: true, session: await rtc.createClient("participant", {
        username: req.actor.username,
        displayName: req.actor.username
      }, liveStatus) });
    }));
    router.get("/rtc/host/poll", auth("desarrollador", "administrador", "locutor"), asyncRoute(async (req, res) => {
      const liveStatus = await live.status();
      res.json(await rtc.pollHost(req.actor, liveStatus));
    }));
    router.post("/rtc/host/signal", auth("desarrollador", "administrador", "locutor"), asyncRoute(async (req, res) => {
      const body = validation.objectBody(req);
      const targetId = validation.text(body.targetId, "Conexion destino", { min: 8, max: 64 });
      const liveStatus = await live.status();
      await rtc.signalFromHost(req.actor, targetId, body.signal, liveStatus);
      res.json({ ok: true });
    }));
    router.post("/rtc/clients/poll", asyncRoute(async (req, res) => {
      const body = validation.objectBody(req);
      const connectionId = validation.text(body.connectionId, "Conexion", { min: 8, max: 64 });
      const token = validation.text(body.token, "Token", { min: 20, max: 128, trim: false });
      const liveStatus = await live.status();
      res.json(await rtc.pollClient(connectionId, token, liveStatus));
    }));
    router.post("/rtc/clients/signal", asyncRoute(async (req, res) => {
      const body = validation.objectBody(req);
      const connectionId = validation.text(body.connectionId, "Conexion", { min: 8, max: 64 });
      const token = validation.text(body.token, "Token", { min: 20, max: 128, trim: false });
      const liveStatus = await live.status();
      await rtc.signalFromClient(connectionId, token, body.signal, liveStatus);
      res.json({ ok: true });
    }));
    router.post("/rtc/clients/leave", asyncRoute(async (req, res) => {
      const body = validation.objectBody(req);
      const connectionId = validation.text(body.connectionId, "Conexion", { min: 8, max: 64 });
      const token = validation.text(body.token, "Token", { min: 20, max: 128, trim: false });
      const liveStatus = await live.status();
      await rtc.leaveClient(connectionId, token, liveStatus);
      res.json({ ok: true });
    }));
    module2.exports = router;
  }
});

// server/core/media-library.js
var require_media_library = __commonJS({
  "server/core/media-library.js"(exports2, module2) {
    var path = require("path");
    var crypto = require("crypto");
    var cfg = require_config();
    var runtimeStore = require_runtime_store();
    var { writePrimary, readRecoverable } = require_storage();
    var { badRequest, notFound, forbidden } = require_errors();
    var CATALOG_KEY = "media-catalog-v302";
    var CATALOG_FILE = cfg.dataDir ? path.join(cfg.dataDir, "media-catalog.json") : null;
    var CATEGORIES = Object.freeze({
      "autodj.libre": { label: "M\xFAsica libre y no restrictiva", scope: "autodj", persistent: true, mediaType: "music" },
      "autodj.sayco": { label: "SAYCO-ACINPRO", scope: "autodj", persistent: true, rightsRequired: true, mediaType: "music" },
      "autodj.produccion": { label: "Producci\xF3n y continuidad", scope: "autodj", persistent: true, mediaType: "production" },
      "live.volatil": { label: "Material temporal del vivo (24 horas)", scope: "live", persistent: false, maxHours: 24, mediaType: "other" },
      "live.efectos": { label: "Efectos de sonido", scope: "live", persistent: true, mediaType: "effect" },
      "live.camas": { label: "Camas y fondos musicales", scope: "live", persistent: true, mediaType: "bed" }
    });
    var LICENSE_TYPES = Object.freeze({
      "licencia-libre": "Licencia libre o de stock",
      "creative-commons": "Creative Commons",
      "dominio-publico": "Dominio p\xFAblico",
      "produccion-propia": "Producci\xF3n propia",
      "sayco-acinpro": "SAYCO-ACINPRO",
      "autorizacion-directa": "Autorizaci\xF3n directa",
      otra: "Otra licencia",
      pendiente: "Pendiente de clasificar"
    });
    var MEDIA_EXTENSIONS = /* @__PURE__ */ new Set([".mp3", ".wav", ".aac", ".m4a", ".ogg", ".oga", ".flac", ".opus", ".mp4", ".m4v", ".webm", ".mov"]);
    var LICENSE_EXTENSIONS = /* @__PURE__ */ new Set([".txt", ".pdf", ".jpg", ".jpeg", ".png", ".webp"]);
    var LICENSE_CONTENT_TYPES = /* @__PURE__ */ new Set(["text/plain", "application/pdf", "image/jpeg", "image/png", "image/webp"]);
    var localCatalog = null;
    var queue = Promise.resolve();
    function nowIso() {
      return (/* @__PURE__ */ new Date()).toISOString();
    }
    function id() {
      return crypto.randomBytes(12).toString("hex");
    }
    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }
    function optionalText(value, max = 240) {
      const safe = String(value || "").trim();
      if (safe.length > max || /[<>]/.test(safe)) badRequest("Uno de los metadatos contiene caracteres o una longitud no permitidos.");
      return safe;
    }
    function requiredText(value, name, max = 160) {
      const safe = optionalText(value, max);
      if (!safe) badRequest(`${name} inv\xE1lido.`);
      return safe;
    }
    function inferredLicenseType(category) {
      if (category === "autodj.sayco") return "sayco-acinpro";
      if (category === "autodj.produccion") return "produccion-propia";
      if (category === "autodj.libre") return "licencia-libre";
      return "pendiente";
    }
    function seed() {
      return {
        schemaVersion: 2,
        revision: 1,
        items: [
          { id: "demo-indie", title: "Pieza independiente de demostraci\xF3n", artist: "RayoBoss", category: "autodj.libre", mediaType: "music", kind: "audio", contentType: "audio/mpeg", url: "/media/indie-demo.mp3", durationSeconds: 18, active: true, bundled: true, rights: { licenseType: "produccion-propia", basis: "Generaci\xF3n sint\xE9tica propia para prueba", reference: "RayoBoss 4.0.1", confirmed: true }, createdAt: nowIso() },
          { id: "demo-graduacion", title: "Ceremonia de graduaci\xF3n \u2014 video de prueba", artist: "RayoBoss", category: "autodj.libre", mediaType: "music", kind: "video", contentType: "video/mp4", url: "/media/graduacion-demo.mp4", durationSeconds: 12, active: true, bundled: true, rights: { licenseType: "produccion-propia", basis: "Video y audio sint\xE9ticos propios", reference: "RayoBoss 4.0.1", confirmed: true }, createdAt: nowIso() },
          { id: "demo-id", title: "Identificador RayoBoss de prueba", artist: "RayoBoss", category: "autodj.produccion", mediaType: "production", subtype: "identificador", kind: "audio", contentType: "audio/mpeg", url: "/media/identificador-demo.mp3", durationSeconds: 1, active: true, bundled: true, rights: { licenseType: "produccion-propia", confirmed: true }, createdAt: nowIso() },
          { id: "demo-cuna", title: "Cu\xF1a institucional de prueba", artist: "RayoBoss", category: "autodj.produccion", mediaType: "production", subtype: "cuna", kind: "audio", contentType: "audio/mpeg", url: "/media/cuna-demo.mp3", durationSeconds: 2.4, active: true, bundled: true, rights: { licenseType: "produccion-propia", confirmed: true }, createdAt: nowIso() },
          { id: "demo-bed", title: "Cama musical de estudio", artist: "RayoBoss", category: "live.camas", mediaType: "bed", kind: "audio", contentType: "audio/mpeg", url: "/media/cama-demo.mp3", durationSeconds: 20, active: true, bundled: true, rights: { licenseType: "produccion-propia", confirmed: true }, createdAt: nowIso() },
          { id: "demo-laugh", title: "Efecto: reacci\xF3n positiva", artist: "RayoBoss", category: "live.efectos", mediaType: "effect", kind: "audio", contentType: "audio/mpeg", url: "/media/efecto-risa-demo.mp3", durationSeconds: 0.6, active: true, bundled: true, rights: { licenseType: "produccion-propia", confirmed: true }, createdAt: nowIso() },
          { id: "demo-suspense", title: "Efecto: suspenso", artist: "RayoBoss", category: "live.efectos", mediaType: "effect", kind: "audio", contentType: "audio/mpeg", url: "/media/efecto-suspenso-demo.mp3", durationSeconds: 2.5, active: true, bundled: true, rights: { licenseType: "produccion-propia", confirmed: true }, createdAt: nowIso() }
        ]
      };
    }
    function migrateCatalog(input) {
      if (!input || !Array.isArray(input.items)) return seed();
      const catalog = clone(input);
      catalog.schemaVersion = 2;
      catalog.items = catalog.items.map((item) => {
        const rights = item.rights && typeof item.rights === "object" ? item.rights : {};
        return {
          ...item,
          artist: String(item.artist || ""),
          album: String(item.album || ""),
          genre: String(item.genre || ""),
          year: String(item.year || ""),
          isrc: String(item.isrc || ""),
          composer: String(item.composer || ""),
          performer: String(item.performer || ""),
          recordLabel: String(item.recordLabel || ""),
          notes: String(item.notes || ""),
          mediaType: item.mediaType || CATEGORIES[item.category]?.mediaType || "other",
          rights: {
            ...rights,
            licenseType: LICENSE_TYPES[rights.licenseType] ? rights.licenseType : inferredLicenseType(item.category),
            basis: String(rights.basis || ""),
            reference: String(rights.reference || ""),
            confirmed: Boolean(rights.confirmed)
          }
        };
      });
      return catalog;
    }
    function publicItem(item) {
      const copy = clone(item);
      delete copy.localPath;
      if (copy.rights?.document) delete copy.rights.document.localPath;
      return copy;
    }
    function cleanExpired(catalog) {
      const before = catalog.items.length;
      const now = Date.now();
      catalog.items = catalog.items.filter((item) => !item.expiresAt || Date.parse(item.expiresAt) > now);
      return before !== catalog.items.length;
    }
    function validateCatalog(catalog) {
      if (!catalog || catalog.schemaVersion !== 2 || !Array.isArray(catalog.items)) throw new Error("Cat\xE1logo multimedia inv\xE1lido.");
      for (const item of catalog.items) {
        if (!item || typeof item.id !== "string" || !CATEGORIES[item.category] || !["audio", "video"].includes(item.kind)) throw new Error("El cat\xE1logo contiene un elemento inv\xE1lido.");
      }
      return catalog;
    }
    async function persist(catalog) {
      catalog.revision = (catalog.revision || 0) + 1;
      if (cfg.isVercel) {
        await runtimeStore.set(CATALOG_KEY, catalog, { ttl: 31536e3, name: "Cat\xE1logo multimedia RayoBoss", tags: ["rayoboss-media"] });
      } else if (CATALOG_FILE) writePrimary(CATALOG_FILE, catalog);
    }
    async function load({ fresh = false } = {}) {
      if (localCatalog && !fresh && !cfg.isVercel) return localCatalog;
      let catalog = cfg.isVercel ? await runtimeStore.get(CATALOG_KEY) : CATALOG_FILE ? readRecoverable(CATALOG_FILE) : null;
      if (!catalog) {
        catalog = seed();
        await persist(catalog);
      } else if (catalog.schemaVersion !== 2) {
        catalog = migrateCatalog(catalog);
        await persist(catalog);
      }
      validateCatalog(catalog);
      if (cleanExpired(catalog)) await persist(catalog);
      localCatalog = catalog;
      return catalog;
    }
    function mutate(fn) {
      const execute = async () => {
        const catalog = await load({ fresh: cfg.isVercel });
        const result = await fn(catalog);
        await persist(catalog);
        localCatalog = catalog;
        return result;
      };
      const run = queue.then(execute, execute);
      queue = run.catch(() => {
      });
      return run;
    }
    function validateMediaDescriptor({ originalName, contentType }) {
      const extension = path.extname(String(originalName || "")).toLowerCase();
      const mime = String(contentType || "").toLowerCase().split(";")[0];
      if (!MEDIA_EXTENSIONS.has(extension)) badRequest("Formato multimedia no admitido. Usa MP3, WAV, AAC, M4A, OGG, FLAC, OPUS, MP4, MOV o WebM.");
      if (mime && !/^(audio|video)\//.test(mime)) badRequest("El archivo seleccionado no se identifica como audio o video.");
      const kind = mime.startsWith("video/") || [".mp4", ".m4v", ".webm", ".mov"].includes(extension) ? "video" : "audio";
      return { extension, contentType: mime || (kind === "video" ? "video/mp4" : "audio/mpeg"), kind };
    }
    function validateLicenseDescriptor({ originalName, contentType, sizeBytes }) {
      const extension = path.extname(String(originalName || "")).toLowerCase();
      const mime = String(contentType || "").toLowerCase().split(";")[0];
      if (!LICENSE_EXTENSIONS.has(extension) || mime && !LICENSE_CONTENT_TYPES.has(mime)) {
        badRequest("El soporte de licencia debe ser TXT, PDF, JPG, PNG o WebP.");
      }
      if (Number(sizeBytes) > 25 * 1024 * 1024) badRequest("El soporte de licencia no puede superar 25 MB.");
      return { extension, contentType: mime || (extension === ".pdf" ? "application/pdf" : "text/plain") };
    }
    function normalizeMetadata(input, actor) {
      const category = String(input.category || "");
      const categoryInfo = CATEGORIES[category];
      if (!categoryInfo) badRequest("Categor\xEDa multimedia inv\xE1lida.");
      const contentType = String(input.contentType || "").toLowerCase().split(";")[0];
      if (!/^(audio|video)\//.test(contentType)) badRequest("Solo se permiten archivos de audio o video.");
      const kind = contentType.startsWith("video/") ? "video" : "audio";
      const rightsConfirmed = input.rightsConfirmed === true || input.rightsConfirmed === "true";
      if (categoryInfo.rightsRequired && !rightsConfirmed) forbidden("Confirma que la emisora cuenta con autorizaci\xF3n SAYCO-ACINPRO antes de incorporar la obra.");
      const durationSeconds = Number(input.durationSeconds);
      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 86400) {
        badRequest("No fue posible validar la duraci\xF3n del archivo multimedia.");
      }
      const licenseType = String(input.licenseType || inferredLicenseType(category));
      if (!LICENSE_TYPES[licenseType]) badRequest("Tipo de licencia inv\xE1lido.");
      const year = optionalText(input.year, 4);
      if (year && !/^\d{4}$/.test(year)) badRequest("El a\xF1o debe tener cuatro d\xEDgitos.");
      const isrc = optionalText(input.isrc, 20).toUpperCase();
      if (isrc && !/^[A-Z0-9-]{5,20}$/.test(isrc)) badRequest("El c\xF3digo ISRC no tiene un formato v\xE1lido.");
      const createdAt = nowIso();
      return {
        id: id(),
        title: requiredText(input.title, "T\xEDtulo"),
        artist: optionalText(input.artist, 160),
        album: optionalText(input.album, 160),
        genre: optionalText(input.genre, 80),
        year,
        isrc,
        composer: optionalText(input.composer, 160),
        performer: optionalText(input.performer, 160),
        recordLabel: optionalText(input.recordLabel, 160),
        notes: optionalText(input.notes, 500),
        category,
        mediaType: categoryInfo.mediaType,
        subtype: optionalText(input.subtype, 40) || null,
        kind,
        contentType,
        durationSeconds: Math.round(durationSeconds * 1e3) / 1e3,
        active: input.active == null ? true : Boolean(input.active),
        bundled: false,
        uploadedBy: actor.username,
        createdAt,
        rights: {
          confirmed: rightsConfirmed,
          licenseType,
          basis: optionalText(input.rightsBasis, 240),
          reference: optionalText(input.rightsReference, 240)
        },
        expiresAt: categoryInfo.maxHours ? new Date(Date.now() + categoryInfo.maxHours * 36e5).toISOString() : null
      };
    }
    async function list(filters = {}) {
      const catalog = await load({ fresh: cfg.isVercel });
      return catalog.items.filter((item) => (!filters.category || item.category === filters.category) && (filters.includeInactive || item.active)).map(publicItem);
    }
    async function get(itemId) {
      const catalog = await load({ fresh: cfg.isVercel });
      const item = catalog.items.find((entry) => entry.id === itemId);
      if (!item) notFound("Elemento multimedia no encontrado.");
      return clone(item);
    }
    function documentFromStorage(storage) {
      if (!storage) return null;
      return { ...storage, attachedAt: nowIso() };
    }
    function addUploaded(actor, input, storage, licenseStorage = null) {
      return mutate(async (catalog) => {
        const duplicate = storage.storageKey && catalog.items.find((item2) => item2.storageKey === storage.storageKey);
        if (duplicate) return publicItem(duplicate);
        const normalized = normalizeMetadata(input, actor);
        if (licenseStorage) normalized.rights.document = documentFromStorage(licenseStorage);
        const item = { ...normalized, ...storage };
        catalog.items.push(item);
        return publicItem(item);
      });
    }
    function replaceUploaded(actor, itemId, input, storage, licenseStorage = null) {
      return mutate(async (catalog) => {
        const index = catalog.items.findIndex((entry) => entry.id === itemId);
        if (index < 0) notFound("Elemento multimedia no encontrado.");
        const previous = clone(catalog.items[index]);
        if (previous.bundled) forbidden("Los recursos incluidos de demostraci\xF3n no pueden reemplazarse.");
        if (previous.storageKey && previous.storageKey === storage.storageKey) {
          return { item: publicItem(previous), previous: null };
        }
        if (storage.storageKey && catalog.items.some((entry) => entry.id !== itemId && entry.storageKey === storage.storageKey)) {
          badRequest("Ese archivo ya pertenece a otra ficha de la biblioteca.");
        }
        const normalized = normalizeMetadata(input, actor);
        normalized.rights.document = licenseStorage ? documentFromStorage(licenseStorage) : previous.rights?.document;
        const item = {
          ...normalized,
          ...storage,
          id: previous.id,
          createdAt: previous.createdAt,
          uploadedBy: previous.uploadedBy,
          updatedAt: nowIso(),
          updatedBy: actor.username,
          replacedAt: nowIso(),
          replacedBy: actor.username
        };
        catalog.items[index] = item;
        return { item: publicItem(item), previous };
      });
    }
    function update(actor, itemId, input) {
      return mutate(async (catalog) => {
        const item = catalog.items.find((entry) => entry.id === itemId);
        if (!item) notFound("Elemento multimedia no encontrado.");
        const merged = {
          ...item,
          ...input,
          rightsConfirmed: input.rightsConfirmed == null ? item.rights?.confirmed : input.rightsConfirmed,
          licenseType: input.licenseType == null ? item.rights?.licenseType : input.licenseType,
          rightsBasis: input.rightsBasis == null ? item.rights?.basis : input.rightsBasis,
          rightsReference: input.rightsReference == null ? item.rights?.reference : input.rightsReference
        };
        const normalized = normalizeMetadata(merged, actor);
        for (const field of ["title", "artist", "album", "genre", "year", "isrc", "composer", "performer", "recordLabel", "notes", "category", "mediaType", "subtype", "durationSeconds", "expiresAt"]) {
          item[field] = normalized[field];
        }
        item.rights = { ...normalized.rights, document: item.rights?.document };
        if (input.active != null) item.active = Boolean(input.active);
        item.updatedAt = nowIso();
        item.updatedBy = actor.username;
        return publicItem(item);
      });
    }
    function attachLicense(actor, itemId, storage, input = {}) {
      return mutate(async (catalog) => {
        const item = catalog.items.find((entry) => entry.id === itemId);
        if (!item) notFound("Elemento multimedia no encontrado.");
        const previous = item.rights?.document ? clone(item.rights.document) : null;
        const licenseType = String(input.licenseType || item.rights?.licenseType || inferredLicenseType(item.category));
        if (!LICENSE_TYPES[licenseType]) badRequest("Tipo de licencia inv\xE1lido.");
        item.rights = {
          ...item.rights || {},
          licenseType,
          basis: input.rightsBasis == null ? String(item.rights?.basis || "") : optionalText(input.rightsBasis, 240),
          reference: input.rightsReference == null ? String(item.rights?.reference || "") : optionalText(input.rightsReference, 240),
          confirmed: input.rightsConfirmed == null ? Boolean(item.rights?.confirmed) : input.rightsConfirmed === true || input.rightsConfirmed === "true",
          document: documentFromStorage(storage)
        };
        if (CATEGORIES[item.category].rightsRequired && !item.rights.confirmed) forbidden("Confirma la autorizaci\xF3n SAYCO-ACINPRO antes de adjuntar el soporte.");
        item.updatedAt = nowIso();
        item.updatedBy = actor.username;
        return { item: publicItem(item), previous };
      });
    }
    function remove(actor, itemId) {
      return mutate(async (catalog) => {
        const index = catalog.items.findIndex((entry) => entry.id === itemId);
        if (index < 0) notFound("Elemento multimedia no encontrado.");
        const item = catalog.items[index];
        if (item.bundled) forbidden("Los recursos de demostraci\xF3n incluidos no se eliminan; pueden desactivarse.");
        catalog.items.splice(index, 1);
        return clone(item);
      });
    }
    function categories() {
      return clone(CATEGORIES);
    }
    function licenseTypes() {
      return clone(LICENSE_TYPES);
    }
    module2.exports = {
      list,
      get,
      addUploaded,
      replaceUploaded,
      update,
      attachLicense,
      remove,
      categories,
      licenseTypes,
      normalizeMetadata,
      validateMediaDescriptor,
      validateLicenseDescriptor,
      _resetForTests: () => {
        localCatalog = null;
        queue = Promise.resolve();
      }
    };
  }
});

// server/core/storage/storage-keys.js
var require_storage_keys = __commonJS({
  "server/core/storage/storage-keys.js"(exports2, module2) {
    var crypto = require("crypto");
    var path = require("path");
    var { badRequest } = require_errors();
    function sanitizeFileName(originalName) {
      const source = path.basename(String(originalName || "archivo"));
      const extension = path.extname(source).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 12);
      const base = path.basename(source, path.extname(source)).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 80);
      return `${base || "archivo"}${extension}`;
    }
    function categoryPath(category) {
      const value = String(category || "").trim();
      if (!/^[a-z0-9]+(?:\.[a-z0-9]+)*$/i.test(value)) badRequest("Categor\xEDa de almacenamiento inv\xE1lida.");
      return value.replace(/\./g, "/").toLowerCase();
    }
    function buildStorageKey({ category, originalName, namespace = "rayoboss", now = /* @__PURE__ */ new Date() }) {
      const safeNamespace = String(namespace || "rayoboss").replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "rayoboss";
      const year = String(now.getUTCFullYear());
      const month = String(now.getUTCMonth() + 1).padStart(2, "0");
      const day = String(now.getUTCDate()).padStart(2, "0");
      const unique = crypto.randomBytes(10).toString("hex");
      return `${safeNamespace}/${categoryPath(category)}/${year}/${month}/${day}/${unique}-${sanitizeFileName(originalName)}`;
    }
    function assertSafeStorageKey(key) {
      const value = String(key || "");
      if (!value || value.length > 512 || value.startsWith("/") || value.includes("\\") || value.split("/").includes("..")) {
        badRequest("Clave de almacenamiento inv\xE1lida.");
      }
      if (!/^rayoboss\/[a-z0-9/_-]+\/[a-z0-9._-]+$/i.test(value)) badRequest("Clave de almacenamiento fuera del espacio permitido.");
      return value;
    }
    function keyMatchesCategory(key, category) {
      const safe = assertSafeStorageKey(key);
      return safe.startsWith(`rayoboss/${categoryPath(category)}/`);
    }
    function encodePublicPath(key) {
      return String(key).split("/").map((segment) => encodeURIComponent(segment)).join("/");
    }
    module2.exports = { sanitizeFileName, categoryPath, buildStorageKey, assertSafeStorageKey, keyMatchesCategory, encodePublicPath };
  }
});

// server/core/storage/storage-provider.js
var require_storage_provider = __commonJS({
  "server/core/storage/storage-provider.js"(exports2, module2) {
    var { buildStorageKey } = require_storage_keys();
    var StorageProvider = class _StorageProvider {
      constructor({ id, writable, uploadMode }) {
        if (new.target === _StorageProvider) throw new TypeError("StorageProvider es una interfaz abstracta.");
        this.id = id;
        this.writable = Boolean(writable);
        this.uploadMode = uploadMode || "none";
      }
      describe() {
        return {
          provider: this.id,
          writable: this.writable,
          uploadMode: this.uploadMode,
          directUpload: this.uploadMode === "direct",
          serverUpload: this.uploadMode === "server"
        };
      }
      createStorageKey(input) {
        return buildStorageKey(input);
      }
      getServerUploadConfig() {
        return null;
      }
      async saveObject() {
        throw new Error(`${this.id}: saveObject() no implementado.`);
      }
      async storeUploadedFile() {
        throw new Error(`${this.id}: storeUploadedFile() no implementado.`);
      }
      async getObject() {
        throw new Error(`${this.id}: getObject() no implementado.`);
      }
      async getPublicUrl() {
        throw new Error(`${this.id}: getPublicUrl() no implementado.`);
      }
      async listObjects() {
        throw new Error(`${this.id}: listObjects() no implementado.`);
      }
      async deleteObject() {
        throw new Error(`${this.id}: deleteObject() no implementado.`);
      }
      async exists() {
        throw new Error(`${this.id}: exists() no implementado.`);
      }
      async getMetadata() {
        throw new Error(`${this.id}: getMetadata() no implementado.`);
      }
      async handleDirectUpload() {
        throw new Error(`${this.id}: handleDirectUpload() no implementado.`);
      }
    };
    module2.exports = StorageProvider;
  }
});

// server/core/storage/local-disk-storage-provider.js
var require_local_disk_storage_provider = __commonJS({
  "server/core/storage/local-disk-storage-provider.js"(exports2, module2) {
    var fs = require("fs");
    var fsp = require("fs/promises");
    var path = require("path");
    var StorageProvider = require_storage_provider();
    var { assertSafeStorageKey, encodePublicPath } = require_storage_keys();
    var LocalDiskStorageProvider = class extends StorageProvider {
      constructor({ rootDir, publicBasePath = "/media-files" }) {
        super({ id: "local-disk", writable: true, uploadMode: "server" });
        if (!rootDir) throw new Error("LocalDiskStorageProvider requiere rootDir.");
        this.rootDir = path.resolve(rootDir);
        this.publicBasePath = String(publicBasePath || "/media-files").replace(/\/$/, "");
        this.tempDir = path.join(this.rootDir, ".tmp");
        fs.mkdirSync(this.tempDir, { recursive: true, mode: 448 });
      }
      resolveKey(key) {
        const safeKey = assertSafeStorageKey(key);
        const fullPath = path.resolve(this.rootDir, ...safeKey.split("/"));
        const relative = path.relative(this.rootDir, fullPath);
        if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Ruta local fuera del almacenamiento permitido.");
        return fullPath;
      }
      getServerUploadConfig() {
        return { tempDir: this.tempDir };
      }
      async saveObject({ key, body, contentType = "application/octet-stream", sizeBytes = null, originalName = null }) {
        const storageKey = assertSafeStorageKey(key);
        const destination = this.resolveKey(storageKey);
        await fsp.mkdir(path.dirname(destination), { recursive: true, mode: 448 });
        await fsp.writeFile(destination, body, { mode: 384 });
        const stat = await fsp.stat(destination);
        return {
          provider: this.id,
          storage: "local",
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
        await fsp.mkdir(path.dirname(destination), { recursive: true, mode: 448 });
        try {
          await fsp.rename(tempPath, destination);
        } catch (error) {
          if (error.code !== "EXDEV") throw error;
          await fsp.copyFile(tempPath, destination);
          await fsp.rm(tempPath, { force: true });
        }
        try {
          await fsp.chmod(destination, 384);
        } catch (_) {
        }
        return {
          provider: this.id,
          storage: "local",
          storageKey,
          url: await this.getPublicUrl(storageKey),
          localPath: destination,
          originalName,
          contentType,
          size: sizeBytes
        };
      }
      async getObject(key) {
        return fsp.readFile(this.resolveKey(key));
      }
      async getPublicUrl(key) {
        return `${this.publicBasePath}/${encodePublicPath(assertSafeStorageKey(key))}`;
      }
      async listObjects(prefix = "rayoboss/") {
        const normalized = String(prefix || "rayoboss/").replace(/^\/+/, "");
        const start = path.resolve(this.rootDir, ...normalized.split("/").filter(Boolean));
        const relative = path.relative(this.rootDir, start);
        if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Prefijo local inv\xE1lido.");
        const output = [];
        const walk = async (directory) => {
          let entries;
          try {
            entries = await fsp.readdir(directory, { withFileTypes: true });
          } catch (error) {
            if (error.code === "ENOENT") return;
            throw error;
          }
          for (const entry of entries) {
            if (entry.name === ".tmp") continue;
            const full = path.join(directory, entry.name);
            if (entry.isDirectory()) await walk(full);
            else if (entry.isFile()) {
              const stat = await fsp.stat(full);
              const key = path.relative(this.rootDir, full).split(path.sep).join("/");
              output.push({ key, url: await this.getPublicUrl(key), size: stat.size, uploadedAt: stat.mtime.toISOString(), provider: this.id });
            }
          }
        };
        await walk(start);
        return output;
      }
      async deleteObject(itemOrKey) {
        const key = typeof itemOrKey === "string" ? itemOrKey : itemOrKey?.storageKey;
        const legacyPath = typeof itemOrKey === "object" ? itemOrKey?.localPath : null;
        let target;
        if (key) target = this.resolveKey(key);
        else if (legacyPath) {
          target = path.resolve(legacyPath);
          const relative = path.relative(this.rootDir, target);
          if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Archivo local fuera del almacenamiento permitido.");
        } else return { deleted: false };
        await fsp.rm(target, { force: true });
        return { deleted: true };
      }
      async exists(key) {
        try {
          await fsp.access(this.resolveKey(key));
          return true;
        } catch (_) {
          return false;
        }
      }
      async getMetadata(key) {
        const storageKey = assertSafeStorageKey(key);
        const stat = await fsp.stat(this.resolveKey(storageKey));
        return { key: storageKey, url: await this.getPublicUrl(storageKey), size: stat.size, uploadedAt: stat.mtime.toISOString(), provider: this.id };
      }
    };
    module2.exports = LocalDiskStorageProvider;
  }
});

// server/core/storage/vercel-blob-storage-provider.js
var require_vercel_blob_storage_provider = __commonJS({
  "server/core/storage/vercel-blob-storage-provider.js"(exports2, module2) {
    var StorageProvider = require_storage_provider();
    var { assertSafeStorageKey } = require_storage_keys();
    var { badRequest } = require_errors();
    var VercelBlobStorageProvider = class extends StorageProvider {
      constructor({ token }) {
        super({ id: "vercel-blob", writable: Boolean(token), uploadMode: token ? "direct" : "none" });
        if (!token) throw new Error("VercelBlobStorageProvider requiere BLOB_READ_WRITE_TOKEN.");
        this.token = token;
      }
      async saveObject({ key, body, contentType = "application/octet-stream", sizeBytes = null, originalName = null }) {
        const storageKey = assertSafeStorageKey(key);
        const { put } = await import("@vercel/blob");
        const blob = await put(storageKey, body, {
          access: "public",
          contentType,
          token: this.token,
          addRandomSuffix: false
        });
        return {
          provider: this.id,
          storage: "vercel-blob",
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
      async getPublicUrl(key) {
        return (await this.getMetadata(key)).url;
      }
      async listObjects(prefix = "rayoboss/") {
        const { list } = await import("@vercel/blob");
        const output = [];
        let cursor;
        do {
          const result = await list({ prefix, cursor, limit: 1e3, token: this.token });
          output.push(...result.blobs.map((blob) => ({
            key: blob.pathname,
            url: blob.url,
            size: blob.size,
            uploadedAt: blob.uploadedAt,
            provider: this.id
          })));
          cursor = result.hasMore ? result.cursor : void 0;
        } while (cursor && output.length < 1e4);
        return output;
      }
      async deleteObject(itemOrKey) {
        const target = typeof itemOrKey === "string" ? itemOrKey : itemOrKey?.url || itemOrKey?.storageKey || itemOrKey?.pathname;
        if (!target) return { deleted: false };
        const { del } = await import("@vercel/blob");
        await del(target, { token: this.token });
        return { deleted: true };
      }
      async exists(key) {
        try {
          await this.getMetadata(key);
          return true;
        } catch (_) {
          return false;
        }
      }
      async getMetadata(key) {
        const storageKey = assertSafeStorageKey(key);
        const { head } = await import("@vercel/blob");
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
        const { handleUpload } = await import("@vercel/blob/client");
        return handleUpload({
          body,
          request: req,
          token: this.token,
          onBeforeGenerateToken: async (pathname, clientPayload) => {
            const actor = await getActor(req);
            let payload;
            try {
              payload = JSON.parse(clientPayload || "{}");
            } catch (_) {
              badRequest("Metadatos de carga inv\xE1lidos.");
            }
            const storageKey = assertSafeStorageKey(pathname);
            if (payload.storageKey !== storageKey) badRequest("La ruta de carga no coincide con la autorizaci\xF3n.");
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
    };
    module2.exports = VercelBlobStorageProvider;
  }
});

// server/core/storage/read-only-storage-provider.js
var require_read_only_storage_provider = __commonJS({
  "server/core/storage/read-only-storage-provider.js"(exports2, module2) {
    var StorageProvider = require_storage_provider();
    var { badRequest } = require_errors();
    var ReadOnlyStorageProvider = class extends StorageProvider {
      constructor({ id = "vercel-demo-readonly", reason = "Almacenamiento persistente no configurado." } = {}) {
        super({ id, writable: false, uploadMode: "none" });
        this.reason = reason;
      }
      describe() {
        return { ...super.describe(), reason: this.reason };
      }
      async saveObject() {
        badRequest(this.reason);
      }
      async storeUploadedFile() {
        badRequest(this.reason);
      }
      async deleteObject() {
        badRequest(this.reason);
      }
      async handleDirectUpload() {
        badRequest(this.reason);
      }
      async getObject() {
        badRequest(this.reason);
      }
      async getPublicUrl() {
        badRequest(this.reason);
      }
      async listObjects() {
        return [];
      }
      async exists() {
        return false;
      }
      async getMetadata() {
        badRequest(this.reason);
      }
    };
    module2.exports = ReadOnlyStorageProvider;
  }
});

// server/core/storage/storage-factory.js
var require_storage_factory = __commonJS({
  "server/core/storage/storage-factory.js"(exports2, module2) {
    var cfg = require_config();
    var LocalDiskStorageProvider = require_local_disk_storage_provider();
    var VercelBlobStorageProvider = require_vercel_blob_storage_provider();
    var ReadOnlyStorageProvider = require_read_only_storage_provider();
    var { badRequest } = require_errors();
    var currentProvider = null;
    var localProvider = null;
    var blobProvider = null;
    function createLocalProvider() {
      if (!cfg.storage.localRootDir) throw new Error("El proveedor local no est\xE1 disponible en este entorno.");
      if (!localProvider) localProvider = new LocalDiskStorageProvider({
        rootDir: cfg.storage.localRootDir,
        publicBasePath: cfg.storage.localPublicPath
      });
      return localProvider;
    }
    function createBlobProvider() {
      if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN no est\xE1 disponible.");
      if (!blobProvider) blobProvider = new VercelBlobStorageProvider({ token: process.env.BLOB_READ_WRITE_TOKEN });
      return blobProvider;
    }
    function createStorageProvider() {
      const requested = cfg.storage.provider;
      if (requested === "local") {
        if (cfg.isVercel) throw new Error("[config] RAYOBOSS_STORAGE_PROVIDER=local no es v\xE1lido en Vercel. Usa auto o vercel-blob.");
        return createLocalProvider();
      }
      if (requested === "vercel-blob") return createBlobProvider();
      if (requested !== "auto") throw new Error(`[config] Proveedor de almacenamiento no soportado: ${requested}`);
      if (cfg.isVercel) {
        return process.env.BLOB_READ_WRITE_TOKEN ? createBlobProvider() : new ReadOnlyStorageProvider({ reason: "Crea y conecta un Vercel Blob Store p\xFAblico para habilitar cargas persistentes." });
      }
      return createLocalProvider();
    }
    function getStorageProvider() {
      if (!currentProvider) currentProvider = createStorageProvider();
      return currentProvider;
    }
    function providerIdForItem(item) {
      return item?.provider || (item?.storage === "local" ? "local-disk" : item?.storage) || null;
    }
    function getProviderForItem(item) {
      const id = providerIdForItem(item);
      if (!id || item?.bundled) return null;
      if (id === "local-disk" || id === "local") return createLocalProvider();
      if (id === "vercel-blob") {
        if (!process.env.BLOB_READ_WRITE_TOKEN) badRequest("No hay credenciales de Vercel Blob para eliminar este archivo.");
        return createBlobProvider();
      }
      badRequest(`Proveedor de almacenamiento desconocido en el cat\xE1logo: ${id}`);
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
    module2.exports = { createStorageProvider, getStorageProvider, getProviderForItem, deleteStoredObject, providerIdForItem, _resetForTests: resetForTests };
  }
});

// server/routes/media.js
var require_media = __commonJS({
  "server/routes/media.js"(exports2, module2) {
    var path = require("path");
    var router = require("express").Router();
    var multer = require("multer");
    var cfg = require_config();
    var media = require_media_library();
    var validation = require_validation();
    var sessions = require_sessions();
    var users = require_users();
    var security = require_security();
    var storageFactory = require_storage_factory();
    var { keyMatchesCategory } = require_storage_keys();
    var { auth, asyncRoute } = security;
    var { forbidden, badRequest } = require_errors();
    var LICENSE_MAX_BYTES = 25 * 1024 * 1024;
    function mediaRoles() {
      return ["desarrollador", "administrador"];
    }
    function parseMetadata(value) {
      try {
        return typeof value === "string" ? JSON.parse(value || "{}") : value || {};
      } catch (_) {
        badRequest("Metadatos multimedia inv\xE1lidos.");
      }
    }
    function uploadedDescriptor(file) {
      return { originalName: file?.originalname, contentType: file?.mimetype, sizeBytes: file?.size };
    }
    var storage = storageFactory.getStorageProvider();
    var serverUpload = storage.getServerUploadConfig();
    var upload = serverUpload ? multer({
      dest: serverUpload.tempDir,
      limits: { fileSize: cfg.media.maxUploadBytes, files: 2 },
      fileFilter: (req, file, cb) => {
        try {
          if (file.fieldname === "file") media.validateMediaDescriptor(uploadedDescriptor(file));
          else if (file.fieldname === "licenseFile") media.validateLicenseDescriptor(uploadedDescriptor(file));
          else return cb(new Error("Campo de archivo no reconocido."));
          cb(null, true);
        } catch (error) {
          cb(error);
        }
      }
    }) : null;
    function storageRecord(metadata, descriptor, originalName) {
      return {
        provider: storage.id,
        storage: storage.id === "local-disk" ? "local" : storage.id,
        storageKey: metadata.key || metadata.pathname,
        pathname: metadata.key || metadata.pathname,
        url: metadata.url,
        originalName: originalName || path.basename(metadata.key || metadata.pathname || "archivo"),
        contentType: metadata.contentType || descriptor.contentType,
        size: metadata.size == null ? null : metadata.size
      };
    }
    async function verifiedStoredObject({ storageKey, originalName, contentType, sizeBytes, category, assetType = "media" }) {
      if (!storage.writable) badRequest("El proveedor de almacenamiento activo es de solo lectura.");
      if (assetType === "media" && !keyMatchesCategory(storageKey, category)) badRequest("El archivo no corresponde a la categor\xEDa seleccionada.");
      if (assetType === "license" && !keyMatchesCategory(storageKey, "licenses")) badRequest("La ruta del soporte de licencia no es v\xE1lida.");
      const metadata = await storage.getMetadata(storageKey).catch(() => badRequest("El archivo no existe en el almacenamiento conectado."));
      const actualType = String(metadata.contentType || contentType || "").toLowerCase();
      const descriptor = assetType === "license" ? media.validateLicenseDescriptor({ originalName, contentType: actualType, sizeBytes: metadata.size ?? sizeBytes }) : media.validateMediaDescriptor({ originalName, contentType: actualType });
      if (assetType === "media" && Number(metadata.size ?? sizeBytes) > cfg.media.maxUploadBytes) badRequest("El archivo supera el tama\xF1o m\xE1ximo permitido.");
      return storageRecord(metadata, descriptor, originalName);
    }
    async function deleteStored(record) {
      if (!record) return;
      const provider = storageFactory.getProviderForItem(record);
      if (provider) await provider.deleteObject(record);
    }
    async function finishCatalogWrite(actor, metadata, stored, licenseStored, replaceItemId) {
      if (replaceItemId) {
        const result = await media.replaceUploaded(actor, replaceItemId, metadata, stored, licenseStored);
        if (result.previous) {
          await storageFactory.deleteStoredObject(result.previous).catch(() => {
          });
          if (licenseStored && result.previous.rights?.document) await deleteStored(result.previous.rights.document).catch(() => {
          });
        }
        return result.item;
      }
      return media.addUploaded(actor, metadata, stored, licenseStored);
    }
    router.get("/media/config", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      const description = storage.describe();
      res.json({
        ...description,
        maxUploadBytes: cfg.media.maxUploadBytes,
        maxLicenseBytes: LICENSE_MAX_BYTES,
        categories: media.categories(),
        licenseTypes: media.licenseTypes(),
        blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN)
      });
    }));
    router.get("/media", auth("desarrollador", "administrador", "locutor"), asyncRoute(async (req, res) => {
      res.json({
        items: await media.list({ category: req.query.category || "", includeInactive: true }),
        categories: media.categories(),
        licenseTypes: media.licenseTypes()
      });
    }));
    router.get("/media/orphans", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      if (!storage.writable) return res.json({ items: [] });
      const [objects, catalog] = await Promise.all([storage.listObjects("rayoboss/"), media.list({ includeInactive: true })]);
      const registered = /* @__PURE__ */ new Set();
      for (const item of catalog) {
        if (item.storageKey) registered.add(item.storageKey);
        if (item.rights?.document?.storageKey) registered.add(item.rights.document.storageKey);
      }
      const items = objects.filter((object) => !registered.has(object.key) && !object.key.startsWith("rayoboss/licenses/")).map((object) => ({ ...object, originalName: path.basename(object.key) }));
      res.json({ items });
    }));
    router.post("/media/import-stored", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      const body = validation.objectBody(req);
      const metadata = parseMetadata(body.metadata);
      const originalName = String(body.originalName || path.basename(String(body.storageKey || "archivo")));
      const stored = await verifiedStoredObject({
        storageKey: body.storageKey,
        originalName,
        contentType: metadata.contentType,
        sizeBytes: body.sizeBytes,
        category: metadata.category
      });
      metadata.contentType = stored.contentType;
      const item = await media.addUploaded(req.actor, metadata, stored);
      res.json({ ok: true, item });
    }));
    router.post("/media/confirm-upload", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      if (storage.uploadMode !== "direct") badRequest("La confirmaci\xF3n directa solo est\xE1 disponible con Vercel Blob.");
      const body = validation.objectBody(req);
      const metadata = parseMetadata(body.metadata);
      const stored = await verifiedStoredObject({
        storageKey: body.storageKey,
        originalName: body.originalName,
        contentType: metadata.contentType,
        sizeBytes: body.sizeBytes,
        category: metadata.category
      });
      metadata.contentType = stored.contentType;
      let licenseStored = null;
      if (body.licenseStorageKey) {
        licenseStored = await verifiedStoredObject({
          storageKey: body.licenseStorageKey,
          originalName: body.licenseOriginalName,
          contentType: body.licenseContentType,
          sizeBytes: body.licenseSizeBytes,
          assetType: "license"
        });
      }
      const item = await finishCatalogWrite(req.actor, metadata, stored, licenseStored, String(body.replaceItemId || ""));
      res.json({ ok: true, item });
    }));
    router.patch("/media/:id", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      res.json({ ok: true, item: await media.update(req.actor, req.params.id, validation.objectBody(req)) });
    }));
    router.post("/media/:id/license", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      if (storage.uploadMode !== "direct") badRequest("Esta confirmaci\xF3n de licencia requiere carga directa.");
      const body = validation.objectBody(req);
      const stored = await verifiedStoredObject({
        storageKey: body.storageKey,
        originalName: body.originalName,
        contentType: body.contentType,
        sizeBytes: body.sizeBytes,
        assetType: "license"
      });
      const result = await media.attachLicense(req.actor, req.params.id, stored, body);
      if (result.previous && result.previous.storageKey !== stored.storageKey) await deleteStored(result.previous).catch(() => {
      });
      res.json({ ok: true, item: result.item });
    }));
    router.delete("/media/:id", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      const item = await media.get(req.params.id);
      await storageFactory.deleteStoredObject(item);
      if (item.rights?.document) await deleteStored(item.rights.document);
      await media.remove(req.actor, req.params.id);
      res.json({ ok: true });
    }));
    if (upload) {
      router.post("/media/local-upload", auth("desarrollador", "administrador"), upload.fields([
        { name: "file", maxCount: 1 },
        { name: "licenseFile", maxCount: 1 }
      ]), asyncRoute(async (req, res) => {
        const file = req.files?.file?.[0];
        const licenseFile = req.files?.licenseFile?.[0];
        if (!file) badRequest("Selecciona un archivo de audio o video.");
        let stored = null;
        let licenseStored = null;
        try {
          const metadata = parseMetadata(req.body.metadata);
          const descriptor = media.validateMediaDescriptor(uploadedDescriptor(file));
          metadata.contentType = descriptor.contentType;
          media.normalizeMetadata(metadata, req.actor);
          stored = await storage.storeUploadedFile({
            tempPath: file.path,
            originalName: file.originalname,
            contentType: descriptor.contentType,
            sizeBytes: file.size,
            category: metadata.category
          });
          if (licenseFile) {
            const licenseDescriptor = media.validateLicenseDescriptor(uploadedDescriptor(licenseFile));
            licenseStored = await storage.storeUploadedFile({
              tempPath: licenseFile.path,
              originalName: licenseFile.originalname,
              contentType: licenseDescriptor.contentType,
              sizeBytes: licenseFile.size,
              category: "licenses"
            });
          }
          const item = await finishCatalogWrite(req.actor, metadata, stored, licenseStored, String(req.body.replaceItemId || ""));
          res.json({ ok: true, item });
        } catch (error) {
          if (stored) await storage.deleteObject(stored).catch(() => {
          });
          if (licenseStored) await storage.deleteObject(licenseStored).catch(() => {
          });
          const fs = require("fs/promises");
          for (const pending of [file, licenseFile]) if (pending?.path) await fs.rm(pending.path, { force: true }).catch(() => {
          });
          throw error;
        }
      }));
      router.post("/media/:id/license-upload", auth("desarrollador", "administrador"), upload.single("licenseFile"), asyncRoute(async (req, res) => {
        if (!req.file) badRequest("Selecciona el soporte de licencia.");
        let stored = null;
        try {
          const descriptor = media.validateLicenseDescriptor(uploadedDescriptor(req.file));
          stored = await storage.storeUploadedFile({
            tempPath: req.file.path,
            originalName: req.file.originalname,
            contentType: descriptor.contentType,
            sizeBytes: req.file.size,
            category: "licenses"
          });
          const result = await media.attachLicense(req.actor, req.params.id, stored, parseMetadata(req.body.metadata));
          if (result.previous) await deleteStored(result.previous).catch(() => {
          });
          res.json({ ok: true, item: result.item });
        } catch (error) {
          if (stored) await storage.deleteObject(stored).catch(() => {
          });
          else if (req.file?.path) {
            const fs = require("fs/promises");
            await fs.rm(req.file.path, { force: true }).catch(() => {
            });
          }
          throw error;
        }
      }));
    }
    router.post("/media/upload-plan", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      if (storage.uploadMode !== "direct") badRequest("El proveedor activo no admite carga directa desde el navegador.");
      const body = validation.objectBody(req);
      const assetType = body.assetType === "license" ? "license" : "media";
      const sizeBytes = Number(body.sizeBytes);
      const maximum = assetType === "license" ? LICENSE_MAX_BYTES : cfg.media.maxUploadBytes;
      if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > maximum) badRequest("Tama\xF1o de archivo inv\xE1lido.");
      let descriptor;
      let category;
      if (assetType === "license") {
        descriptor = media.validateLicenseDescriptor({ originalName: body.originalName, contentType: body.contentType, sizeBytes });
        category = "licenses";
      } else {
        const metadata = parseMetadata(body.metadata);
        descriptor = media.validateMediaDescriptor({ originalName: body.originalName, contentType: body.contentType });
        metadata.contentType = descriptor.contentType;
        media.normalizeMetadata(metadata, req.actor);
        category = metadata.category;
      }
      const storageKey = storage.createStorageKey({ category, originalName: body.originalName });
      res.json({ storageKey, assetType, contentType: descriptor.contentType });
    }));
    async function actorFromRequest(req) {
      const token = security.getToken(req);
      const session = sessions.getSession(token);
      if (!session) forbidden("Sesi\xF3n requerida para cargar archivos.");
      const actor = await users.findUser(session.username);
      if (!actor || !mediaRoles().includes(actor.role) || actor.sessionVersion !== session.sessionVersion) forbidden("Sin permiso para cargar archivos.");
      return { username: actor.username, role: actor.role };
    }
    router.post("/media/blob-upload", asyncRoute(async (req, res) => {
      if (storage.uploadMode !== "direct") badRequest("Vercel Blob no est\xE1 configurado en este despliegue.");
      const result = await storage.handleDirectUpload({
        req,
        body: req.body,
        getActor: actorFromRequest,
        authorizeUpload: async ({ actor, storageKey, payload }) => {
          const assetType = payload.assetType === "license" ? "license" : "media";
          if (assetType === "license") {
            if (!keyMatchesCategory(storageKey, "licenses")) badRequest("Ruta de licencia no autorizada.");
            const descriptor2 = media.validateLicenseDescriptor(payload);
            return { contentType: descriptor2.contentType, maximumSizeInBytes: LICENSE_MAX_BYTES };
          }
          const metadata = parseMetadata(payload.metadata);
          const descriptor = media.validateMediaDescriptor(payload);
          metadata.contentType = descriptor.contentType;
          media.normalizeMetadata(metadata, actor);
          if (!keyMatchesCategory(storageKey, metadata.category)) badRequest("La ruta no coincide con la categor\xEDa autorizada.");
          return { contentType: descriptor.contentType, maximumSizeInBytes: cfg.media.maxUploadBytes };
        }
      });
      res.json(result);
    }));
    module2.exports = router;
  }
});

// server/core/programming.js
var require_programming = __commonJS({
  "server/core/programming.js"(exports2, module2) {
    var path = require("path");
    var cfg = require_config();
    var media = require_media_library();
    var runtimeStore = require_runtime_store();
    var { writePrimary, readRecoverable } = require_storage();
    var { badRequest } = require_errors();
    var KEY = "programming-v4";
    var LEGACY_KEY = "programming-v302";
    var FILE = cfg.dataDir ? path.join(cfg.dataDir, "programming.json") : null;
    var localState = null;
    var queue = Promise.resolve();
    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }
    function seed() {
      return {
        schemaVersion: 2,
        revision: 1,
        playlists: [
          {
            id: "continuidad-demo",
            name: "Continuidad multimedia de demostraci\xF3n",
            itemIds: ["demo-indie", "demo-graduacion"],
            shuffle: false,
            repeat: true
          },
          {
            id: "solo-audio-demo",
            name: "M\xFAsica libre de demostraci\xF3n",
            itemIds: ["demo-indie"],
            shuffle: false,
            repeat: true
          }
        ],
        schedule: [
          {
            id: "franja-general",
            name: "Programaci\xF3n general",
            days: [0, 1, 2, 3, 4, 5, 6],
            start: "00:00",
            end: "23:59",
            playlistId: "continuidad-demo",
            enabled: true
          }
        ],
        continuity: {
          stationIdEveryTracks: 2,
          stationIdItemIds: ["demo-id"],
          cueEveryMinutes: 1,
          cueItemIds: ["demo-cuna"],
          cueOrder: "sequential",
          crossfadeSeconds: 1.5,
          fallbackPlaylistId: "continuidad-demo"
        }
      };
    }
    function migrate(input) {
      if (!input || typeof input !== "object") return seed();
      const state = clone(input);
      if (state.schemaVersion === 1) {
        state.schemaVersion = 2;
        state.schedule = Array.isArray(state.schedule) ? state.schedule.map((slot) => ({ ...slot, enabled: slot.enabled !== false })) : [];
      }
      return state;
    }
    async function persist(state) {
      state.revision = (state.revision || 0) + 1;
      if (cfg.isVercel) {
        await runtimeStore.set(KEY, state, {
          ttl: 31536e3,
          name: "Programaci\xF3n AutoDJ RayoBoss 4",
          tags: ["rayoboss-programming"]
        });
      } else if (FILE) {
        writePrimary(FILE, state);
      }
    }
    async function load({ fresh = false } = {}) {
      if (localState && !fresh && !cfg.isVercel) return localState;
      let state = cfg.isVercel ? await runtimeStore.get(KEY) : FILE ? readRecoverable(FILE) : null;
      if (!state && cfg.isVercel) state = await runtimeStore.get(LEGACY_KEY);
      if (!state) {
        state = seed();
        await persist(state);
      } else {
        const migrated = migrate(state);
        if (migrated.schemaVersion !== state.schemaVersion) await persist(migrated);
        state = migrated;
      }
      if (!state || state.schemaVersion !== 2 || !Array.isArray(state.playlists) || !Array.isArray(state.schedule)) {
        throw new Error("Programaci\xF3n inv\xE1lida. Restaura una copia o usa el restablecimiento administrativo.");
      }
      localState = state;
      return state;
    }
    function parseClock(value) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value))) badRequest("Hora inv\xE1lida; usa HH:MM.");
      const [hours, minutes] = String(value).split(":").map(Number);
      return hours * 60 + minutes;
    }
    function safeId(value, field) {
      const id = String(value || "").trim();
      if (!/^[a-z0-9_-]{2,48}$/i.test(id)) badRequest(`${field} inv\xE1lido.`);
      return id;
    }
    function endExclusive(value) {
      const minute = parseClock(value);
      return minute === 1439 ? 1440 : minute;
    }
    function scheduleSegments(slot) {
      const start = parseClock(slot.start);
      const end = endExclusive(slot.end);
      const segments = [];
      for (const day of slot.days) {
        if (end > start) {
          segments.push({ day, start, end, slot });
        } else {
          segments.push({ day, start, end: 1440, slot });
          if (end > 0) segments.push({ day: (day + 1) % 7, start: 0, end, slot });
        }
      }
      return segments;
    }
    function validateNoOverlaps(schedule) {
      const byDay = Array.from({ length: 7 }, () => []);
      for (const slot of schedule.filter((item) => item.enabled !== false)) {
        for (const segment of scheduleSegments(slot)) byDay[segment.day].push(segment);
      }
      for (let day = 0; day < byDay.length; day++) {
        const sorted = byDay[day].sort((a, b) => a.start - b.start || a.end - b.end);
        for (let index = 1; index < sorted.length; index++) {
          const previous = sorted[index - 1];
          const current = sorted[index];
          if (current.start < previous.end && current.slot.id !== previous.slot.id) {
            badRequest(`Las franjas \u201C${previous.slot.name}\u201D y \u201C${current.slot.name}\u201D se superponen.`);
          }
        }
      }
    }
    function validate(input) {
      if (!input || !Array.isArray(input.playlists) || !Array.isArray(input.schedule) || !input.continuity) {
        badRequest("Configuraci\xF3n de programaci\xF3n inv\xE1lida.");
      }
      const state = clone(input);
      if (state.playlists.length < 1 || state.playlists.length > 100) badRequest("Debe existir entre 1 y 100 playlists.");
      if (state.schedule.length > 250) badRequest("La programaci\xF3n supera 250 franjas.");
      const playlistIds = /* @__PURE__ */ new Set();
      for (const playlist of state.playlists) {
        playlist.id = safeId(playlist.id, "Identificador de playlist");
        playlist.name = String(playlist.name || "").trim().slice(0, 100);
        if (!playlist.name || playlistIds.has(playlist.id) || !Array.isArray(playlist.itemIds)) {
          badRequest("Playlist inv\xE1lida o duplicada.");
        }
        playlistIds.add(playlist.id);
        playlist.itemIds = [...new Set(playlist.itemIds.map(String))].slice(0, 500);
        playlist.shuffle = Boolean(playlist.shuffle);
        playlist.repeat = playlist.repeat !== false;
      }
      const slotIds = /* @__PURE__ */ new Set();
      for (const slot of state.schedule) {
        slot.id = safeId(slot.id, "Identificador de franja");
        slot.name = String(slot.name || "").trim().slice(0, 100);
        slot.playlistId = String(slot.playlistId || "");
        slot.days = Array.isArray(slot.days) ? [...new Set(slot.days.map(Number))].sort() : [];
        slot.enabled = slot.enabled !== false;
        if (!slot.name || slotIds.has(slot.id) || !playlistIds.has(slot.playlistId) || !slot.days.length || !slot.days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)) {
          badRequest("Franja de programaci\xF3n inv\xE1lida o duplicada.");
        }
        slotIds.add(slot.id);
        const startMinute = parseClock(slot.start);
        const endMinute = endExclusive(slot.end);
        if (startMinute === endMinute) badRequest(`La franja \u201C${slot.name}\u201D debe tener horas distintas.`);
      }
      validateNoOverlaps(state.schedule);
      const continuity = state.continuity;
      continuity.stationIdEveryTracks = Math.max(0, Math.min(50, Number(continuity.stationIdEveryTracks) || 0));
      continuity.cueEveryMinutes = Math.max(0, Math.min(240, Number(continuity.cueEveryMinutes) || 0));
      continuity.crossfadeSeconds = Math.max(0, Math.min(10, Number(continuity.crossfadeSeconds) || 0));
      continuity.cueOrder = ["sequential", "random"].includes(continuity.cueOrder) ? continuity.cueOrder : "sequential";
      if (!playlistIds.has(continuity.fallbackPlaylistId)) continuity.fallbackPlaylistId = state.playlists[0].id;
      continuity.stationIdItemIds = Array.isArray(continuity.stationIdItemIds) ? [...new Set(continuity.stationIdItemIds.map(String))].slice(0, 100) : [];
      continuity.cueItemIds = Array.isArray(continuity.cueItemIds) ? [...new Set(continuity.cueItemIds.map(String))].slice(0, 100) : [];
      state.schemaVersion = 2;
      return state;
    }
    function replace(actor, input) {
      const run = queue.then(async () => {
        const state = validate(input);
        state.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        state.updatedBy = actor.username;
        await persist(state);
        localState = state;
        return clone(state);
      });
      queue = run.catch(() => {
      });
      return run;
    }
    function reset(actor) {
      return replace(actor, seed());
    }
    function activeSlot(state, date = /* @__PURE__ */ new Date()) {
      const day = date.getDay();
      const minute = date.getHours() * 60 + date.getMinutes();
      return state.schedule.find((slot) => {
        if (slot.enabled === false) return false;
        const start = parseClock(slot.start);
        const end = endExclusive(slot.end);
        if (end > start) return slot.days.includes(day) && minute >= start && minute < end;
        const previousDay = (day + 6) % 7;
        return slot.days.includes(day) && minute >= start || slot.days.includes(previousDay) && minute < end;
      }) || null;
    }
    function deterministicShuffle(items, seedValue) {
      const output = [...items];
      let seedValueMutable = seedValue >>> 0;
      for (let index = output.length - 1; index > 0; index--) {
        seedValueMutable = seedValueMutable * 1664525 + 1013904223 >>> 0;
        const selected = seedValueMutable % (index + 1);
        [output[index], output[selected]] = [output[selected], output[index]];
      }
      return output;
    }
    function composeTimeline(playlist, catalog, continuity, seedValue) {
      let base = playlist.itemIds.map((id) => catalog.find((item) => item.id === id && item.active)).filter(Boolean);
      if (playlist.shuffle) base = deterministicShuffle(base, seedValue);
      if (!base.length) return [];
      const stationIds = continuity.stationIdItemIds.map((id) => catalog.find((item) => item.id === id && item.active)).filter(Boolean);
      const cues = continuity.cueItemIds.map((id) => catalog.find((item) => item.id === id && item.active)).filter(Boolean);
      const timeline = [];
      let elapsed = 0;
      let lastCueAt = 0;
      let stationIndex = 0;
      let cueIndex = 0;
      const baseDuration = base.reduce((sum, item) => sum + (item.durationSeconds || 30), 0);
      const rounds = Math.max(3, Math.ceil(600 / Math.max(1, baseDuration)));
      for (let round = 0; round < rounds; round++) {
        for (let index = 0; index < base.length; index++) {
          const item = base[index];
          timeline.push(item);
          elapsed += item.durationSeconds || 30;
          const trackNumber = round * base.length + index + 1;
          if (continuity.stationIdEveryTracks > 0 && stationIds.length && trackNumber % continuity.stationIdEveryTracks === 0) {
            const stationId = stationIds[stationIndex++ % stationIds.length];
            timeline.push(stationId);
            elapsed += stationId.durationSeconds || 3;
          }
          if (continuity.cueEveryMinutes > 0 && cues.length && elapsed - lastCueAt >= continuity.cueEveryMinutes * 60) {
            const selected = continuity.cueOrder === "random" ? cues[(seedValue + cueIndex * 7) % cues.length] : cues[cueIndex % cues.length];
            cueIndex++;
            timeline.push(selected);
            elapsed += selected.durationSeconds || 15;
            lastCueAt = elapsed;
          }
        }
      }
      return timeline;
    }
    async function now(date = /* @__PURE__ */ new Date()) {
      const state = await load({ fresh: cfg.isVercel });
      const catalog = await media.list({ includeInactive: false });
      const slot = activeSlot(state, date);
      const playlistId = slot ? slot.playlistId : state.continuity.fallbackPlaylistId;
      const playlist = state.playlists.find((item) => item.id === playlistId) || state.playlists[0];
      if (!playlist) return { item: null, next: null, playlist: null, slot, offsetSeconds: 0, remainingSeconds: 0, progressPercent: 0, crossfadeSeconds: 0 };
      const daySeed = Number(date.toISOString().slice(0, 10).replace(/-/g, ""));
      const timeline = composeTimeline(playlist, catalog, state.continuity, daySeed);
      const total = timeline.reduce((sum, item) => sum + (item.durationSeconds || 30), 0);
      if (!timeline.length || total <= 0) {
        return { item: null, next: null, playlist: { id: playlist.id, name: playlist.name }, slot, offsetSeconds: 0, remainingSeconds: 0, progressPercent: 0, crossfadeSeconds: state.continuity.crossfadeSeconds };
      }
      const epochSeconds = Math.floor(date.getTime() / 1e3);
      const cycle = Math.floor(epochSeconds / total);
      let cursor = epochSeconds % total;
      for (let index = 0; index < timeline.length; index++) {
        const duration = timeline[index].durationSeconds || 30;
        if (cursor < duration) {
          return {
            item: timeline[index],
            next: timeline[(index + 1) % timeline.length],
            playlist: { id: playlist.id, name: playlist.name },
            slot,
            offsetSeconds: cursor,
            remainingSeconds: Math.max(0, duration - cursor),
            progressPercent: Math.min(100, Math.max(0, cursor / duration * 100)),
            crossfadeSeconds: state.continuity.crossfadeSeconds,
            startedAt: new Date((epochSeconds - cursor) * 1e3).toISOString(),
            playoutKey: `autodj:${state.revision || 0}:${playlist.id}:${cycle}:${index}`
          };
        }
        cursor -= duration;
      }
      return { item: timeline[0], next: timeline[1] || timeline[0], playlist: { id: playlist.id, name: playlist.name }, slot, offsetSeconds: 0, remainingSeconds: timeline[0].durationSeconds || 30, progressPercent: 0, crossfadeSeconds: state.continuity.crossfadeSeconds, startedAt: date.toISOString(), playoutKey: `autodj:${state.revision || 0}:${playlist.id}:${cycle}:0` };
    }
    async function get() {
      return clone(await load({ fresh: cfg.isVercel }));
    }
    module2.exports = { get, replace, reset, now, _resetForTests: () => {
      localState = null;
      queue = Promise.resolve();
    } };
  }
});

// server/routes/programming.js
var require_programming2 = __commonJS({
  "server/routes/programming.js"(exports2, module2) {
    var router = require("express").Router();
    var programming = require_programming();
    var validation = require_validation();
    var { auth, asyncRoute } = require_security();
    router.get("/programming", auth("desarrollador", "administrador", "locutor"), asyncRoute(async (req, res) => {
      res.json(await programming.get());
    }));
    router.put("/programming", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      res.json({ ok: true, programming: await programming.replace(req.actor, validation.objectBody(req)) });
    }));
    router.post("/programming/reset", auth("desarrollador", "administrador"), asyncRoute(async (req, res) => {
      res.json({ ok: true, programming: await programming.reset(req.actor) });
    }));
    module2.exports = router;
  }
});

// server/core/playback-history.js
var require_playback_history = __commonJS({
  "server/core/playback-history.js"(exports2, module2) {
    var path = require("path");
    var crypto = require("crypto");
    var cfg = require_config();
    var runtimeStore = require_runtime_store();
    var { writePrimary, readRecoverable } = require_storage();
    var { badRequest } = require_errors();
    var KEY = "playback-history-v1";
    var FILE = cfg.dataDir ? path.join(cfg.dataDir, "playback-history.json") : null;
    var RETENTION_MONTHS = 36;
    var MAX_EVENTS = 1e5;
    var localState = null;
    var queue = Promise.resolve();
    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }
    function empty() {
      return { schemaVersion: 1, revision: 1, events: [] };
    }
    function validMonth(value) {
      const month = String(value || "").trim();
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) badRequest("Mes inv\xE1lido; usa AAAA-MM.");
      return month;
    }
    function monthOf(value) {
      return String(value).slice(0, 7);
    }
    function retentionCutoff() {
      const date = /* @__PURE__ */ new Date();
      date.setUTCDate(1);
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCMonth(date.getUTCMonth() - RETENTION_MONTHS);
      return date.getTime();
    }
    function validate(state) {
      if (!state || state.schemaVersion !== 1 || !Array.isArray(state.events)) throw new Error("Hist\xF3rico de reproducci\xF3n inv\xE1lido.");
      return state;
    }
    async function persist(state) {
      state.revision = (state.revision || 0) + 1;
      if (cfg.isVercel) {
        await runtimeStore.set(KEY, state, { ttl: 94608e3, name: "Hist\xF3rico de reproducci\xF3n RayoBoss", tags: ["rayoboss-playback"] });
      } else if (FILE) writePrimary(FILE, state);
    }
    async function load({ fresh = false } = {}) {
      if (localState && !fresh && !cfg.isVercel) return localState;
      let state = cfg.isVercel ? await runtimeStore.get(KEY) : FILE ? readRecoverable(FILE) : null;
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
        state.events = state.events.filter((event) => Date.parse(event.playedAt) >= cutoff).slice(-MAX_EVENTS);
        await persist(state);
        localState = state;
        return outcome && Object.prototype.hasOwnProperty.call(outcome, "result") ? outcome.result : outcome;
      };
      const run = queue.then(execute, execute);
      queue = run.catch(() => {
      });
      return run;
    }
    function snapshot(item) {
      return {
        itemId: item.id,
        title: item.title,
        artist: item.artist || "",
        album: item.album || "",
        isrc: item.isrc || "",
        category: item.category,
        kind: item.kind,
        durationSeconds: Number(item.durationSeconds) || 0,
        licenseType: item.rights?.licenseType || "pendiente",
        rightsBasis: item.rights?.basis || "",
        rightsReference: item.rights?.reference || "",
        licenseDocument: Boolean(item.rights?.document)
      };
    }
    function record(item, { source, playoutKey = "", playedAt = (/* @__PURE__ */ new Date()).toISOString(), actor = null } = {}) {
      return mutate(async (state) => {
        const key = String(playoutKey || "").slice(0, 240);
        if (key) {
          const existing = state.events.find((event2) => event2.playoutKey === key);
          if (existing) return { changed: false, result: { recorded: false, event: clone(existing) } };
        }
        const event = {
          id: crypto.randomBytes(12).toString("hex"),
          playoutKey: key || `manual:${crypto.randomBytes(16).toString("hex")}`,
          playedAt,
          source: String(source || "autodj").slice(0, 40),
          recordedBy: actor?.username || "sistema",
          ...snapshot(item)
        };
        state.events.push(event);
        return { changed: true, result: { recorded: true, event: clone(event) } };
      });
    }
    function recordAutodj(now) {
      if (!now?.item || !now.playoutKey) return Promise.resolve({ recorded: false, event: null });
      return record(now.item, { source: "autodj", playoutKey: now.playoutKey, playedAt: now.startedAt || (/* @__PURE__ */ new Date()).toISOString() });
    }
    async function report(monthInput) {
      const month = validMonth(monthInput);
      const state = await load({ fresh: cfg.isVercel });
      const events = state.events.filter((event) => monthOf(event.playedAt) === month).sort((a, b) => a.playedAt.localeCompare(b.playedAt));
      const groups = /* @__PURE__ */ new Map();
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
      const items = [...groups.values()].sort((a, b) => b.plays - a.plays || a.title.localeCompare(b.title, "es"));
      const byLicense = {};
      for (const row of items) byLicense[row.licenseType] = (byLicense[row.licenseType] || 0) + row.plays;
      return {
        month,
        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        totals: {
          plays: events.length,
          uniquePieces: items.length,
          totalSeconds: items.reduce((sum, item) => sum + item.totalSeconds, 0),
          byLicense
        },
        items,
        events: events.slice(-5e3).reverse()
      };
    }
    module2.exports = {
      record,
      recordAutodj,
      report,
      validMonth,
      _resetForTests: () => {
        localState = null;
        queue = Promise.resolve();
      }
    };
  }
});

// server/routes/reports.js
var require_reports = __commonJS({
  "server/routes/reports.js"(exports2, module2) {
    var router = require("express").Router();
    var history = require_playback_history();
    var media = require_media_library();
    var live = require_live();
    var { auth, asyncRoute } = require_security();
    var { badRequest } = require_errors();
    function currentMonth() {
      return (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
    }
    function csvCell(value) {
      let text = String(value == null ? "" : value);
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    }
    router.get("/reports/playback", auth("desarrollador", "administrador", "locutor"), asyncRoute(async (req, res) => {
      const report = await history.report(req.query.month || currentMonth());
      res.json({ ...report, licenseTypes: media.licenseTypes() });
    }));
    router.get("/reports/playback.csv", auth("desarrollador", "administrador", "locutor"), asyncRoute(async (req, res) => {
      const report = await history.report(req.query.month || currentMonth());
      const headers = ["T\xEDtulo", "Artista", "\xC1lbum", "ISRC", "Categor\xEDa", "Tipo de licencia", "Base de derechos", "Referencia", "Soporte adjunto", "Reproducciones", "Segundos emitidos", "Primera reproducci\xF3n", "\xDAltima reproducci\xF3n"];
      const rows = report.items.map((item) => [
        item.title,
        item.artist,
        item.album,
        item.isrc,
        item.category,
        media.licenseTypes()[item.licenseType] || item.licenseType,
        item.rightsBasis,
        item.rightsReference,
        item.licenseDocument ? "S\xED" : "No",
        item.plays,
        Math.round(item.totalSeconds * 1e3) / 1e3,
        item.firstPlayedAt,
        item.lastPlayedAt
      ]);
      const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
      res.set("Content-Type", "text/csv; charset=utf-8");
      res.set("Content-Disposition", `attachment; filename="rayoboss-reproducciones-${report.month}.csv"`);
      res.send(csv);
    }));
    router.post("/reports/playback/record", auth("desarrollador", "administrador", "locutor"), asyncRoute(async (req, res) => {
      const source = String(req.body?.source || "");
      if (!["live-effect", "live-bed", "live-media"].includes(source)) badRequest("Origen de reproducci\xF3n inv\xE1lido.");
      const status = await live.status();
      if (!status.live) badRequest("Solo pueden registrarse piezas del estudio durante una transmisi\xF3n en vivo.");
      const item = await media.get(String(req.body?.itemId || ""));
      const result = await history.record(item, { source, actor: req.actor });
      res.json({ ok: true, ...result });
    }));
    module2.exports = router;
  }
});

// server/routes/public.js
var require_public = __commonJS({
  "server/routes/public.js"(exports2, module2) {
    var router = require("express").Router();
    var live = require_live();
    var programming = require_programming();
    var playbackHistory = require_playback_history();
    var cfg = require_config();
    var { asyncRoute } = require_security();
    function absolute(req, path) {
      return `${req.protocol}://${req.get("host")}${path}`;
    }
    function publicMediaItem(item) {
      if (!item) return null;
      return {
        id: item.id,
        title: item.title,
        artist: item.artist || "",
        album: item.album || "",
        category: item.category,
        kind: item.kind,
        contentType: item.contentType,
        durationSeconds: item.durationSeconds,
        url: item.url
      };
    }
    function publicAutodj(now) {
      if (!now) return null;
      return { ...now, item: publicMediaItem(now.item), next: publicMediaItem(now.next) };
    }
    router.get("/public/on-air", asyncRoute(async (req, res) => {
      const status = await live.status();
      const autodj = status.live ? null : await programming.now();
      const liveMediaUrl = cfg.public.hlsUrl || cfg.public.videoUrl || cfg.public.audioUrl || null;
      const liveTransport = !status.live ? "direct-file" : cfg.public.hlsUrl ? "hls" : cfg.public.videoUrl ? "direct-video" : cfg.public.audioUrl ? "direct-audio" : "webrtc";
      res.json({
        mode: status.live ? "live" : "autodj",
        status,
        autodj: publicAutodj(autodj),
        liveTransport,
        liveMediaUrl,
        embedUrl: absolute(req, "/embed?autoplay=1"),
        audioEndpoint: absolute(req, "/api/public/audio"),
        videoEndpoint: absolute(req, "/api/public/video"),
        autoplayNotice: "El reproductor intenta iniciar autom\xE1ticamente; el navegador puede exigir una interacci\xF3n para audio audible."
      });
    }));
    router.get("/public/audio", asyncRoute(async (req, res) => {
      const status = await live.status();
      if (status.live) {
        if (cfg.public.audioUrl) return res.redirect(307, cfg.public.audioUrl);
        return res.status(409).json({ error: "El vivo de Vercel usa WebRTC. Inserta /embed como iframe; en VPS configura RAYOBOSS_PUBLIC_AUDIO_URL para obtener un src de audio directo.", embedUrl: absolute(req, "/embed?autoplay=1") });
      }
      const current = await programming.now();
      if (!current.item) return res.redirect(307, "/api/live/stream");
      await playbackHistory.recordAutodj(current);
      res.redirect(307, current.item.url);
    }));
    router.get("/public/video", asyncRoute(async (req, res) => {
      const status = await live.status();
      if (status.live) {
        if (cfg.public.videoUrl) return res.redirect(307, cfg.public.videoUrl);
        return res.status(409).json({ error: "El vivo de Vercel usa WebRTC. Inserta /embed como iframe; en VPS configura RAYOBOSS_PUBLIC_VIDEO_URL o HLS.", embedUrl: absolute(req, "/embed?autoplay=1") });
      }
      const current = await programming.now();
      if (!current.item || current.item.kind !== "video") return res.status(204).end();
      await playbackHistory.recordAutodj(current);
      res.redirect(307, current.item.url);
    }));
    router.post("/public/playback", asyncRoute(async (req, res) => {
      const current = await programming.now();
      if (!current.item || String(req.body?.playoutKey || "") !== current.playoutKey) {
        return res.json({ ok: true, recorded: false });
      }
      const result = await playbackHistory.recordAutodj(current);
      res.json({ ok: true, recorded: result.recorded });
    }));
    router.get("/public/embed-code", (req, res) => {
      const url = absolute(req, "/embed?autoplay=1");
      res.json({ iframe: `<iframe src="${url}" allow="autoplay; fullscreen" style="width:100%;aspect-ratio:16/9;border:0" title="UNIOC Radio"></iframe>`, url });
    });
    module2.exports = router;
  }
});

// server/app.js
var require_app = __commonJS({
  "server/app.js"(exports2, module2) {
    var path = require("path");
    var express = require("express");
    var cfg = require_config();
    var { securityHeaders, sameOrigin } = require_security();
    var live = require_live();
    var app2 = express();
    app2.disable("x-powered-by");
    app2.set("trust proxy", cfg.server.trustProxy);
    app2.use(express.json({ limit: cfg.server.jsonLimit, strict: true }));
    app2.use(securityHeaders);
    app2.use(sameOrigin);
    app2.get("/api/health", (req, res) => {
      res.json({ ok: true, name: "RayoBoss", version: cfg.version, mode: cfg.mode, time: (/* @__PURE__ */ new Date()).toISOString() });
    });
    app2.use("/api", require_auth());
    app2.use("/api", require_users2());
    app2.use("/api", require_live2());
    app2.use("/api", require_microphones2());
    app2.use("/api", require_rtc2());
    app2.use("/api", require_media());
    app2.use("/api", require_programming2());
    app2.use("/api", require_reports());
    app2.use("/api", require_public());
    if (!cfg.isVercel && cfg.dataDir) {
      app2.use(cfg.storage.localPublicPath, express.static(cfg.storage.localRootDir, { maxAge: "1h", fallthrough: false }));
    }
    var publicDir = path.join(__dirname, "..", "public");
    var modulePaths = ["/inicio", "/administrativo", "/en-vivo", "/biblioteca", "/programacion", "/reproductor", "/informes", "/diagnostico"];
    app2.get(modulePaths, (req, res) => res.sendFile(path.join(publicDir, "index.html")));
    app2.use(express.static(publicDir, { extensions: ["html"], maxAge: cfg.isProduction ? "1h" : 0 }));
    app2.use("/api", (req, res) => res.status(404).json({ error: "Ruta no encontrada." }));
    app2.use((err, req, res, next) => {
      const status = Number.isInteger(err.status) ? err.status : 500;
      if (status >= 500) console.error("[rayoboss]", err.stack || err.message || err);
      res.status(status).json({ error: status < 500 && err.expose !== false ? err.message : "Error interno." });
    });
    module2.exports = { app: app2, live, cfg };
  }
});

// server/vercel-entry.js
var app = null;
var bootError = null;
try {
  app = require_app().app;
} catch (error) {
  bootError = error;
  console.error("[rayoboss:boot]", error && (error.stack || error.message || error));
}
module.exports = function rayobossVercelHandler(req, res) {
  if (bootError) {
    return res.status(500).json({
      ok: false,
      code: "RAYOBOSS_BOOT_FAILED",
      error: "La aplicaci\xF3n no pudo iniciar. Consulte Runtime Logs en Vercel."
    });
  }
  return app(req, res);
};
