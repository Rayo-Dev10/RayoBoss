// RayoBoss 4 - pruebas integrales sin framework externo.
process.env.RAYOBOSS_SECRET = 'test-secret-0123456789abcdef-0123456789abcdef';
process.env.RAYOBOSS_DEV_PASSWORD = 'Test-Dev-Password-2026';
process.env.RAYOBOSS_SCRYPT_N = '16384';
process.env.RAYOBOSS_SCRYPT_MAXMEM_MB = '64';
process.env.RAYOBOSS_MIN_PASSWORD = '12';
process.env.NODE_ENV = 'test';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { EventEmitter } = require('events');

const root = path.join(__dirname, '..');
const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rayoboss-tests-'));
process.env.RAYOBOSS_DATA_DIR = testDataDir;

const { app } = require('../server/app');
const users = require('../server/core/users');
const sessions = require('../server/core/sessions');
const live = require('../server/core/live');
const audio = require('../server/core/audio');
const security = require('../server/middleware/security');
const cfg = require('../server/config');
const storageFactory = require('../server/core/storage/storage-factory');
const StorageProvider = require('../server/core/storage/storage-provider');

let base;
const cookies = {};
function request(method, pathname, body, who, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const data = body === undefined || body === null ? null : JSON.stringify(body);
    const headers = { ...extraHeaders };
    if (data) headers['Content-Type'] = 'application/json';
    if (who && cookies[who]) headers.Cookie = cookies[who];
    const req = http.request(base + pathname, { method, headers }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        if (who && res.headers['set-cookie']) cookies[who] = res.headers['set-cookie'][0].split(';')[0];
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed;
        try { parsed = JSON.parse(raw); } catch (_) { parsed = raw; }
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const results = [];
async function test(name, fn) {
  try { await fn(); results.push(['PASA', name]); }
  catch (error) { results.push(['FALLA', `${name} - ${error.message}`]); }
}

(async () => {
  const server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;

  await test('1. Health informa versión 4.0.1', async () => {
    const result = await request('GET', '/api/health');
    assert.equal(result.status, 200);
    assert.equal(result.body.version, '4.0.1');
  });

  await test('2. Configuracion exige secretos sin fallback incrustado', async () => {
    const joined = [
      fs.readFileSync(path.join(root, 'server/config.js'), 'utf8'),
      fs.readFileSync(path.join(root, '.env.example'), 'utf8')
    ].join('\n');
    assert.ok(!joined.includes("RAYOBOSS_DEV_PASSWORD ||"));
    assert.ok(joined.includes('RAYOBOSS_DEV_PASSWORD es obligatoria'));
  });

  await test('3. Login dev funciona con cookie HttpOnly y SameSite Strict', async () => {
    const result = await request('POST', '/api/login', { username: 'dev', password: process.env.RAYOBOSS_DEV_PASSWORD }, 'dev');
    assert.equal(result.status, 200);
    assert.equal(result.body.user.role, 'desarrollador');
    assert.equal('token' in result.body, false);
    const cookie = result.headers['set-cookie'][0];
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
  });

  await test('4. Cookie agrega Secure detrás de proxy HTTPS confiable', async () => {
    const result = await request('POST', '/api/login',
      { username: 'dev', password: process.env.RAYOBOSS_DEV_PASSWORD }, 'devSecure',
      { 'X-Forwarded-Proto': 'https', Host: 'radio.example.test' });
    assert.equal(result.status, 200);
    assert.match(result.headers['set-cookie'][0], /; Secure/i);
  });

  await test('5. Contraseña se almacena con scrypt y nunca en texto plano', async () => {
    const user = await users.findUser('dev');
    assert.ok(!JSON.stringify(user).includes(process.env.RAYOBOSS_DEV_PASSWORD));
    assert.ok(user.passwordHash.startsWith('scrypt$16384$8$1$'));
  });

  await test('6. Hash scrypt asincrono verifica correcto e incorrecto', async () => {
    const hash = await users.hashPassword('Long-Test-Password-123');
    assert.equal(await users.verifyPassword('Long-Test-Password-123', hash), true);
    assert.equal(await users.verifyPassword('Wrong-Password-123', hash), false);
  });

  await test('7. Sesion stateless valida en otra carga del modulo', async () => {
    const user = await users.findUser('dev');
    const token = sessions.createSession(user);
    delete require.cache[require.resolve('../server/core/sessions')];
    const secondInstance = require('../server/core/sessions');
    const parsed = secondInstance.getSession(token);
    assert.equal(parsed.username, 'dev');
    assert.equal(parsed.sessionVersion, 1);
  });

  await test('8. Token manipulado y token expirado son rechazados', async () => {
    const token = sessions.createSession(await users.findUser('dev'));
    assert.equal(sessions.getSession(`${token.slice(0, -2)}xx`), null);
    const crypto = require('crypto');
    const payload = Buffer.from(JSON.stringify({ u: 'dev', r: 'desarrollador', sv: 1, iat: Date.now() - 10_000, exp: Date.now() - 1 })).toString('base64url');
    const sig = crypto.createHmac('sha256', process.env.RAYOBOSS_SECRET).update(payload).digest('base64url');
    assert.equal(sessions.getSession(`${payload}.${sig}`), null);
  });

  await test('9. Login sin JSON responde 400 y no 500', async () => {
    const result = await request('POST', '/api/login');
    assert.equal(result.status, 400);
  });

  await test('10. Origen cruzado es rechazado en operaciones de escritura', async () => {
    const result = await request('POST', '/api/login',
      { username: 'dev', password: process.env.RAYOBOSS_DEV_PASSWORD }, null,
      { Origin: 'https://evil.example' });
    assert.equal(result.status, 403);
  });

  await test('11. Intentos exitosos no consumen el limite de login', async () => {
    security._resetRateLimiterForTests();
    for (let i = 0; i < cfg.auth.loginMaxAttempts + 2; i++) {
      const result = await request('POST', '/api/login', { username: 'dev', password: process.env.RAYOBOSS_DEV_PASSWORD });
      assert.equal(result.status, 200);
    }
  });

  await test('12. Intentos fallidos activan 429', async () => {
    security._resetRateLimiterForTests();
    let last;
    for (let i = 0; i < cfg.auth.loginMaxAttempts + 1; i++) {
      last = await request('POST', '/api/login', { username: 'nobody', password: 'Wrong-Password-123' });
    }
    assert.equal(last.status, 429);
    security._resetRateLimiterForTests();
  });

  await test('13. Desarrollador crea administrador', async () => {
    const result = await request('POST', '/api/users', { username: 'admin1', password: 'Admin-Password-2026', role: 'administrador' }, 'dev');
    assert.equal(result.status, 200);
    assert.equal((await request('POST', '/api/login', { username: 'admin1', password: 'Admin-Password-2026' }, 'admin1')).status, 200);
  });

  await test('14. Dev protegido no puede eliminarse', async () => {
    const result = await request('DELETE', '/api/users/dev', null, 'dev');
    assert.equal(result.status, 403);
  });

  await test('15. Administrador no crea desarrolladores ni elimina usuarios', async () => {
    assert.equal((await request('POST', '/api/users', { username: 'dev2', password: 'Developer-Password-2026', role: 'desarrollador' }, 'admin1')).status, 403);
    await request('POST', '/api/users', { username: 'loc1', password: 'Locutor-Password-2026', role: 'locutor' }, 'dev');
    assert.equal((await request('DELETE', '/api/users/loc1', null, 'admin1')).status, 403);
  });

  await test('16. Usuario no autorizado no lista usuarios', async () => {
    await request('POST', '/api/login', { username: 'loc1', password: 'Locutor-Password-2026' }, 'loc1');
    assert.equal((await request('GET', '/api/users', null, 'loc1')).status, 403);
    assert.equal((await request('GET', '/api/users')).status, 401);
  });

  await test('17. Cambio de contraseña invalida la sesion anterior', async () => {
    const oldCookie = cookies.loc1;
    const change = await request('POST', '/api/users/loc1/password', { newPassword: 'Locutor-New-Password-2026' }, 'loc1');
    assert.equal(change.status, 200);
    cookies.loc1 = oldCookie;
    assert.equal((await request('GET', '/api/me', null, 'loc1')).status, 401);
    assert.equal((await request('POST', '/api/login', { username: 'loc1', password: 'Locutor-New-Password-2026' }, 'loc1')).status, 200);
  });

  await test('18. Eliminar usuario invalida su sesion', async () => {
    await request('POST', '/api/users', { username: 'temp1', password: 'Temporary-Password-2026', role: 'periodista' }, 'dev');
    await request('POST', '/api/login', { username: 'temp1', password: 'Temporary-Password-2026' }, 'temp1');
    assert.equal((await request('DELETE', '/api/users/temp1', null, 'dev')).status, 200);
    assert.equal((await request('GET', '/api/me', null, 'temp1')).status, 401);
  });

  await test('19. Solicitud de invitado rechaza etiquetas y acepta nombres validos', async () => {
    assert.equal((await request('POST', '/api/guests/request', { nombre: '<img src=x>', apellido: 'Rios' })).status, 400);
    const result = await request('POST', '/api/guests/request', { nombre: 'Ana Maria', apellido: "O'Rios" });
    assert.equal(result.status, 200);
    assert.equal(result.body.request.estado, 'pendiente');
    cookies.guestRequestId = result.body.request.id;
  });

  await test('20. Aprobar invitado genera credenciales utilizables una sola vez', async () => {
    const result = await request('POST', `/api/guests/${cookies.guestRequestId}/approve`, null, 'admin1');
    assert.equal(result.status, 200);
    assert.ok(result.body.credentials.username);
    assert.ok(result.body.credentials.temporaryPassword.length >= 20);
    const loginResult = await request('POST', '/api/login', {
      username: result.body.credentials.username,
      password: result.body.credentials.temporaryPassword
    }, 'guest1');
    assert.equal(loginResult.status, 200);
    const listed = await request('GET', '/api/guests', null, 'admin1');
    assert.ok(!JSON.stringify(listed.body).includes(result.body.credentials.temporaryPassword));
  });

  await test('21. Interfaz no usa innerHTML para datos de usuarios o invitados', async () => {
    const source = fs.readFileSync(path.join(root, 'public/js/app.js'), 'utf8');
    assert.equal(source.includes('innerHTML'), false);
  });

  await test('22. Cabeceras incluyen CSP sin unsafe-inline para scripts', async () => {
    const result = await request('GET', '/');
    assert.equal(result.status, 200);
    const csp = result.headers['content-security-policy'];
    assert.ok(csp.includes("script-src 'self'"));
    assert.ok(!csp.includes("script-src 'self' 'unsafe-inline'"));
  });

  await test('23. AutoDJ selecciona la franja correcta', async () => {
    assert.equal(live.autodjSlot(7).franja, 'manana');
    assert.equal(live.autodjSlot(12).franja, 'mediodia');
    assert.equal(live.autodjSlot(16).franja, 'tarde');
    assert.equal(live.autodjSlot(23).franja, 'noche');
  });

  await test('24. Solo roles autorizados cambian el estado en vivo', async () => {
    assert.equal((await request('POST', '/api/live/start', { title: 'No permitido' }, 'guest1')).status, 403);
    assert.equal((await request('POST', '/api/live/start', { title: 'Prueba en vivo' }, 'loc1')).status, 200);
    assert.equal((await request('GET', '/api/live/status')).body.source, 'live');
    assert.equal((await request('POST', '/api/live/end', {}, 'loc1')).body.status.source, 'autodj');
  });

  await test('25. Titulo de vivo tiene limite de 120 caracteres', async () => {
    assert.equal((await request('POST', '/api/live/start', { title: 'x'.repeat(121) }, 'loc1')).status, 400);
  });

  await test('26. Primer audio llega en menos de 300 ms', async () => {
    await new Promise((resolve, reject) => {
      const started = Date.now();
      const req = http.get(base + '/api/live/stream', res => {
        res.once('data', () => {
          const elapsed = Date.now() - started;
          res.destroy();
          elapsed < 300 ? resolve() : reject(new Error(`TTFB ${elapsed} ms`));
        });
      });
      req.on('error', reject);
      setTimeout(() => reject(new Error('sin audio en 2 s')), 2000).unref();
    });
  });

  await test('27. Stream WAV mantiene ritmo aproximado de tiempo real', async () => {
    await new Promise((resolve, reject) => {
      const req = http.get(base + '/api/live/stream', res => {
        assert.equal(res.headers['content-type'], 'audio/wav');
        let bytes = 0;
        const started = Date.now();
        res.on('data', chunk => {
          bytes += chunk.length;
          if (bytes >= 44 + audio.SR * 2) {
            const elapsed = Date.now() - started;
            res.destroy();
            elapsed > 500 && elapsed < 1800 ? resolve() : reject(new Error(`1 s de audio en ${elapsed} ms`));
          }
        });
      });
      req.on('error', reject);
      setTimeout(() => reject(new Error('timeout de audio')), 4000).unref();
    });
  });

  await test('28. Cache conserva exactamente seis segundos de muestras', async () => {
    assert.equal(audio.totalCachedSamples, audio.SR * audio.CYCLE_SECONDS);
    assert.equal(audio.frameCache.length, audio.TOTAL_FRAMES);
    const next = audio.currentFrameIndex(1_000_000 + audio.FRAME_MS);
    assert.equal(next, (audio.currentFrameIndex(1_000_000) + 1) % audio.frameCache.length);
  });

  await test('29. Plazo absoluto cierra un oyente con backpressure permanente', async () => {
    class FakeResponse extends EventEmitter {
      constructor() { super(); this.calls = 0; this.ended = false; this.socket = { setNoDelay() {} }; }
      writeHead() {}
      flushHeaders() {}
      write() { this.calls++; return this.calls === 1; }
      end() { this.ended = true; }
    }
    const response = new FakeResponse();
    audio.streamTo(response, 0.15, {});
    await new Promise(resolve => setTimeout(resolve, 260));
    assert.equal(response.ended, true);
  });

  await test('30. state.json es valido, privado, atomico y conserva .bak', async () => {
    const file = path.join(testDataDir, 'state.json');
    assert.ok(fs.existsSync(file));
    assert.ok(fs.existsSync(`${file}.bak`));
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(parsed.schemaVersion, 3);
    assert.ok(parsed.users.some(user => user.username === 'dev'));
    assert.ok(!fs.readdirSync(path.dirname(file)).some(name => name.endsWith('.tmp')));
    if (process.platform !== 'win32') assert.equal(fs.statSync(file).mode & 0o077, 0);
  });

  await test('31. Corrupcion del archivo principal se recupera desde .bak', async () => {
    const file = path.join(testDataDir, 'state.json');
    fs.writeFileSync(file, '{corrupto');
    users._resetForTests();
    const dev = await users.findUser('dev');
    assert.equal(dev.username, 'dev');
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).schemaVersion, 3);
    assert.ok(fs.readdirSync(path.dirname(file)).some(name => name.includes('.corrupt-')));
  });

  await test('32. Migracion automatica importa users.json de v2', async () => {
    const dataDir = testDataDir;
    const stateFile = path.join(dataDir, 'state.json');
    fs.rmSync(stateFile, { force: true });
    fs.rmSync(`${stateFile}.bak`, { force: true });
    const v3Hash = await users.hashPassword(process.env.RAYOBOSS_DEV_PASSWORD);
    const parts = v3Hash.split('$');
    const v2Hash = `scrypt$${parts[1]}$${parts[4]}$${parts[5]}`;
    fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify([{
      username: 'dev', passwordHash: v2Hash, role: 'desarrollador', protected: true, createdAt: new Date().toISOString()
    }], null, 2));
    users._resetForTests();
    assert.equal((await users.findUser('dev')).sessionVersion, 1);
    assert.ok(fs.existsSync(stateFile));
    assert.ok(fs.readdirSync(dataDir).some(name => name.startsWith('users.v2-migrated-')));
  });

  await test('33. Ruta API inexistente responde JSON 404', async () => {
    const result = await request('GET', '/api/no-existe');
    assert.equal(result.status, 404);
    assert.equal(result.body.error, 'Ruta no encontrada.');
  });

  await test('34. Dependencias declaradas corresponden a Express 4.22 o superior', async () => {
    const lock = require('../package-lock.json');
    const version = lock.packages['node_modules/express'].version.split('.').map(Number);
    assert.ok(version[0] > 4 || (version[0] === 4 && version[1] >= 22));
  });


  await test('35. Pruebas aisladas no usan el directorio operativo data', async () => {
    assert.equal(cfg.dataDir, testDataDir);
    assert.notEqual(path.resolve(cfg.dataDir), path.resolve(root, 'data'));
  });

  await test('36. Solicitud de invitado reserva usuario y crea solicitud de microfono si hay vivo', async () => {
    await request('POST', '/api/login', { username: 'dev', password: process.env.RAYOBOSS_DEV_PASSWORD }, 'dev');
    await request('POST', '/api/live/start', { title: 'Entrevista institucional' }, 'dev');
    const result = await request('POST', '/api/guests/request', { nombre: 'Luisa', apellido: 'Marin' });
    assert.equal(result.status, 200);
    assert.match(result.body.request.username, /^luisa\.marin/);
    assert.equal(result.body.microphoneRequest.state, 'requested');
    assert.equal(result.body.microphoneRequest.username, result.body.request.username);
    cookies.guest2RequestId = result.body.request.id;
    cookies.guest2Username = result.body.request.username;
    cookies.guest2MicId = result.body.microphoneRequest.id;
  });

  await test('37. Invitado aprobado conserva el usuario anunciado antes de recibir la contraseña', async () => {
    const result = await request('POST', `/api/guests/${cookies.guest2RequestId}/approve`, null, 'dev');
    assert.equal(result.status, 200);
    assert.equal(result.body.credentials.username, cookies.guest2Username);
    cookies.guest2Password = result.body.credentials.temporaryPassword;
    assert.equal((await request('POST', '/api/login', {
      username: cookies.guest2Username,
      password: cookies.guest2Password
    }, 'guest2')).status, 200);
  });

  await test('38. Periodista e invitado solicitan microfono solamente durante el vivo', async () => {
    await request('POST', '/api/users', { username: 'periodista1', password: 'Periodista-Password-2026', role: 'periodista' }, 'dev');
    await request('POST', '/api/login', { username: 'periodista1', password: 'Periodista-Password-2026' }, 'journalist');
    await request('POST', '/api/live/end', {}, 'dev');
    assert.equal((await request('POST', '/api/microphones/request', {}, 'journalist')).status, 400);
    await request('POST', '/api/live/start', { title: 'Nuevo vivo' }, 'dev');
    const result = await request('POST', '/api/microphones/request', {}, 'journalist');
    assert.equal(result.status, 200);
    assert.equal(result.body.request.role, 'periodista');
    cookies.journalistMicId = result.body.request.id;
  });

  await test('39. Aprobacion de prueba permite reportar microfono correcto', async () => {
    const approved = await request('POST', `/api/microphones/${cookies.guest2MicId}/approve-test`, {}, 'dev');
    assert.equal(approved.status, 400); // pertenecia al vivo anterior y debe quedar expirada
    const newRequest = await request('POST', '/api/microphones/request', {}, 'guest2');
    assert.equal(newRequest.status, 200);
    cookies.guest2MicId = newRequest.body.request.id;
    assert.equal((await request('POST', `/api/microphones/${cookies.guest2MicId}/approve-test`, {}, 'dev')).status, 200);
    const report = await request('POST', '/api/microphones/me/test-result', { result: 'ready' }, 'guest2');
    assert.equal(report.status, 200);
    assert.equal(report.body.request.testStatus, 'ready');
  });

  await test('40. Administrador puede aprobar directamente al aire sin fase de prueba', async () => {
    const result = await request('POST', `/api/microphones/${cookies.journalistMicId}/approve-live`, {}, 'dev');
    assert.equal(result.status, 200);
    assert.equal(result.body.request.state, 'live_approved');
    assert.equal(result.body.request.testStatus, 'not_started');
  });

  await test('41. Participante WebRTC requiere aprobacion al aire', async () => {
    assert.equal((await request('POST', '/api/rtc/participants/join', {}, 'guest2')).status, 403);
    assert.equal((await request('POST', `/api/microphones/${cookies.guest2MicId}/approve-live`, {}, 'dev')).status, 200);
    const joined = await request('POST', '/api/rtc/participants/join', {}, 'guest2');
    assert.equal(joined.status, 200);
    assert.ok(joined.body.session.connectionId);
    cookies.guestRtc = joined.body.session;
  });

  await test('42. Señalizacion WebRTC enlaza host, participante y oyente', async () => {
    const listener = await request('POST', '/api/rtc/listeners/join', {});
    assert.equal(listener.status, 200);
    const hostPoll = await request('GET', '/api/rtc/host/poll', null, 'dev');
    assert.equal(hostPoll.status, 200);
    const ids = hostPoll.body.joins.map(join => join.id);
    assert.ok(ids.includes(listener.body.session.connectionId));
    assert.ok(ids.includes(cookies.guestRtc.connectionId));
    const signal = { type: 'description', payload: { type: 'offer', sdp: 'v=0' } };
    assert.equal((await request('POST', '/api/rtc/host/signal', {
      targetId: listener.body.session.connectionId, signal
    }, 'dev')).status, 200);
    const clientPoll = await request('POST', '/api/rtc/clients/poll', {
      connectionId: listener.body.session.connectionId,
      token: listener.body.session.token
    });
    assert.equal(clientPoll.status, 200);
    assert.equal(clientPoll.body.signals[0].type, 'description');
  });

  await test('43. Interfaz alterna Iniciar y Terminar segun el estado real', async () => {
    const source = fs.readFileSync(path.join(root, 'public/js/app.js'), 'utf8');
    assert.ok(source.includes("visible('btnVivo', !status.live)"));
    assert.ok(source.includes("visible('btnFinVivo', status.live)"));
    assert.ok(source.includes("$('lu').value = result.request.username"));
    assert.ok(source.includes("$('lp').focus()"));
  });

  await test('44. Catálogo multimedia incluye audio, video, producción y recursos de vivo', async () => {
    const result = await request('GET', '/api/media', null, 'dev');
    assert.equal(result.status, 200);
    assert.ok(result.body.items.some(item => item.kind === 'video'));
    assert.ok(result.body.items.some(item => item.category === 'autodj.produccion'));
    assert.ok(result.body.items.some(item => item.category === 'live.efectos'));
    assert.ok(result.body.items.some(item => item.category === 'live.camas'));
  });

  await test('45. Biblioteca multimedia rechaza acceso administrativo anónimo', async () => {
    const result = await request('GET', '/api/media/config');
    assert.equal(result.status, 401);
  });

  await test('46. Desarrollador puede desactivar y reactivar un recurso incluido', async () => {
    let result = await request('PATCH', '/api/media/demo-indie', { active: false }, 'dev');
    assert.equal(result.status, 200);
    assert.equal(result.body.item.active, false);
    result = await request('PATCH', '/api/media/demo-indie', { active: true }, 'dev');
    assert.equal(result.status, 200);
    assert.equal(result.body.item.active, true);
  });

  await test('47. Programación AutoDJ se valida y devuelve el elemento actual', async () => {
    await request('POST', '/api/live/end', {}, 'dev');
    const program = await request('GET', '/api/programming', null, 'dev');
    assert.equal(program.status, 200);
    assert.ok(program.body.playlists.length >= 1);
    const publicNow = await request('GET', '/api/public/on-air');
    assert.equal(publicNow.status, 200);
    assert.equal(publicNow.body.mode, 'autodj');
    assert.ok(publicNow.body.autodj.item.url);
  });

  await test('48. Endpoint público entrega URL y código iframe embebible', async () => {
    const result = await request('GET', '/api/public/embed-code');
    assert.equal(result.status, 200);
    assert.match(result.body.url, /\/embed\?autoplay=1$/);
    assert.match(result.body.iframe, /<iframe/);
  });

  await test('49. Endpoint de audio redirige al contenido AutoDJ programado', async () => {
    const result = await request('GET', '/api/public/audio');
    assert.equal(result.status, 307);
    assert.ok(result.headers.location);
  });

  await test('50. Reproductor embed admite iframe sin relajar el panel administrativo', async () => {
    const embed = await request('GET', '/embed');
    assert.equal(embed.status, 200);
    assert.equal(embed.headers['x-frame-options'], undefined);
    assert.match(embed.headers['content-security-policy'], /frame-ancestors \*/);
    const rootPage = await request('GET', '/');
    assert.match(rootPage.headers['x-frame-options'], /DENY/i);
  });

  await test('51. Interfaz incorpora cámara, pantalla, soundboard, ducking y biblioteca', async () => {
    const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
    const extension = fs.readFileSync(path.join(root, 'public/js/studio-v4.js'), 'utf8');
    assert.ok(html.includes('btnCamera'));
    assert.ok(html.includes('btnScreen'));
    assert.ok(html.includes('soundboard'));
    assert.ok(html.includes('mediaCategory'));
    assert.ok(extension.includes('setupDucking302'));
    assert.ok(extension.includes('getDisplayMedia'));
  });

  await test('52. Build incluye cliente de carga directa a Vercel Blob', async () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    assert.ok(packageJson.dependencies['@vercel/blob']);
    assert.ok(fs.existsSync(path.join(root, 'public/js/blob-client.js')));
  });

  await test('53. Dev se sincroniza automaticamente con la contraseña del entorno', async () => {
    const file = path.join(testDataDir, 'state.json');
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const dev = parsed.users.find(user => user.username === 'dev');
    dev.passwordHash = await users.hashPassword('Password-Temporal-Diferente-2026');
    fs.writeFileSync(file, JSON.stringify(parsed, null, 2));
    users._resetForTests();
    const login = await users.verifyLogin('dev', process.env.RAYOBOSS_DEV_PASSWORD);
    assert.equal(login.username, 'dev');
    const repaired = JSON.parse(fs.readFileSync(file, 'utf8')).users.find(user => user.username === 'dev');
    assert.equal(await users.verifyPassword(process.env.RAYOBOSS_DEV_PASSWORD, repaired.passwordHash), true);
  });


  await test('54. StorageProvider establece un contrato abstracto estable', async () => {
    assert.throws(() => new StorageProvider({ id: 'invalid' }), /interfaz abstracta/i);
    for (const method of ['saveObject', 'getObject', 'getPublicUrl', 'listObjects', 'deleteObject', 'exists', 'getMetadata']) {
      assert.equal(typeof StorageProvider.prototype[method], 'function');
    }
  });

  await test('55. Factory selecciona almacenamiento local fuera de Vercel', async () => {
    const provider = storageFactory.getStorageProvider();
    const description = provider.describe();
    assert.equal(description.provider, 'local-disk');
    assert.equal(description.writable, true);
    assert.equal(description.uploadMode, 'server');
  });

  await test('56. Proveedor local cumple guardar, leer, listar, metadatos y eliminar', async () => {
    const provider = storageFactory.getStorageProvider();
    const key = provider.createStorageKey({ category: 'autodj.libre', originalName: 'Prueba ágil.mp3' });
    assert.match(key, /^rayoboss\/autodj\/libre\/\d{4}\/\d{2}\/\d{2}\/[a-f0-9]+-prueba-agil\.mp3$/);
    const stored = await provider.saveObject({
      key,
      body: Buffer.from('audio-sintetico-de-prueba'),
      contentType: 'audio/mpeg',
      sizeBytes: 26,
      originalName: 'Prueba ágil.mp3'
    });
    assert.equal(stored.provider, 'local-disk');
    assert.equal(await provider.exists(key), true);
    assert.equal((await provider.getObject(key)).toString(), 'audio-sintetico-de-prueba');
    assert.equal((await provider.getMetadata(key)).key, key);
    assert.ok((await provider.listObjects('rayoboss/autodj/libre')).some(item => item.key === key));
    await provider.deleteObject(stored);
    assert.equal(await provider.exists(key), false);
  });

  await test('57. API publica capacidades del proveedor sin acoplar la interfaz', async () => {
    const login = await request('POST', '/api/login', { username: 'dev', password: process.env.RAYOBOSS_DEV_PASSWORD }, 'devStorage');
    assert.equal(login.status, 200);
    const result = await request('GET', '/api/media/config', null, 'devStorage');
    assert.equal(result.status, 200);
    assert.equal(result.body.provider, 'local-disk');
    assert.equal(result.body.uploadMode, 'server');
    assert.equal(result.body.writable, true);
    assert.equal(typeof result.body.categories['autodj.libre'].label, 'string');
  });

  await test('58. Ruta multimedia delega almacenamiento y no importa proveedores concretos', async () => {
    const routeSource = fs.readFileSync(path.join(root, 'server/routes/media.js'), 'utf8');
    assert.ok(routeSource.includes("require('../core/storage/storage-factory')"));
    assert.ok(!routeSource.includes("@vercel/blob"));
    assert.ok(!routeSource.includes('fs.renameSync'));
    assert.ok(fs.existsSync(path.join(root, 'server/core/storage/local-disk-storage-provider.js')));
    assert.ok(fs.existsSync(path.join(root, 'server/core/storage/vercel-blob-storage-provider.js')));
  });


  await test('59. Carga local real atraviesa StorageProvider y elimina el objeto', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('audio-local-integracion')], { type: 'audio/mpeg' }), 'Integración local.mp3');
    form.append('metadata', JSON.stringify({
      title: 'Integración de almacenamiento local',
      category: 'autodj.libre',
      durationSeconds: 3,
      rightsBasis: 'Prueba sintética automatizada',
      contentType: 'audio/mpeg'
    }));
    const response = await fetch(`${base}/api/media/local-upload`, {
      method: 'POST',
      headers: { Cookie: cookies.devStorage },
      body: form
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.item.provider, 'local-disk');
    assert.match(body.item.storageKey, /^rayoboss\/autodj\/libre\//);
    const provider = storageFactory.getStorageProvider();
    assert.equal(await provider.exists(body.item.storageKey), true);
    const removed = await request('DELETE', `/api/media/${body.item.id}`, null, 'devStorage');
    assert.equal(removed.status, 200);
    assert.equal(await provider.exists(body.item.storageKey), false);
  });

  await test('60. Vercel sin Blob despliega en modo demostración de solo lectura', async () => {
    const { execFileSync } = require('child_process');
    const script = "const p=require('./server/core/storage/storage-factory').getStorageProvider();process.stdout.write(JSON.stringify(p.describe()))";
    const output = execFileSync(process.execPath, ['-e', script], {
      cwd: root,
      env: {
        ...process.env,
        VERCEL: '1',
        NODE_ENV: 'production',
        RAYOBOSS_STORAGE_PROVIDER: 'auto',
        BLOB_READ_WRITE_TOKEN: ''
      }
    }).toString();
    const description = JSON.parse(output);
    assert.equal(description.provider, 'vercel-demo-readonly');
    assert.equal(description.writable, false);
    assert.equal(description.uploadMode, 'none');
  });


  await test('61. Vercel con token selecciona automáticamente VercelBlobStorageProvider', async () => {
    const { execFileSync } = require('child_process');
    const script = "const p=require('./server/core/storage/storage-factory').getStorageProvider();process.stdout.write(JSON.stringify(p.describe()))";
    const output = execFileSync(process.execPath, ['-e', script], {
      cwd: root,
      env: {
        ...process.env,
        VERCEL: '1',
        NODE_ENV: 'production',
        RAYOBOSS_STORAGE_PROVIDER: 'auto',
        BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_test_token_not_used_for_network'
      }
    }).toString();
    const description = JSON.parse(output);
    assert.equal(description.provider, 'vercel-blob');
    assert.equal(description.writable, true);
    assert.equal(description.uploadMode, 'direct');
  });


  await test('62. Programación visual reemplaza el editor JSON técnico', async () => {
    const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
    const client = fs.readFileSync(path.join(root, 'public/js/programming-v4.js'), 'utf8');
    assert.ok(html.includes('Programación visual del AutoDJ'));
    assert.ok(html.includes('btnPlaylistAdd'));
    assert.ok(html.includes('btnSlotAdd'));
    assert.ok(html.includes('continuityFallback'));
    assert.ok(!html.includes('id="programJson"'));
    assert.ok(!html.includes('id="programNow"'));
    assert.ok(client.includes('renderPlaylistEditor'));
    assert.ok(client.includes('renderSchedule'));
    assert.ok(client.includes('refreshNow'));
  });

  await test('63. Resumen al aire expone progreso y tiempo restante legibles', async () => {
    await request('POST', '/api/live/end', {}, 'dev');
    const result = await request('GET', '/api/public/on-air');
    assert.equal(result.status, 200);
    assert.equal(result.body.mode, 'autodj');
    assert.equal(typeof result.body.autodj.progressPercent, 'number');
    assert.equal(typeof result.body.autodj.remainingSeconds, 'number');
    assert.ok(result.body.autodj.playlist.name);
  });

  await test('64. Programación v4 rechaza franjas superpuestas', async () => {
    assert.equal((await request('POST', '/api/login', { username: 'dev', password: process.env.RAYOBOSS_DEV_PASSWORD }, 'devV4')).status, 200);
    const current = await request('GET', '/api/programming', null, 'devV4');
    assert.equal(current.body.schemaVersion, 2);
    const invalid = JSON.parse(JSON.stringify(current.body));
    invalid.schedule.push({
      id: 'franja-superpuesta', name: 'Franja superpuesta', days: [1], start: '08:00', end: '09:00',
      playlistId: invalid.playlists[0].id, enabled: true
    });
    const result = await request('PUT', '/api/programming', invalid, 'devV4');
    assert.equal(result.status, 400);
    assert.match(result.body.error, /superponen/i);
  });

  await test('65. Administrador puede restablecer la programación de demostración', async () => {
    const result = await request('POST', '/api/programming/reset', {}, 'devV4');
    assert.equal(result.status, 200);
    assert.equal(result.body.programming.schemaVersion, 2);
    assert.ok(result.body.programming.playlists.some(item => item.id === 'continuidad-demo'));
  });

  await test('66. Plantilla de entorno conserva opcionales comentados y puede versionarse', async () => {
    const example = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
    const ignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
    assert.match(example, /# RAYOBOSS_TURN_URL=/);
    assert.match(example, /# BLOB_READ_WRITE_TOKEN=/);
    assert.ok(ignore.includes('!.env.example'));
  });

  await test('67. Storage factory crítico existe y la ruta usada por media coincide exactamente', async () => {
    const critical = path.join(root, 'server/core/storage/storage-factory.js');
    assert.equal(fs.existsSync(critical), true);
    const route = fs.readFileSync(path.join(root, 'server/routes/media.js'), 'utf8');
    assert.ok(route.includes("require('../core/storage/storage-factory')"));
  });

  await test('68. Build produce una función Vercel autocontenida', async () => {
    const bundle = fs.readFileSync(path.join(root, 'api/index.js'), 'utf8');
    assert.ok(bundle.includes('bundle Vercel generado'));
    assert.equal(bundle.includes("require('../server/app')"), false);
    assert.ok(bundle.includes('RAYOBOSS_BOOT_FAILED'));
  });

  await test('69. Scripts de publicación verifican archivos críticos y excluyen secretos', async () => {
    const publish = fs.readFileSync(path.join(root, 'scripts/publish-github.sh'), 'utf8');
    const gitCheck = fs.readFileSync(path.join(root, 'scripts/check-git-index.js'), 'utf8');
    assert.ok(publish.includes('check-git-index.js'));
    assert.ok(gitCheck.includes('server/core/storage/storage-factory.js'));
    assert.ok(gitCheck.includes("'.env'"));
  });

  await test('70. README describe el producto en presente y el flujo completo desde cero', async () => {
    const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    assert.ok(readme.includes('RayoBoss es una plataforma'));
    assert.ok(readme.includes('Framework Preset'));
    assert.ok(readme.includes('scripts/publish-github.sh'));
    assert.equal(readme.includes('Cambio principal de la versión'), false);
    assert.equal(readme.includes('versiones anteriores'), false);
  });

  await test('71. Gitignore excluye solo el almacenamiento operativo de raíz y no el código StorageProvider', async () => {
    const ignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
    assert.ok(ignore.split(/\r?\n/).includes('/storage/'));
    assert.equal(ignore.split(/\r?\n/).includes('storage/'), false);
    assert.equal(fs.existsSync(path.join(root, 'server/core/storage/storage-factory.js')), true);
  });

  server.close();
  const failures = results.filter(([status]) => status === 'FALLA');
  console.log('\nRayoBoss 4.0.1 - Reporte de pruebas');
  for (const [status, name] of results) console.log(`  [${status}] ${name}`);
  console.log(`\n${results.length - failures.length}/${results.length} pruebas aprobadas`);
  fs.rmSync(testDataDir, { recursive: true, force: true });
  process.exit(failures.length ? 1 : 0);
})();
