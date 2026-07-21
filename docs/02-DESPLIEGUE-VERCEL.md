# Despliegue en Vercel

## Preparar GitHub

Crea un repositorio privado y vacío. Desde Git Bash ejecuta:

```bash
bash scripts/publish-github.sh https://github.com/USUARIO/RayoBoss.git
```

El script compila y comprueba la función serverless antes de publicar.

## Importar el proyecto

1. En Vercel selecciona **Add New → Project**.
2. Importa el repositorio.
3. Framework Preset: **Other**.
4. Root Directory: raíz del repositorio.
5. Importa el archivo `.env` creado durante la preparación local.
6. Inicia el despliegue.

No agregues variables TURN sin disponer de un servidor TURN real.

## Verificar el primer despliegue

Abre:

```text
https://TU-PROYECTO.vercel.app/api/health
```

Debe responder con `ok: true` y `version: 4.0.1`.

## Conectar Blob

1. Ve a **Storage → Create Database → Blob**.
2. Access: **Public**.
3. Environment Variable Prefix: `BLOB`.
4. Activa el token de lectura y escritura.
5. Conecta Production y Preview.
6. Ejecuta Redeploy.

Vercel crea `BLOB_READ_WRITE_TOKEN`. No lo copies al repositorio ni lo añadas al `.env` que se guarda en Windows.

## Diagnóstico

Si `/api/health` falla, consulta **Runtime Logs**. La función incluida devuelve `RAYOBOSS_BOOT_FAILED` de forma controlada si la aplicación no puede iniciar.
