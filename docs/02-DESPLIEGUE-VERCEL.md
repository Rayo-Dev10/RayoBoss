# Despliegue limpio en Vercel

## 1. Preparar el repositorio

Desde Git Bash:

```bash
npm ci
npm run verify
npm run doctor
git status --short
git add -A
git commit -m "release: RayoBoss 4.0.0"
git push
```

El repositorio no debe contener `.env`, `data/`, `node_modules/`, `.vercel/`, logs ni respaldos.

## 2. Crear el proyecto

1. Ingresar a Vercel.
2. Elegir **Add New → Project**.
3. Importar el repositorio privado de GitHub.
4. Usar la raíz del repositorio como Root Directory.
5. Mantener Node.js `22.x`.
6. Confirmar que `vercel.json` define `npm ci` y `npm run build`.

## 3. Variables obligatorias

Generar en Git Bash:

```bash
node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Crear en Vercel:

```text
RAYOBOSS_DEV_PASSWORD=<primer valor>
RAYOBOSS_SECRET=<segundo valor>
RAYOBOSS_STORAGE_PROVIDER=auto
RAYOBOSS_LIVE_SECONDS=90
RAYOBOSS_FRAME_MS=200
RAYOBOSS_SCRYPT_N=131072
```

Aplicarlas a Production y Preview. No crear variables TURN vacías.

## 4. Primer despliegue sin Blob

Desplegar primero. La biblioteca quedará en modo `vercel-demo-readonly`; los recursos incluidos, el AutoDJ, la programación y el vivo siguen disponibles, pero no se podrán cargar archivos persistentes.

## 5. Crear Vercel Blob

1. Abrir el proyecto → **Storage**.
2. Elegir **Create Database → Blob**.
3. Nombre sugerido: `rayo-boss-blob`.
4. Access: **Public**.
5. Elegir una región cercana al público objetivo.
6. Prefijo de variables: `BLOB`.
7. Incluir el token de lectura/escritura para los entornos requeridos.
8. Conectar Production y Preview.
9. Crear el store.
10. Redeployar la aplicación.

Vercel añadirá las variables de conexión. No inventar ni copiar el token al repositorio.

## 6. Verificación de Blob

1. Ingresar como `dev`.
2. Abrir **Biblioteca**.
3. Confirmar `vercel-blob (direct)` y escritura habilitada.
4. Cargar un MP3 corto.
5. Incorporarlo a una playlist desde la interfaz visual.
6. Verificar reproducción.
7. Eliminarlo y comprobar que desaparece del store.
8. Repetir con un MP4 corto.

## 7. Pruebas de audiencia

- AutoDJ: abrir `/embed?autoplay=1`.
- Vivo: iniciar desde el computador y abrir la URL desde un celular.
- Probar la misma Wi-Fi, otra Wi-Fi y datos móviles.
- Algunos navegadores exigen una pulsación para activar audio audible.

## 8. Límites de la demostración

- El estado transaccional de usuarios y programación usa almacenamiento temporal del entorno Vercel.
- El vivo WebRTC requiere mantener abierto el estudio del conductor.
- Blob guarda archivos, no sustituye PostgreSQL.
- La audiencia masiva y la emisión 24/7 deben trasladarse a la VPS y a un servidor de medios.
