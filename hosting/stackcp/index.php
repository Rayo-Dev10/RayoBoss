<?php
// Compatible con PHP 7.4. No requiere Composer, rewrites ni servicios Node.
declare(strict_types=1);

header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-store, max-age=0');
header("Content-Security-Policy: default-src 'none'; style-src 'self'; img-src 'self'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'");
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/index.php')), '/');
if (!in_array($requestPath, array($basePath . '/', $basePath . '/index.php'), true)) {
    http_response_code(404);
    echo 'Página no encontrada.';
    exit;
}
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET' && $method !== 'HEAD') {
    header('Allow: GET, HEAD');
    http_response_code(405);
    echo 'El ingreso con credenciales todavía no está habilitado.';
    exit;
}
if (isset($_GET['health'])) {
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(array(
        'ok' => true,
        'version' => '4.1.0-alpha.1',
        'deployment' => 'stackcp',
        'stage' => 'login-screen',
        'authenticationReady' => false,
        'runtime' => array(
            'php' => PHP_VERSION,
            'sapi' => PHP_SAPI,
            'scryptAvailable' => function_exists('sodium_crypto_pwhash_scryptsalsa208sha256_str_verify')
        )
    ), JSON_UNESCAPED_SLASHES);
    exit;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Ingreso institucional | RayoBoss</title>
  <link rel="stylesheet" href="./login.css?v=4.1.0-alpha.1">
</head>
<body>
  <header><a class="brand" href="./" aria-label="RayoBoss, inicio">Rayo<span>Boss</span></a><span class="station">UNIOC Radio</span></header>
  <main>
    <section class="intro" aria-labelledby="welcome">
      <p class="eyebrow">EMISORA UNIVERSITARIA</p>
      <h1 id="welcome">El punto de encuentro<br>de nuestra radio.</h1>
      <p>Acceso institucional para el equipo de UNIOC Radio.</p>
      <div class="identity">UNIOC · IES CINOC</div>
    </section>
    <section class="card" aria-labelledby="login-title">
      <p class="eyebrow">BIENVENIDO A RAYOBOSS</p>
      <h2 id="login-title">Ingreso institucional</h2>
      <p class="subtitle">Accede con tu usuario y contraseña.</p>
      <form aria-describedby="activation" action="./index.php" method="post">
        <label for="username">Usuario</label>
        <input id="username" type="text" autocomplete="username" maxlength="64" placeholder="Tu usuario institucional" disabled>
        <label for="password">Contraseña</label>
        <input id="password" type="password" autocomplete="current-password" maxlength="256" placeholder="Tu contraseña" disabled>
        <button type="submit" disabled>Ingresar</button>
      </form>
      <div class="notice" id="activation"><strong>Acceso en preparación</strong><p>La pantalla de ingreso ya está disponible. El inicio de sesión y las funciones de la emisora se habilitarán al completar la adaptación.</p></div>
    </section>
  </main>
  <footer><span>RayoBoss · Plataforma de radio institucional</span><span>4.1.0-alpha.1 · Versión de adaptación</span></footer>
</body>
</html>
