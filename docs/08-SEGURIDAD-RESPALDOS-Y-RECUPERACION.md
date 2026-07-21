# Seguridad, respaldos y recuperación

## Secretos

- `.env` nunca se publica.
- `RAYOBOSS_SECRET` debe ser aleatorio y estable.
- Cambiar `RAYOBOSS_DEV_PASSWORD` sincroniza automáticamente `dev` al siguiente arranque.
- No compartir `BLOB_READ_WRITE_TOKEN`.

## Sesiones

Las sesiones son tokens firmados, almacenados en cookie HttpOnly con SameSite Strict y `Secure` detrás de HTTPS.

## Datos

En local/VPS, JSON se escribe mediante archivo temporal y cambio atómico, con copia `.bak`. Ante corrupción se intenta recuperar la copia y se conserva el archivo corrupto para análisis.

## Respaldo

```bash
bash scripts/backup.sh
```

Mantener copias fuera de la VPS. Respaldar también:

- `/etc/rayoboss.env`;
- `data/`;
- configuración Caddy/systemd;
- archivos multimedia o bucket externo;
- reportes de derechos.

## Recuperación

```bash
bash scripts/restore.sh RUTA_DEL_BACKUP
```

Leer la salida y detener el servicio antes de reemplazar datos de producción.

## Principio de mínimo privilegio

- `dev` protegido.
- administradores no crean desarrolladores;
- solo desarrollador elimina usuarios;
- locutores no modifican programación;
- invitados y periodistas solo acceden al micrófono durante un vivo y con autorización.
