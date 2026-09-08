const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');

async function main() {
  execFileSync(process.execPath, ['scripts/build-stackcp.js'], { cwd: root });
  const artifact = path.join(root, 'dist', 'stackcp');
  execFileSync('php', ['-l', path.join(artifact, 'index.php')]);
  const manifest = JSON.parse(fs.readFileSync(path.join(artifact, 'manifest.json')));
  assert.equal(manifest.version, require('../package.json').version);
  assert.deepEqual(fs.readdirSync(artifact).sort(), ['index.php', 'login.css', 'manifest.json']);
  for (const [file, hash] of Object.entries(manifest.files)) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(artifact, file))).digest('hex'), hash);
    assert.equal(fs.readFileSync(path.join(artifact, file), 'utf8'), fs.readFileSync(path.join(root, 'hosting/stackcp', file), 'utf8'));
  }
  const socket = net.createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const server = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', artifact], { stdio: 'ignore' });
  let spawnError;
  server.on('error', error => { spawnError = error; });
  try {
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let i = 0; i < 50; i++) {
      if (spawnError) throw spawnError;
      try { ready = (await fetch(base)).ok; } catch (_) {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, 'PHP inicia y sirve la raíz');
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.equal(page.headers.get('x-frame-options'), 'DENY');
    assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
    assert.match(page.headers.get('cache-control'), /no-store/);
    assert.match(page.headers.get('content-security-policy'), /form-action 'none'/);
    assert.doesNotMatch(page.headers.get('content-security-policy'), /unsafe-inline/);
    const html = await page.text();
    assert.match(html, /Ingreso institucional/);
    assert.match(html, /Acceso en preparación/);
    assert.match(html, /type="password"[^>]*disabled/);
    assert.match(html, /type="submit" disabled/);
    assert.doesNotMatch(html, /<script|\/api\/|BLOB_READ_WRITE_TOKEN|RAYOBOSS_SECRET/);
    const css = await fetch(new URL(html.match(/href="([^\"]+\.css[^\"]*)"/)[1], base));
    assert.equal(css.status, 200);
    assert.match(await css.text(), /@media/);
    const health = await (await fetch(`${base}/index.php?health=1`)).json();
    assert.equal(health.ok, true);
    assert.equal(health.version, manifest.version);
    assert.equal(health.authenticationReady, false);
    assert.equal(typeof health.runtime.scryptAvailable, 'boolean');
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const result = await fetch(base, { method, body: 'password=DO_NOT_ECHO' });
      assert.equal(result.status, 405);
      assert.equal(result.headers.get('allow'), 'GET, HEAD');
      assert.doesNotMatch(await result.text(), /DO_NOT_ECHO/);
    }
    assert.equal((await fetch(base, { method: 'HEAD' })).status, 200);
    for (const file of ['.env', 'server.js', 'package.json', 'AGENTS.md']) {
      assert.equal((await fetch(`${base}/${file}`)).status, 404);
    }
    console.log('StackCP: artefacto, integridad, portada, CSS, diagnóstico, cabeceras, métodos y exclusión de secretos verificados.');
  } finally { server.kill(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
