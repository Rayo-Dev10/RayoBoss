# RayoBoss 4.0.1

RayoBoss es una plataforma de control para una emisora universitaria multimedia. Integra autenticación por roles, solicitudes de invitados, permisos de micrófono, estudio WebRTC, captura de cámara o pantalla, biblioteca audiovisual con metadatos y licencias, carga masiva, AutoDJ programable mediante interfaz visual, informe mensual de reproducción, continuidad radial, reproductor público embebible y almacenamiento intercambiable.

## Requisitos

- Windows 10 u 11.
- Git para Windows, con Git Bash.
- Node.js 22 LTS.
- Cuenta de GitHub.
- Cuenta de Vercel.

## Preparación local desde cero

1. Descomprime el ZIP en una carpeta nueva, por ejemplo:

```text
C:\Users\Rayo\Documents\GitHub\RayoBoss
```

2. Abre esa carpeta, haz clic derecho y selecciona **Open Git Bash here**.
3. Ejecuta:

```bash
npm config set registry https://registry.npmjs.org/
bash scripts/windows-first-run.sh
```

El script:

- crea `.env` con secretos aleatorios;
- muestra la contraseña inicial del usuario `dev` una sola vez;
- instala exactamente las dependencias de `package-lock.json`;
- compila el cliente de Vercel Blob y la función serverless autocontenida;
- comprueba todos los imports y su capitalización;
- ejecuta las pruebas y el diagnóstico;
- simula el arranque del bundle de Vercel con y sin Blob.

Guarda la contraseña mostrada fuera del repositorio.

4. Inicia RayoBoss:

```bash
npm start
```

5. Abre:

```text
http://localhost:3000
```

6. Inicia sesión:

```text
Usuario: dev
Contraseña: valor mostrado al crear .env
```

No borres `data/` para iniciar sesión. El usuario `dev` se sincroniza automáticamente con la contraseña vigente de `.env`.

## Publicación en GitHub

1. Crea en GitHub un repositorio privado y vacío. No agregues README, licencia ni `.gitignore` desde GitHub.
2. Copia la URL HTTPS del repositorio.
3. En Git Bash ejecuta, reemplazando la URL:

```bash
bash scripts/publish-github.sh https://github.com/USUARIO/RayoBoss.git
```

El script verifica antes del `push` que Git incluya archivos críticos como:

```text
server/core/storage/storage-factory.js
server/core/storage/storage-provider.js
api/index.js
```

También confirma que `.env`, `data/`, `node_modules/` y `.vercel/` no estén versionados.

## Despliegue en Vercel

1. En Vercel selecciona **Add New → Project**.
2. Importa el repositorio de GitHub.
3. En **Framework Preset**, selecciona **Other**.
4. Mantén la raíz del repositorio como **Root Directory**.
5. Importa el archivo `.env` generado en Windows en la sección de variables de entorno.
6. Confirma el despliegue.

`vercel.json` fija:

```text
Install Command: npm ci
Build Command: npm run build
Node.js: 22.x mediante package.json
```

El primer despliegue debe funcionar sin Blob. Comprueba:

```text
https://TU-PROYECTO.vercel.app/api/health
```

Respuesta esperada:

```json
{
  "ok": true,
  "name": "RayoBoss",
  "version": "4.0.1",
  "mode": "vercel-poc"
}
```

## Conectar Vercel Blob

Después del primer despliegue exitoso:

1. Abre el proyecto en Vercel.
2. Ve a **Storage → Create Database → Blob**.
3. Configura:

```text
Access: Public
Environment Variable Prefix: BLOB
Read-write token: activado
Entornos: Production y Preview
```

4. Conecta el Blob Store al mismo proyecto.
5. Ejecuta **Redeploy** sobre el último despliegue.
6. Inicia sesión y abre **Biblioteca**.

Resultado esperado:

```text
Proveedor: vercel-blob
Modo de carga: direct
Escritura: habilitada
```

`RAYOBOSS_STORAGE_PROVIDER=auto` selecciona automáticamente:

| Entorno | Proveedor |
|---|---|
| Windows o VPS | `local-disk` |
| Vercel sin Blob | `vercel-demo-readonly` |
| Vercel con Blob conectado | `vercel-blob` |

La biblioteca confirma por separado la carga física y el alta en el catálogo. Si un archivo llegó a Blob pero la confirmación fue interrumpida, aparece en **Archivos por incorporar** para completar su ficha sin volver a cargarlo.

## URLs de operación

Después de iniciar sesión, cada módulo puede abrirse y compartirse internamente mediante una URL estable:

```text
/inicio
/administrativo
/en-vivo
/biblioteca
/programacion
/informes
/reproductor
/diagnostico
```

La señal destinada a oyentes continúa separada en `/embed?autoplay=1`. El panel administrativo no carga ni reproduce esa señal al ingresar.

## Verificación manual mínima

1. Abrir `/api/health`.
2. Iniciar sesión como `dev`.
3. Cargar un MP3 corto en Biblioteca y comprobar duración, metadatos y soporte de licencia.
4. Crear una playlist desde la interfaz visual y confirmar que la pieza aparece sin recargar el despliegue.
5. Asignarla a una franja.
6. Abrir `/embed?autoplay=1` en otro dispositivo.
7. Iniciar un vivo y comprobar audio o video desde un celular.
8. Eliminar el archivo de prueba y confirmar que desaparece del Blob Store.
9. Abrir `/informes` y exportar el consolidado mensual en CSV.

## Comandos útiles

```bash
npm start
npm run verify
npm run verify:full
npm run doctor
npm run check:git
npm run reset-dev-password
```

## Documentación

- `docs/00-DESPLIEGUE-DESDE-CERO.md`
- `docs/01-INSTALACION-WINDOWS.md`
- `docs/02-DESPLIEGUE-VERCEL.md`
- `docs/03-DESPLIEGUE-VPS.md`
- `docs/04-PROGRAMACION-VISUAL.md`
- `docs/05-BIBLIOTECA-Y-DERECHOS.md`
- `docs/06-OPERACION-EN-VIVO.md`
- `docs/07-ENDPOINTS-PUBLICOS.md`
- `docs/08-SEGURIDAD-RESPALDOS-Y-RECUPERACION.md`
- `docs/09-ARQUITECTURA-DE-PRODUCCION.md`
- `docs/10-VERIFICACION-TECNICA.md`

## Alcance de Vercel y VPS

Vercel permite demostrar el panel, el almacenamiento Blob, el AutoDJ por reloj y el vivo WebRTC. Una operación radial institucional 24/7 debe desplegar en VPS un motor de continuidad persistente, servidor de medios, base de datos, monitoreo, respaldos externos y TURN administrado cuando sea necesario.
