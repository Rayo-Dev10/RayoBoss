# Plan de reinicio total desde cero

Este procedimiento aplica cuando se eliminarán el repositorio anterior de GitHub y el proyecto anterior de Vercel para reconstruir RayoBoss 4.0.0 sin residuos históricos.

## 1. Antes de eliminar recursos

1. Detener cualquier transmisión en vivo.
2. Descargar o respaldar los MP3, MP4 y demás medios que deban conservarse.
3. Exportar la programación desde **Programación → Exportar respaldo**.
4. Ejecutar un respaldo local si existe una instalación Windows o VPS:

```bash
bash scripts/backup.sh
```

5. Registrar los dominios personalizados, variables necesarias y configuraciones operativas. No copiar secretos a documentos públicos.
6. Confirmar que el ZIP limpio de RayoBoss 4.0.0 y el manual definitivo fueron descargados y que su SHA256 coincide.
7. Eliminar el repositorio, proyecto, dominio o Blob anterior únicamente cuando los respaldos estén verificados.

## 2. Preparar Windows desde el ZIP limpio

1. Descomprimir el repositorio en:

```text
C:\Users\Rayo\Documents\GitHub\RayoBoss
```

2. Abrir la carpeta y seleccionar **Open Git Bash here**.
3. Ejecutar:

```bash
npm config set registry https://registry.npmjs.org/
bash scripts/windows-first-run.sh
```

4. Guardar fuera del repositorio la contraseña de `dev` mostrada por el script.
5. Iniciar:

```bash
npm start
```

6. Abrir `http://localhost:3000` y comprobar login, biblioteca, programación visual, reproductor y vivo.

## 3. Crear un repositorio privado nuevo

Desde la raíz del ZIP limpio:

```bash
git init
git branch -M main
git add -A
git commit -m "release: RayoBoss 4.0.0"
git remote add origin URL_DEL_REPOSITORIO_PRIVADO
git push -u origin main
```

Antes del commit, confirme:

```bash
git status --short
git check-ignore -v .env data node_modules .vercel 2>/dev/null || true
```

No copie `.git` ni `.vercel` desde la instalación anterior.

## 4. Crear el proyecto de Vercel

1. Importar el repositorio privado nuevo.
2. Usar la raíz del repositorio.
3. Mantener Node.js 22.x y los comandos de `vercel.json`.
4. Crear `RAYOBOSS_DEV_PASSWORD`, `RAYOBOSS_SECRET` y las variables recomendadas descritas en `02-DESPLIEGUE-VERCEL.md`.
5. Realizar el primer despliegue sin Blob.
6. Comprobar login y recursos de demostración.
7. Crear un Blob público, conectarlo a Production y Preview e incluir el token de lectura/escritura.
8. Redeployar.
9. Cargar y eliminar un MP3 y un MP4 de prueba.
10. Restaurar manualmente el catálogo y la programación que deban conservarse.

## 5. Preparar la futura VPS

No copie el directorio de Windows completo. Clone el repositorio privado en `/opt/rayoboss`, cree secretos nuevos para producción y siga `03-DESPLIEGUE-VPS.md`.

La VPS debe usar almacenamiento persistente y un servicio `systemd`. Para operación 24/7, el plano de medios deberá incorporar FFmpeg o Liquidsoap, MediaMTX/Icecast/HLS, monitoreo, base de datos y respaldos externos.

## 6. Limpieza cuando se reutiliza una carpeta Git existente

Primero revise:

```bash
bash scripts/clean-workspace.sh
```

Después aplique:

```bash
bash scripts/clean-workspace.sh --apply
git add -A
git status --short
```

El script conserva `.git` y `.env`, pero elimina dependencias, datos locales, logs, respaldos, `.vercel`, manifests y documentos históricos de actualización. `.env` permanece ignorado por Git.
