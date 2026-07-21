# RayoBoss — contexto operativo para Codex

> **Ámbito:** este archivo se ubica en la raíz del repositorio y aplica a todo el proyecto.
> **Línea base obligatoria:** RayoBoss `4.0.1`.
> **Idioma de trabajo:** español.

## 1. Propósito de este archivo

Este documento entrega a Codex el contexto funcional, técnico y operativo necesario para continuar el desarrollo de RayoBoss desde la versión 4.0.1 sin reconstruir decisiones ya tomadas ni reintroducir errores corregidos.

Antes de modificar código:

1. lee este archivo;
2. revisa el archivo o módulo afectado;
3. consulta la documentación específica dentro de `docs/`;
4. identifica pruebas existentes relacionadas;
5. propone o ejecuta el cambio más pequeño que resuelva el problema;
6. valida el resultado antes de darlo por terminado.

No supongas que una modificación local funcionará en Linux/Vercel. Verifica rutas, capitalización, archivos versionados, bundle serverless y pruebas.

---

## 2. Identidad y objetivo del producto

**RayoBoss** es la plataforma de control de una emisora universitaria multimedia, orientada a **UNIOC Radio**. Debe permitir operar una radio institucional con audio y video, primero como modelo funcional en Vercel y posteriormente como solución de producción en VPS.

Funciones principales actuales:

- autenticación y administración por roles;
- solicitud y aprobación de invitados;
- permisos de micrófono en dos etapas;
- transmisión en vivo mediante WebRTC;
- captura de micrófono, cámara, pantalla, ventana o pestaña;
- mezcla de conductor, invitados, periodistas, efectos y cama musical;
- ducking automático cuando se detecta voz;
- biblioteca de audio y video;
- metadatos jurídicos y categorías de repertorio;
- AutoDJ programable mediante interfaz visual;
- playlists, franjas, identificadores, cuñas y continuidad;
- reproductor público embebible;
- almacenamiento intercambiable mediante `StorageProvider`;
- despliegue local, Vercel y preparación para VPS.

La interfaz está destinada a personas no técnicas, incluyendo locutores y personal administrativo. La operación cotidiana **no debe exigir editar JSON, código ni variables internas**.

---

## 3. Estado base de RayoBoss 4.0.1

La versión 4.0.1 es la referencia desde la cual deben partir todos los cambios.

Datos técnicos principales:

- Node.js: `22.x`.
- Gestor declarado: `npm@10.9.2`.
- Servidor: Express 4.
- Estilo de módulos del servidor: CommonJS.
- Build: esbuild.
- Dependencias principales:
  - `express`;
  - `multer`;
  - `@vercel/blob`;
  - `@vercel/functions`;
  - `esbuild`.
- Versión declarada en `package.json`: `4.0.1`.
- Versión declarada en `server/config.js`: `4.0.1`.
- Suite base: **71 pruebas automatizadas** en `tests/test.js`.

No cambies el número de versión salvo solicitud explícita del usuario o entrega formal acordada.

No generes un ZIP, release o nueva versión por cada ajuste menor. El usuario prefiere reparaciones incrementales y verificables. Empaqueta únicamente cuando lo solicite expresamente.

---

## 4. Prioridades del usuario

Al tomar decisiones de diseño, aplica estas prioridades:

1. **Simplicidad operativa:** la instalación y el uso deben ser comprensibles para usuarios no técnicos.
2. **Interfaz humana:** mostrar nombres, estados, horarios, progreso y acciones; no mostrar estructuras JSON crudas como interfaz principal.
3. **Reparaciones pequeñas primero:** evitar reescrituras y cambios drásticos si un parche localizado resuelve el problema.
4. **Vercel como demostración completa:** el modelo funcional debe ser visible y verificable antes de migrar a VPS.
5. **VPS como producción real:** conservar el diseño para una operación 24/7 con plano de medios persistente.
6. **Autonomía del repositorio:** un usuario debe poder descomprimir, generar `.env`, instalar, probar, publicar en GitHub, importar en Vercel, conectar Blob y redeployar.
7. **No inventar credenciales ni infraestructura:** TURN, HLS, Icecast, MediaMTX, S3 o VPS solo se consideran activos cuando existen valores y recursos reales.
8. **Documentación vigente:** el README debe describir el producto actual en presente, sin narrar la evolución desde versiones anteriores.
9. **Seguridad y derechos:** no exponer secretos ni permitir activar repertorio protegido sin confirmación administrativa.
10. **Realidad antes que apariencia:** no afirmar que una función fue validada si no se ejecutó la prueba correspondiente.

---

## 5. Flujo esperado desde cero

La experiencia oficial debe conservar este orden:

### Windows local

1. Descomprimir el repositorio en una carpeta nueva.
2. Abrir Git Bash en la raíz.
3. Ejecutar:

```bash
npm config set registry https://registry.npmjs.org/
bash scripts/windows-first-run.sh
```

4. Guardar fuera del repositorio la contraseña inicial de `dev` mostrada una sola vez.
5. Ejecutar:

```bash
npm start
```

6. Abrir `http://localhost:3000`.
7. Iniciar sesión con:

```text
Usuario: dev
Contraseña: valor generado en .env
```

**Nunca debe ser necesario ejecutar `rm -rf data` para que `dev` pueda entrar.** El arranque sincroniza automáticamente el hash del usuario protegido con `RAYOBOSS_DEV_PASSWORD`.

### GitHub

1. Crear repositorio privado y vacío.
2. No generar README, licencia ni `.gitignore` desde GitHub.
3. Publicar con:

```bash
bash scripts/publish-github.sh https://github.com/USUARIO/RayoBoss.git
```

El script debe bloquear el push si:

- falta un archivo crítico;
- `.env` está versionado;
- `data/`, `node_modules/` o `.vercel/` están versionados;
- el bundle o las verificaciones fallan.

### Vercel

1. Importar el repositorio.
2. Elegir Framework Preset: **Other**.
3. Mantener la raíz del repositorio.
4. Importar el `.env` creado localmente.
5. Desplegar primero sin Blob.
6. Verificar:

```text
GET /api/health
```

7. Crear Vercel Blob público.
8. Activar token read-write.
9. Conectar Production y Preview.
10. Hacer redeploy.
11. Confirmar en Biblioteca:

```text
Proveedor: vercel-blob
Modo de carga: direct
Escritura: habilitada
```

---

## 6. Estructura del repositorio

### Entradas

- `server.js`: arranque local/VPS.
- `server/app.js`: composición de Express y rutas.
- `server/vercel-entry.js`: manejador estable para Vercel con captura de errores de arranque.
- `api/index.js`: **bundle generado** para Vercel. No editar manualmente.

### Configuración

- `config/default.json`: valores predeterminados.
- `server/config.js`: lectura, normalización y validación de variables de entorno.
- `.env.example`: plantilla versionable; variables opcionales deben permanecer comentadas.
- `.env`: secreto local; nunca se versiona.

### Núcleo del dominio

- `server/core/users.js`: usuarios, roles, solicitudes de invitado, hash de contraseñas y sincronización de `dev`.
- `server/core/sessions.js`: sesiones stateless firmadas.
- `server/core/live.js`: estado en vivo y stream de demostración.
- `server/core/microphones.js`: solicitud, prueba, aprobación al aire y revocación.
- `server/core/rtc.js`: señalización WebRTC.
- `server/core/media-library.js`: catálogo y reglas de medios.
- `server/core/programming.js`: playlists, franjas, continuidad y resolución del AutoDJ.
- `server/core/audio.js`: audio de demostración y frames.

### Almacenamiento

- `server/core/storage/storage-provider.js`: contrato abstracto.
- `server/core/storage/storage-factory.js`: selección del proveedor.
- `server/core/storage/local-disk-storage-provider.js`.
- `server/core/storage/vercel-blob-storage-provider.js`.
- `server/core/storage/read-only-storage-provider.js`.
- `server/core/storage/storage-keys.js`.

### Persistencia y utilidades

- `server/utils/runtime-store.js`: memoria local o Vercel Runtime Cache para estado temporal/compartido.
- `server/utils/storage.js`: lectura recuperable y escritura atómica con `.bak`.
- `server/utils/validation.js`.
- `server/utils/errors.js`.

### Rutas

- `server/routes/auth.js`.
- `server/routes/users.js`.
- `server/routes/live.js`.
- `server/routes/microphones.js`.
- `server/routes/rtc.js`.
- `server/routes/media.js`.
- `server/routes/programming.js`.
- `server/routes/public.js`.

### Cliente

- `public/index.html`: panel principal.
- `public/embed.html`: reproductor embebible.
- `public/js/app.js`: sesión, usuarios, vivo y RTC.
- `public/js/programming-v4.js`: programación visual.
- `public/js/studio-v4.js`: estudio multimedia, soundboard, cama y ducking.
- `public/js/blob-upload-entry.js`: fuente del cliente Blob.
- `public/js/blob-client.js`: bundle generado; no editar manualmente.
- `public/js/embed.js`: reproductor público.
- `public/css/app.css` y `public/css/embed.css`.

### Calidad y operación

- `tests/test.js`: suite integral.
- `scripts/build-client.js`: genera cliente Blob y bundle Vercel.
- `scripts/check-relative-imports.js`: verifica imports y capitalización.
- `scripts/check-git-index.js`: verifica archivos realmente seguidos por Git.
- `scripts/check-release.js`: valida integridad del release.
- `scripts/smoke-vercel-bundle.js`: prueba el bundle con y sin Blob.
- `scripts/doctor.js`: diagnóstico de configuración.
- `scripts/windows-first-run.sh`: preparación completa inicial.
- `scripts/publish-github.sh`: publicación segura.
- `deploy/rayoboss.service`: systemd.
- `deploy/Caddyfile`: proxy HTTPS para VPS.

---

## 7. Arquitectura de despliegue

### Local y VPS

- `data/` contiene estado operativo y no se versiona.
- Los medios se guardan en disco mediante `LocalDiskStorageProvider`.
- El estado JSON se escribe con archivo temporal, cambio atómico y copia `.bak`.
- El usuario `dev` se sincroniza con el valor actual de `.env` sin borrar otros usuarios ni solicitudes.

### Vercel sin Blob

Con `RAYOBOSS_STORAGE_PROVIDER=auto` y sin `BLOB_READ_WRITE_TOKEN`:

- arranca con `ReadOnlyStorageProvider`;
- la biblioteca incluida puede demostrarse;
- no permite cargas persistentes nuevas;
- `/api/health` debe seguir funcionando.

### Vercel con Blob

Con `RAYOBOSS_STORAGE_PROVIDER=auto` y `BLOB_READ_WRITE_TOKEN` creado por la conexión de Vercel:

- selecciona `VercelBlobStorageProvider`;
- la carga es directa desde el navegador;
- las escrituras y eliminaciones requieren autorización;
- el token nunca se envía al cliente ni se versiona.

### Vercel Runtime Cache

`server/utils/runtime-store.js` usa `@vercel/functions` para estado compartido temporal. No debe tratarse como una base de datos transaccional definitiva.

En producción institucional, usuarios, programación, catálogo, auditoría y permisos deben migrar a PostgreSQL u otra persistencia formal.

### Bundle serverless

`npm run build` empaqueta `server/vercel-entry.js` y todos los módulos locales en `api/index.js` mediante esbuild. Las dependencias npm permanecen externas.

Esto evita que el empaquetador de Vercel omita módulos locales.

**No editar `api/index.js` manualmente.** Modifica `server/` y vuelve a ejecutar el build.

---

## 8. Error histórico crítico que no debe regresar

Un `.gitignore` anterior contenía:

```text
storage/
```

Ese patrón ignoró accidentalmente `server/core/storage/`. Localmente funcionaba porque los archivos existían, pero GitHub y Vercel no recibieron `storage-factory.js`, causando:

```text
Cannot find module '../core/storage/storageFactory'
```

La regla correcta es:

```text
/storage/
```

Solo excluye el almacenamiento operativo ubicado en la raíz.

Reglas obligatorias:

- no cambiar `/storage/` por `storage/`;
- no cambiar nombres de módulos sin actualizar todos los imports;
- respetar minúsculas y capitalización exacta;
- ejecutar `npm run check:imports`;
- ejecutar `npm run check:git` en un repositorio inicializado;
- confirmar que `server/core/storage/storage-factory.js` esté versionado.

Linux y Vercel distinguen mayúsculas y minúsculas aunque Windows pueda ocultar el error.

---

## 9. Roles y permisos

Roles existentes:

```text
desarrollador
administrador
locutor
periodista
invitado
anonimo
solo_lectura
```

Reglas principales:

### Desarrollador

- usuario protegido `dev`;
- crea cualquier rol;
- puede crear desarrolladores;
- administra usuarios;
- elimina usuarios excepto `dev`;
- administra biblioteca y programación;
- aprueba invitados y micrófonos;
- inicia y termina vivos.

### Administrador

- administra usuarios de menor rango;
- no crea desarrolladores;
- no elimina al usuario protegido;
- administra biblioteca y programación;
- aprueba invitados y micrófonos;
- inicia y termina vivos.

### Locutor

- consulta biblioteca y programación;
- no guarda cambios de programación;
- inicia y termina vivo;
- opera el estudio, cámara, pantalla, efectos, cama y ducking.

### Periodista e invitado

- solicitan micrófono únicamente cuando existe un vivo;
- pueden pasar por prueba privada;
- solo se integran a WebRTC después de aprobación al aire;
- el administrador puede saltar la prueba y aprobar directamente al aire.

### Invitado solicitado desde la pantalla pública

- escribe nombre y apellido;
- el sistema reserva el usuario temporal;
- el campo Usuario se completa automáticamente;
- el foco pasa al campo Contraseña;
- si ya existe un vivo, se crea automáticamente la solicitud de micrófono;
- el administrador aprueba y comunica una contraseña temporal mostrada una sola vez.

No debilites esta matriz sin autorización explícita.

---

## 10. Comportamiento del vivo

Reglas de interfaz:

- En AutoDJ solo debe mostrarse **Iniciar vivo**.
- Durante EN VIVO solo debe mostrarse **Terminar vivo y regresar a AutoDJ**.
- El estudio del conductor debe permanecer abierto durante la demostración WebRTC en Vercel.
- Cámara y captura de pantalla requieren HTTPS fuera de `localhost`.
- El navegador siempre conserva el derecho de pedir permiso al usuario.
- Se recomienda usar audífonos para evitar realimentación.

Fuentes posibles:

- solo micrófono;
- cámara + micrófono;
- pantalla/ventana/pestaña + audio disponible;
- retiro de video manteniendo audio.

Producción en vivo:

- soundboard desde `live.efectos`;
- cama musical desde `live.camas`;
- ducking por detección de voz;
- material temporal con vigencia máxima de 24 horas;
- invitados y periodistas aprobados.

TURN es opcional. Solo se configura con servidor y credenciales reales.

---

## 11. Biblioteca y derechos

Categorías actuales:

### AutoDJ

- `autodj.libre`: música libre, independiente o con licencia no restrictiva;
- `autodj.sayco`: repertorio protegido con autorización SAYCO-ACINPRO;
- `autodj.produccion`: identificadores, cuñas, cortinillas, promociones y continuidad.

### En vivo

- material temporal con vencimiento máximo de 24 horas;
- efectos persistentes;
- camas musicales persistentes.

Principios:

- audio y video son válidos;
- validar extensión, MIME, tamaño, categoría y metadatos;
- no confiar solo en el nombre del archivo;
- `SAYCO-ACINPRO` exige confirmación administrativa antes de activar;
- RayoBoss registra la declaración, pero no reemplaza validación jurídica;
- los recursos de demostración incluidos son sintéticos propios;
- eliminar de una playlist no elimina de la biblioteca;
- eliminar de biblioteca debe delegar la eliminación física al proveedor correcto.

Nunca importes `@vercel/blob` directamente en la lógica de biblioteca o rutas generales. La ruta debe depender de `storage-factory.js` y del contrato `StorageProvider`.

---

## 12. StorageProvider

Contrato arquitectónico:

```text
MediaLibrary
   ↓
StorageProvider
   ├─ LocalDiskStorageProvider
   ├─ VercelBlobStorageProvider
   └─ ReadOnlyStorageProvider
```

Un futuro `S3StorageProvider` o `MinIOStorageProvider` debe implementar el mismo contrato sin cambiar la lógica del catálogo.

Selección:

```text
RAYOBOSS_STORAGE_PROVIDER=auto
```

Comportamiento:

| Entorno | Proveedor |
|---|---|
| Windows/VPS | `local-disk` |
| Vercel sin Blob | `vercel-demo-readonly` |
| Vercel con token | `vercel-blob` |

Valores válidos explícitos:

```text
auto
local
vercel-blob
```

`local` no es válido en Vercel.

Operaciones del contrato deben mantenerse equivalentes:

- guardar;
- leer;
- obtener URL;
- listar;
- eliminar;
- verificar existencia;
- consultar metadatos;
- describir capacidades.

Las claves deben generarse de forma segura por módulo, categoría y fecha. No usar directamente nombres originales como rutas confiables.

---

## 13. AutoDJ y programación visual

La interfaz visual es la fuente de operación para administradores y locutores. JSON es únicamente un formato técnico de respaldo/importación.

Funciones actuales:

- crear, renombrar y eliminar playlists;
- buscar y agregar contenidos activos;
- subir y bajar elementos;
- repetición continua;
- orden aleatorio;
- crear franjas por nombre, días, inicio, fin y playlist;
- activar o desactivar franjas;
- validar superposiciones;
- playlist de respaldo;
- identificador cada N pistas;
- cuña cada N minutos;
- orden secuencial o aleatorio de cuñas;
- crossfade de 0 a 10 segundos;
- exportar/importar respaldo JSON;
- descartar cambios;
- restablecer demostración.

Reglas:

- desarrollador y administrador editan;
- locutor solo consulta;
- las franjas nuevas nacen desactivadas;
- franjas activas no pueden superponerse;
- se soportan franjas que cruzan medianoche;
- `08:00–09:00` puede ir seguida de `09:00–10:00`;
- debe existir al menos una playlist;
- conservar migraciones de esquema;
- no mostrar JSON crudo como experiencia principal.

“Ahora programado” debe mostrar de forma humana:

- modo actual;
- título;
- audio o video;
- categoría;
- duración;
- progreso;
- tiempo restante;
- siguiente pieza;
- playlist;
- franja;
- continuidad;
- agenda semanal.

---

## 14. Endpoints relevantes

### Salud y autenticación

```text
GET  /api/health
POST /api/login
POST /api/logout
GET  /api/me
```

### Usuarios e invitados

```text
GET    /api/users
POST   /api/users
DELETE /api/users/:username
POST   /api/users/:username/password
POST   /api/guests/request
GET    /api/guests
POST   /api/guests/:id/approve
```

### En vivo

```text
GET  /api/live/status
POST /api/live/start
POST /api/live/end
GET  /api/live/stream
```

### Micrófonos

```text
GET  /api/microphones
GET  /api/microphones/me
POST /api/microphones/request
POST /api/microphones/:id/approve-test
POST /api/microphones/:id/approve-live
POST /api/microphones/me/test-result
POST /api/microphones/:id/revoke
```

### RTC

```text
POST /api/rtc/listeners/join
POST /api/rtc/participants/join
GET  /api/rtc/host/poll
POST /api/rtc/host/signal
POST /api/rtc/clients/poll
POST /api/rtc/clients/signal
POST /api/rtc/clients/leave
```

### Biblioteca

```text
GET    /api/media/config
GET    /api/media
PATCH  /api/media/:id
DELETE /api/media/:id
POST   /api/media/local-upload
POST   /api/media/upload-plan
POST   /api/media/blob-upload
```

### Programación

```text
GET  /api/programming
PUT  /api/programming
POST /api/programming/reset
```

### Público

```text
GET /api/public/on-air
GET /api/public/audio
GET /api/public/video
GET /api/public/embed-code
GET /embed?autoplay=1
```

El panel administrativo no debe poder embeberse. Solo `/embed` admite `frame-ancestors *` y no debe recibir `X-Frame-Options: DENY`.

---

## 15. Seguridad no negociable

- `.env` nunca se versiona.
- `BLOB_READ_WRITE_TOKEN` nunca se expone al navegador ni al repositorio.
- `RAYOBOSS_SECRET` debe tener al menos 32 caracteres y permanecer estable entre redeploys.
- `RAYOBOSS_DEV_PASSWORD` debe tener al menos 12 caracteres.
- Contraseñas: scrypt asíncrono, no texto plano.
- Sesiones: tokens stateless firmados.
- Cookies: HttpOnly, SameSite Strict y Secure detrás de HTTPS.
- Rechazar escrituras cross-origin no autorizadas.
- Mantener CSP estricta sin `unsafe-inline` para scripts.
- No usar `innerHTML` con datos de usuarios, solicitudes o medios.
- Mantener rate limit de login y evitar que éxitos consuman el límite.
- Cambiar contraseña o eliminar usuario invalida sesiones anteriores.
- El usuario protegido `dev` no se elimina.
- No imprimir secretos en logs, respuestas, commits o documentación.
- No agregar valores de ejemplo TURN como configuración real.
- No habilitar un proveedor que dependa de un token ausente.

---

## 16. Variables de entorno

Obligatorias:

```text
RAYOBOSS_DEV_PASSWORD
RAYOBOSS_SECRET
```

Recomendadas/base:

```text
PORT=3000
RAYOBOSS_STORAGE_PROVIDER=auto
RAYOBOSS_COOKIE_SECURE=auto
RAYOBOSS_SESSION_HOURS=12
RAYOBOSS_FRAME_MS=200
RAYOBOSS_SAMPLE_RATE=22050
RAYOBOSS_GAIN=0.7
RAYOBOSS_LIVE_SECONDS=90
RAYOBOSS_RTC_POLL_MS=900
RAYOBOSS_RTC_ROOM_TTL=900
RAYOBOSS_RTC_CLIENT_TTL=180
RAYOBOSS_RTC_MAX_PARTICIPANTS=8
RAYOBOSS_RTC_MAX_LISTENERS=40
```

TURN, VPS media endpoints y Blob son opcionales. Deben permanecer comentados en `.env.example` cuando no haya valores reales.

Vercel crea al conectar Blob:

```text
BLOB_READ_WRITE_TOKEN
```

No exigir que el usuario lo invente ni lo copie al `.env` local.

Al modificar variables:

- actualizar `.env.example`;
- actualizar validaciones en `server/config.js`;
- actualizar `scripts/doctor.js`;
- actualizar pruebas;
- actualizar documentación relevante.

---

## 17. Reglas de código

- Mantener CommonJS en servidor salvo migración integral expresamente aprobada.
- No agregar `"type": "module"` solo para silenciar una advertencia.
- Mantener nombres de archivos en minúsculas y con guiones donde ya se usa esa convención.
- Tratar rutas como case-sensitive.
- Evitar dependencias nuevas si Node.js o el código existente resuelven el problema.
- Al agregar dependencia:
  - justificarla;
  - fijar versión razonable;
  - actualizar `package-lock.json`;
  - ejecutar auditoría;
  - comprobar Vercel.
- Separar responsabilidades:
  - rutas: validación HTTP y autorización;
  - core: lógica de dominio;
  - provider: infraestructura;
  - cliente: presentación e interacción.
- No introducir acceso directo al filesystem o a Blob dentro de módulos de dominio.
- No editar archivos generados:
  - `api/index.js`;
  - `public/js/blob-client.js`.
- Si se modifica `server/vercel-entry.js`, rutas, core o cliente Blob, ejecutar `npm run build`.
- Mantener mensajes de interfaz y errores en español claro.
- Evitar jerga técnica visible al usuario final.
- No usar emojis en la interfaz ni documentación técnica.

---

## 18. Protocolo de cambio para Codex

Para cada tarea:

1. Resume el objetivo técnico en una frase.
2. Inspecciona los archivos afectados y sus dependencias.
3. Identifica pruebas existentes relacionadas.
4. Realiza el cambio mínimo suficiente.
5. Añade o modifica pruebas para cubrir la regresión.
6. Ejecuta validación específica durante el desarrollo.
7. Ejecuta la suite requerida antes de cerrar.
8. Revisa `git diff` y archivos no rastreados.
9. Informa:
   - qué cambió;
   - por qué;
   - archivos afectados;
   - pruebas ejecutadas;
   - límites o riesgos pendientes.

No ejecutes acciones destructivas como borrar `data/`, resetear Git, eliminar repositorios, limpiar buckets o destruir proyectos sin autorización explícita.

No reemplaces datos operativos reales con datos de prueba.

---

## 19. Comandos de validación

Durante cambios pequeños:

```bash
npm run build
npm run check:imports
npm test
npm run doctor
```

Antes de considerar una tarea terminada:

```bash
npm run verify
```

Cuando haya acceso a internet y se vaya a publicar:

```bash
npm run verify:full
```

En repositorio Git inicializado:

```bash
npm run check:git
```

La cadena completa verifica:

- cliente Blob;
- bundle Vercel;
- imports relativos;
- capitalización;
- 71 pruebas base o la cifra actualizada;
- configuración;
- archivos críticos;
- arranque simulado sin Blob;
- arranque simulado con Blob.

Si una prueba falla, no ocultarla ni eliminarla para conseguir verde. Corregir la causa o explicar por qué la expectativa debe cambiar.

---

## 20. Regresiones que deben seguir cubiertas

La suite debe conservar, como mínimo, cobertura de estas áreas:

- secretos obligatorios sin fallback incrustado;
- login, cookie segura, sesiones stateless y scrypt;
- rate limiting;
- autorización por roles;
- invalidación de sesiones;
- sanitización de solicitudes de invitados;
- credenciales temporales mostradas una sola vez;
- CSP y prevención de XSS;
- selección de AutoDJ;
- controles correctos de iniciar/terminar vivo;
- latencia inicial y ritmo del stream;
- backpressure y cierre absoluto;
- escritura atómica y recuperación `.bak`;
- pruebas aisladas de `data/`;
- reserva automática del usuario invitado;
- solicitud de micrófono condicionada al vivo;
- prueba y aprobación directa al aire;
- autorización WebRTC;
- biblioteca audiovisual;
- endpoints públicos;
- iframe público sin relajar el panel;
- cámara, pantalla, soundboard y ducking;
- sincronización automática de `dev`;
- contrato StorageProvider;
- proveedor local;
- modo Vercel read-only;
- modo Vercel Blob;
- programación visual;
- resumen humano;
- rechazo de franjas superpuestas;
- variables opcionales comentadas;
- existencia y ruta exacta de `storage-factory.js`;
- bundle autocontenido;
- controles de publicación Git;
- README en presente;
- `.gitignore` con `/storage/` y no `storage/`.

Si cambia el comportamiento esperado, actualizar pruebas y documentación de forma coordinada, no de manera aislada.

---

## 21. Vercel: diagnóstico obligatorio

Distinguir siempre:

- **Build Logs:** instalación y compilación.
- **Runtime Logs:** ejecución de la función.

Si el build termina y `/api/health` responde 500, revisar Runtime Logs.

`server/vercel-entry.js` debe capturar errores de arranque y responder:

```json
{
  "ok": false,
  "code": "RAYOBOSS_BOOT_FAILED",
  "error": "La aplicación no pudo iniciar. Consulte Runtime Logs en Vercel."
}
```

No exponer stack traces ni secretos al público en producción.

Errores de módulos faltantes suelen indicar:

- archivo no versionado;
- patrón incorrecto en `.gitignore`;
- diferencia de mayúsculas/minúsculas;
- bundle desactualizado;
- import relativo incorrecto.

Antes de asumir que faltan variables, verificar el stack real.

---

## 22. Límites honestos del modelo Vercel

Vercel sirve para demostrar:

- panel y roles;
- Blob;
- programación visual;
- AutoDJ resuelto por reloj;
- vivo WebRTC;
- reproductor público;
- audio y video de prueba.

No tratar Vercel como una emisora 24/7 completa:

- las funciones no son workers permanentes;
- Runtime Cache no es PostgreSQL;
- el vivo WebRTC depende del navegador conductor abierto;
- el autoplay audible puede ser bloqueado por el navegador;
- la distribución masiva requiere plano de medios.

El reproductor debe intentar autoplay, pero mostrar una acción clara para activar sonido cuando el navegador lo exija. No prometer reproducción audible automática universal.

---

## 23. Objetivo de producción en VPS

La interfaz y el plano de control deben conservarse. La VPS añadirá gradualmente:

- proceso persistente administrado por systemd;
- Caddy o Nginx con HTTPS;
- almacenamiento local, MinIO o S3;
- PostgreSQL;
- MediaMTX o equivalente;
- Icecast;
- FFmpeg o Liquidsoap;
- HLS para video;
- TURN administrado;
- normalización de loudness;
- grabación cuando aplique;
- logs estructurados;
- monitoreo y alertas de silencio;
- respaldos externos.

La interfaz visual produce la programación. En producción, un worker persistente debe ejecutar continuidad, insertar identificadores y cuñas, aplicar crossfade/normalización y publicar a la capa de medios.

No implementar estos componentes como activos ficticios. Usar adaptadores y variables opcionales hasta disponer de infraestructura real.

---

## 24. Documentación como sistema de referencia

Consultar según la tarea:

- `README.md`: instalación y visión del producto actual.
- `docs/00-DESPLIEGUE-DESDE-CERO.md`.
- `docs/01-INSTALACION-WINDOWS.md`.
- `docs/02-DESPLIEGUE-VERCEL.md`.
- `docs/03-DESPLIEGUE-VPS.md`.
- `docs/04-PROGRAMACION-VISUAL.md`.
- `docs/05-BIBLIOTECA-Y-DERECHOS.md`.
- `docs/06-OPERACION-EN-VIVO.md`.
- `docs/07-ENDPOINTS-PUBLICOS.md`.
- `docs/08-SEGURIDAD-RESPALDOS-Y-RECUPERACION.md`.
- `docs/09-ARQUITECTURA-DE-PRODUCCION.md`.
- `docs/10-VERIFICACION-TECNICA.md`.

Al cambiar una función visible, actualizar la documentación correspondiente. No convertir README en un historial. Si se requiere historial técnico, usar `CHANGELOG.md` únicamente cuando el usuario lo solicite o el flujo de release lo adopte formalmente.

---

## 25. Criterio de finalización

Una tarea solo está terminada cuando:

- el comportamiento solicitado funciona;
- no rompe roles ni seguridad;
- los imports existen y respetan capitalización;
- el bundle Vercel fue regenerado cuando corresponde;
- las pruebas relevantes y `npm run verify` pasan;
- Git no incluye secretos ni datos operativos;
- la interfaz sigue siendo comprensible para no técnicos;
- la documentación afectada está actualizada;
- se describen honestamente las validaciones realizadas y las pendientes.

La prioridad no es producir más archivos ni más versiones: es mantener RayoBoss estable, comprensible, desplegable y listo para evolucionar desde 4.0.1 hacia una operación radial profesional.
