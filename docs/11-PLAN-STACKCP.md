# Plan de adaptación a ServerByt / StackCP

Fecha: 8 de septiembre de 2026. Base: RayoBoss 4.0.1.

## Objetivo y alcance

Al abrir https://radio.rayogestion.com/ debe aparecer la pantalla de ingreso institucional. La adaptación completa del sistema se desarrolla por entregas; mostrar el formulario no significa que usuarios, AutoDJ o WebRTC estén migrados.

Producción usa Linux compartido y PHP 7.4.33 FPM según el entorno confirmado por el propietario. No se requiere Node.js, Composer, MySQL, sudo, servicios permanentes ni cambios de configuración de Apache/Nginx. Node.js y pnpm se mantienen como herramientas locales y para el destino Node/Vercel existente.

La inspección inicial por SSH encontró vacía la carpeta autorizada y HTTP 403 en el dominio. PHP CLI informa 8.0.30: no representa necesariamente PHP FPM. La extensión Sodium no figura en CLI. La disponibilidad web se informa mediante un diagnóstico mínimo, sin phpinfo ni rutas privadas.

## Versionamiento

- `4.1.0-alpha.1`: primera entrega verificable del acceso web PHP, pantalla de login y diagnóstico de capacidades. La autenticación permanece explícitamente pendiente, sin aceptar ni transmitir contraseñas.
- `4.1.0-alpha.2`: autenticación y sesiones PHP verificadas, condicionadas a resolver scrypt en el entorno web.
- `4.1.0-beta.1`: usuarios, roles, invitados y persistencia.
- `4.1.0-beta.2`: biblioteca, derechos, programación y reproductor.
- `4.1.0`: adaptación funcional aprobada tras pruebas de permisos, concurrencia, seguridad y operación en el hosting.

Cada entrega usa commits descriptivos. No se generan ZIP ni releases automáticamente. Las versiones alpha/beta expresan funciones pendientes; no se presenta la migración como terminada.

## Entregas y criterios de aceptación

### 1. Entrada al dominio — implementación inmediata

1. Añadir destino independiente `hosting/stackcp/` con `index.php`, CSS y diagnóstico PHP.
2. Conservar la identidad de la pantalla institucional, con formulario accesible y aviso claro del estado de activación.
3. Servir la portada directamente, sin rewrites, rutas Express ni configuración del servidor web.
4. Aplicar CSP sin scripts inline, protección contra iframe y cache-control desde PHP.
5. Generar exclusivamente `dist/stackcp/` con una lista explícita de archivos públicos. Excluir código Node, `.env`, datos, Git y herramientas de desarrollo.
6. Probar rutas, respuestas, formulario, ausencia de secretos y compatibilidad de sintaxis; ejecutar la verificación existente y auditoría.
7. Revisar diff, hacer commit y push a main. Solo después de push exitoso transferir el artefacto a `~/public_html/radio/`, sin borrados.
8. Verificar por SSH los archivos y por HTTPS la portada, estilos y diagnóstico.

Aceptación: `/` responde 200 y muestra el login. Los controles explican que el acceso está pendiente; no simulan autenticación ni muestran funcionalidades operativas inexistentes.

### 2. Autenticación real

1. Comprobar Sodium/scrypt en PHP FPM. La API nativa de Sodium admite scrypt desde PHP 7.2, pero la extensión debe existir. Referencia: https://www.php.net/manual/en/function.sodium-crypto-pwhash-scryptsalsa208sha256-str.php
2. Si scrypt no está disponible, resolver su disponibilidad con el proveedor o acordar expresamente otro algoritmo antes de cambiar la regla de seguridad existente. No implementar criptografía propia ni sustituirla silenciosamente.
3. Diseñar provisión de secretos por SSH dentro del directorio autorizado, en archivos PHP protegidos contra acceso directo. Nunca copiar `.env` al sitio.
4. Implementar login, logout y consulta de identidad con tokens firmados, expiración, revocación, cookies HttpOnly/SameSite Strict/Secure y rechazo de solicitudes cross-origin.
5. Persistir intentos fallidos con bloqueo entre procesos; los éxitos no consumen el límite.
6. Conservar `dev`, su sincronización segura y la matriz completa de roles. Acordar migración de hashes existentes si el formato Sodium difiere de Node.

Aceptación: probar credenciales válidas e inválidas, límite de intentos, CSRF, expiración, revocación, ausencia de filtraciones y acceso no autorizado. PHP FPM procesa el cálculo en su worker; no se promete la API asíncrona de Node.

### 3. Usuarios, permisos y persistencia

1. Añadir un proveedor de archivos con bloqueo `flock`, escrituras atómicas y recuperación; no suponer SQLite ni MySQL.
2. Mantener datos dentro de `radio/` protegidos mediante contenedores PHP y validar que HTTP nunca entregue su contenido. No depender únicamente de `.htaccess`.
3. Portar usuarios, invitados y micrófonos por contrato, con pruebas equivalentes a las existentes.
4. Definir topes de concurrencia y retención; separar datos operativos del artefacto para que un despliegue no los reemplace.

Aceptación: comprobar roles, invitaciones temporales, invalidación de sesiones y ausencia de pérdida de datos ante escrituras simultáneas.

### 4. Biblioteca y programación

1. Implementar StorageProvider PHP para medios locales; validar tamaño, MIME, extensión, nombres seguros y permisos. No habilitar ejecución de archivos subidos.
2. Portar categorías, expiración, confirmación SAYCO-ACINPRO y metadatos; verificar límites reales de carga y disco del hosting.
3. Portar playlists, franjas, medianoche, superposiciones, continuidad e informes con pruebas de equivalencia.
4. Adaptar cliente a endpoints PHP explícitos, por ejemplo `api.php?route=...`, sin requerir rewrites.
5. Separar reproductor público y panel; solo el reproductor admite iframe.

Aceptación: operaciones desde la interfaz, sin edición manual de JSON; conservar restricciones administrativas y comprobar persistencia tras nuevas peticiones y despliegues.

### 5. Vivo y límites operativos

1. Portar señalización WebRTC a peticiones breves con estado compartido y expiración. Confirmar consumo y límites antes de publicar una capacidad de audiencia.
2. Conservar captura, mezcla, cama y ducking en el navegador conductor. Validar con navegadores reales y dos participantes.
3. No ejecutar streams PHP prolongados, workers, FFmpeg, Icecast ni HLS permanentes en este hosting sin infraestructura autorizada y confirmada.
4. Dejar continuidad 24/7 y distribución masiva como integración futura externa; no afirmar que quedan resueltas por servir PHP.

## Protocolo de despliegue y recuperación

El único destino autorizado es `~/public_html/radio/`. Comprobar su ruta real y rechazar enlaces simbólicos antes de escribir. No escribir en el padre ni en proyectos vecinos. Transferir únicamente archivos presentes en el manifiesto del artefacto y verificar sus hashes. No usar `--delete`, `rm`, sincronización de la raíz del repositorio ni restauraciones de datos.

Ante fallo de build, pruebas, commit o push, detener el despliegue. Si falla una transferencia, informar el estado parcial y completar solo la entrega ya publicada. Para recuperar código, generar el artefacto desde un commit previamente validado, publicar el cambio correspondiente y transferir los archivos de aplicación; nunca reemplazar datos operativos.

## Estado de seguimiento

Este documento define la adaptación completa. La primera entrega implementa solo la entrada al dominio. Las siguientes entregas requieren sus propias pruebas y no se consideran operativas por tener un plan escrito.
