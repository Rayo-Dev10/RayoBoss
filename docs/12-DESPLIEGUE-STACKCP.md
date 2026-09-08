# Despliegue y operación en StackCP

## Plataforma

RayoBoss 4.1.0 utiliza PHP 7.4 o posterior con Sodium, Fileinfo, JSON y Hash. MusicBrainz necesita cURL. Producción confirma PHP 7.4.33 FPM; PHP CLI puede usar otra versión. No se requieren Composer, Node.js en producción, MySQL, sudo ni cambios en Apache/Nginx.

El directorio exclusivo es `~/public_html/radio/`, resuelto como `/home/sites/42b/e/e52161a3c2/public_html/radio`. El dominio es https://radio.rayogestion.com/.

## Acceso y navegación

La raíz presenta el ingreso institucional. La cuenta inicial es `dev` y utiliza la contraseña `RAYOBOSS_DEV_PASSWORD` del `.env` local empleado al aprovisionar. La contraseña nunca se publica en Git ni se copia en texto plano al hosting.

Las secciones usan enlaces como `/index.php?section=biblioteca` y `/index.php?section=programacion`. La API usa `/api.php?route=/media`. El reproductor público es `/embed.php?autoplay=1`. No se requieren rewrites.

El estudio conserva cámara, pantalla, micrófonos remotos, coanfitriones, efectos, cama y ducking. El navegador puede pedir permisos para dispositivos y una pulsación para reproducir sonido. Mantener abierto el estudio conductor durante el vivo.

## Validación local

Se necesitan Node.js 24, pnpm y PHP CLI con Sodium y Fileinfo. En Windows, las pruebas cargan las extensiones distribuidas con PHP sin modificar su configuración global.

```powershell
pnpm run verify:full
pnpm run test:stackcp
```

La segunda comprobación verifica la implementación PHP y usa archivos temporales, sin modificar `data/` operativo. Consulta la [cobertura y límites de las pruebas](13-VERIFICACION-STACKCP.md).

## Publicación y despliegue

Revisar `git status`, `git diff` y los archivos nuevos. Después:

```powershell
git add -A
pnpm run check:git
git diff --cached --check
git commit -m "Migrar funciones de RayoBoss a StackCP"
git push origin main
```

Detenerse si falla cualquier paso. Solo después de push exitoso:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-stackcp.ps1
```

El script exige main limpio y el mismo commit en GitHub. Construye `dist/stackcp/`, contrasta todos sus archivos con el manifiesto y rechaza rutas inesperadas o enlaces simbólicos. Transfiere únicamente el artefacto mediante SCP, verifica hashes y sintaxis remota y activa `index.php` al final. No utiliza borrados ni modifica proyectos vecinos.

Si falta la configuración remota, prepara `data/stackcp-deploy/config.php` localmente usando `.env`; transfiere únicamente el hash scrypt y el secreto de firma a `radio/private/config.php`, con acceso HTTP bloqueado y permisos 600. No imprime credenciales. Si ya existe configuración, la conserva. La conexión usa `$env:USERPROFILE/.ssh/id_ed25519`.

El destino contiene archivos públicos de aplicación y el directorio privado. Nunca subir todo el repositorio, `.env`, `node_modules`, pruebas ni datos de otra instalación. El manifiesto no incluye configuración privada ni estado.

## Persistencia y credenciales

`private/state.php` contiene usuarios, solicitudes, permisos, programación, catálogo, señales temporales e informes. `private/state.bak.php` permite recuperar el último estado válido. Un bloqueo entre procesos protege las modificaciones; la escritura utiliza un archivo temporal protegido y cambio atómico.

Los archivos privados terminan en `.php` y abortan cualquier acceso HTTP antes de emitir datos. Los binarios subidos también se almacenan con una cabecera PHP de bloqueo; solo el proveedor los sirve por una ruta controlada con soporte de rangos. Las licencias requieren sesión autorizada. El despliegue no reemplaza estos datos.

Las contraseñas usan scrypt nativo de Sodium, con sal generada automáticamente. El formato de almacenamiento es diferente al de Node. La instalación remota empieza con dev y las semillas públicas: no importa automáticamente usuarios, contraseñas, archivos ni datos operativos locales. La programación admite su respaldo JSON desde la interfaz.

Cambiar una contraseña en el panel invalida sus sesiones anteriores. La configuración inicial de dev solo se sincroniza de nuevo cuando se cambia el hash provisionado; redeployar no revierte una contraseña cambiada en el panel. No borrar los datos para recuperar acceso.

## Biblioteca y límites de carga

Las cargas son locales y admiten los mismos formatos de audio, video y soportes jurídicos de la biblioteca. Fileinfo valida el contenido, no solo el nombre. El límite efectivo es el menor entre el límite de aplicación de 64 MB y los límites PHP de la cuenta; un certificado admite hasta 25 MB dentro de ese límite efectivo. Las restricciones reales del proveedor prevalecen.

La búsqueda MusicBrainz usa HTTPS, identificación de la aplicación, caché y límite de una consulta por segundo. Las etiquetas Picard se leen en el navegador. No se conecta Vercel Blob en este destino.

## AutoDJ y vivo

Los horarios se interpretan en `America/Bogota`. Se conservan playlists, orden aleatorio, repetición, franjas nocturnas, respaldo, identificadores y cuñas. Los informes registran ocurrencias iniciadas por reproductores y piezas del estudio; no sustituyen la revisión jurídica.

El vivo distribuye audio/video entre navegadores mediante WebRTC y señalización PHP con peticiones breves. Los topes son ocho participantes y cuarenta oyentes, sin afirmar capacidad de carga validada. TURN es opcional y solo debe incorporarse a `iceServers` con un servicio y credenciales reales.

Este hosting no ejecuta un worker continuo de audio, FFmpeg, Icecast, HLS ni distribución masiva. AutoDJ se resuelve por reloj cuando un navegador lo consulta. La transición configurada se informa al reproductor, conforme al modelo de control existente; no equivale a procesamiento de audio de servidor. Para una emisora 24/7 independiente del navegador hace falta un plano de medios externo.

## Verificación de producción

- `/`: ingreso institucional.
- `/index.php?health=1`: PHP web, versión y configuración de autenticación presente.
- `/api.php?route=/health`: salud del servidor PHP.
- Login dev, catálogo, programación, informes y reproductor.
- `/private/config.php`, `/private/state.php` y módulos `/core/`: respuesta 404 sin contenido.
- `manifest.json`: hashes públicos del código desplegado.

La verificación PHP CLI remota no sustituye las peticiones HTTPS a FPM. Si falla una operación, revisar los registros PHP del sitio; las respuestas públicas no incluyen rutas privadas ni secretos.
