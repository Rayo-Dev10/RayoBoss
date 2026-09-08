# Despliegue en StackCP

## Estado del destino PHP

La versión 4.1.0-alpha.1 ofrece la pantalla de ingreso institucional. Los campos están deshabilitados y explican que el acceso está en preparación. No se envían contraseñas ni se simula una sesión. Usuarios, biblioteca, programación, informes y vivo todavía requieren la adaptación descrita en el [plan](11-PLAN-STACKCP.md).

PHP 7.4 es la sintaxis mínima de este destino. No se requiere Composer, MySQL, Node.js en producción, acceso root ni reglas de reescritura. El destino Node/Vercel permanece separado.

## Validar localmente

Con Node.js/pnpm y PHP CLI disponibles:

```powershell
pnpm run verify:full
pnpm run test:stackcp
```

La prueba StackCP genera el artefacto e inicia un servidor PHP local temporal. Comprueba portada, CSS, diagnóstico, integridad, cabeceras de seguridad, rechazo de envíos y exclusión de archivos privados. La versión del PHP local puede diferir de FPM; la comprobación HTTPS posterior valida el entorno real.

## Publicar

Revisar `git status`, `git diff`, archivos nuevos y contenido del índice. No incluir secretos ni datos. Después:

```powershell
git add -A
pnpm run check:git
git diff --cached --check
git commit -m "Añadir acceso PHP para StackCP"
git push origin main
```

Detenerse si falla cualquier paso. Únicamente tras push exitoso:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-stackcp.ps1
```

El script exige main limpio y el mismo commit en GitHub; genera `dist/stackcp/`, valida el destino real, rechaza enlaces simbólicos y una portada `index.html` que oculte PHP, copia únicamente `index.php`, `login.css` y `manifest.json` mediante SCP y verifica hashes remotos. SCP sirve como transferencia equivalente cuando rsync no está instalado en Windows. No realiza eliminaciones.

Destino exclusivo: `~/public_html/radio/`, actualmente resuelto como `/home/sites/42b/e/e52161a3c2/public_html/radio`. Clave: `$env:USERPROFILE/.ssh/id_ed25519`. El script se detiene si esa ruta cambia.

El manifiesto solo contiene versión y hashes públicos. No subir `.env`, repositorio, módulos Node, pruebas ni datos. No transferir `public/` del destino Node como sustituto del artefacto PHP.

## Verificar la entrega

- https://radio.rayogestion.com/ debe responder 200 y mostrar el ingreso institucional.
- https://radio.rayogestion.com/login.css debe responder 200.
- https://radio.rayogestion.com/index.php?health=1 informa versión, etapa y capacidades mínimas de PHP, sin secretos ni rutas internas.
- `authenticationReady: false` identifica expresamente la fase actual.
- Revisar en navegador ancho de escritorio y móvil; la portada no necesita JavaScript.

La prueba remota CLI de sintaxis no sustituye la prueba web FPM. La disponibilidad de scrypt se comprueba en `runtime.scryptAvailable`; no se presupone por tener PHP instalado.
