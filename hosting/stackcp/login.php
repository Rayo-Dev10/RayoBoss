<?php if (!defined('RB_APP')) { http_response_code(404); exit; } ?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Ingreso | RayoBoss</title>
  <link rel="stylesheet" href="/login.css">
</head>
<body>
  <header><div class="brand">Rayo<span>Boss</span></div><div class="station">UNIOC Radio</div></header>
  <main>
    <section class="intro">
      <p class="eyebrow">CONTROL DE EMISORA UNIVERSITARIA</p>
      <h1>Producción, programación y transmisión en un solo lugar.</h1>
      <p>El panel institucional está reservado para usuarios autorizados. Ingresa con las credenciales asignadas por la administración.</p>
      <p class="identity">UNIOC · IES CINOC</p>
    </section>
    <section class="card" aria-labelledby="login-title">
      <p class="eyebrow">ACCESO PROTEGIDO</p>
      <h2 id="login-title">Ingreso institucional</h2>
      <p class="subtitle">Emisora universitaria UNIOC</p>
      <form id="loginForm">
        <label for="username">Usuario</label>
        <input id="username" name="username" autocomplete="username" maxlength="64" required>
        <label for="password">Contraseña</label>
        <input id="password" name="password" type="password" autocomplete="current-password" maxlength="256" required>
        <button type="submit">Ingresar</button>
      </form>
      <div id="message" class="notice" role="status" aria-live="polite"></div>
    </section>
  </main>
  <footer><span>RayoBoss <?php echo htmlspecialchars(RB_VERSION, ENT_QUOTES, 'UTF-8'); ?></span><span>Acceso protegido por sesión segura</span></footer>
  <script src="/login.js"></script>
</body>
</html>
