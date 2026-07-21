# Despliegue en VPS Linux

## 1. Alcance

La VPS ejecutará RayoBoss como plano de control y, inicialmente, puede operar con almacenamiento local y vivo WebRTC. Para operación radial 24/7 debe añadirse un plano de medios con AutoDJ persistente, HLS/Icecast/MediaMTX, monitoreo y respaldos externos.

## 2. Requisitos del administrador de sistemas

- Linux LTS actualizado.
- Node.js 22.x instalado de forma global.
- Git, Caddy o Nginx y certificados HTTPS.
- FFmpeg para validación y futura conversión de medios.
- Subdominio y DNS.
- Puertos 80 y 443.
- Volumen persistente suficiente para audio y video.
- Usuario de servicio sin privilegios.
- Política de firewall, copias y monitoreo.

Verificar:

```bash
node --version
npm --version
git --version
ffmpeg -version
```

## 3. Instalar el código

```bash
sudo mkdir -p /opt/rayoboss
sudo chown "$USER":"$USER" /opt/rayoboss
git clone URL_PRIVADA /opt/rayoboss
cd /opt/rayoboss
npm ci
npm run build
npm test
```

## 4. Crear secretos de producción

```bash
node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Crear `/etc/rayoboss.env`:

```text
NODE_ENV=production
PORT=3000
RAYOBOSS_DEV_PASSWORD=<valor seguro>
RAYOBOSS_SECRET=<valor seguro>
RAYOBOSS_STORAGE_PROVIDER=local
RAYOBOSS_COOKIE_SECURE=auto
RAYOBOSS_TRUST_PROXY=loopback, linklocal, uniquelocal
RAYOBOSS_MAX_UPLOAD_MB=500
```

Proteger:

```bash
sudo chown root:www-data /etc/rayoboss.env
sudo chmod 640 /etc/rayoboss.env
```

## 5. Preparar almacenamiento

```bash
sudo mkdir -p /opt/rayoboss/{data,logs,backups}
sudo chown -R www-data:www-data /opt/rayoboss/data /opt/rayoboss/logs /opt/rayoboss/backups
sudo chmod 700 /opt/rayoboss/data /opt/rayoboss/logs /opt/rayoboss/backups
```

## 6. Instalar systemd

```bash
sudo cp deploy/rayoboss.service /etc/systemd/system/rayoboss.service
sudo systemctl daemon-reload
sudo systemctl enable --now rayoboss
sudo systemctl status rayoboss
```

Logs:

```bash
sudo journalctl -u rayoboss -f
```

## 7. Configurar HTTPS con Caddy

Editar `deploy/Caddyfile` y reemplazar el dominio. Después:

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

HTTPS es obligatorio para micrófono, cámara y captura de pantalla fuera de `localhost`.

## 8. Verificación

```bash
cd /opt/rayoboss
sudo -u www-data env $(sudo cat /etc/rayoboss.env | xargs) node scripts/doctor.js
curl -fsS https://DOMINIO/api/health
```

Probar login, biblioteca, programación visual, AutoDJ, vivo y `/embed`.

## 9. Actualización

```bash
cd /opt/rayoboss
sudo -u www-data bash scripts/backup.sh
git pull --ff-only
npm ci
npm run verify
sudo systemctl restart rayoboss
sudo systemctl status rayoboss
```

## 10. Plano de medios de producción

Cuando el administrador libere recursos:

1. desplegar MediaMTX o equivalente para ingesta y salida audiovisual;
2. desplegar Icecast para audio compatible con reproductores tradicionales;
3. usar FFmpeg o Liquidsoap como AutoDJ de servidor;
4. configurar HLS para video y audiencia amplia;
5. definir en `/etc/rayoboss.env`:

```text
RAYOBOSS_PUBLIC_AUDIO_URL=https://radio.example.edu/stream
RAYOBOSS_PUBLIC_VIDEO_URL=https://radio.example.edu/video.mp4
RAYOBOSS_PUBLIC_HLS_URL=https://radio.example.edu/hls/index.m3u8
```

RayoBoss conservará la interfaz, biblioteca, roles y programación; el transporte masivo será responsabilidad del servidor de medios.

## 11. TURN

Configurar TURN solo con credenciales reales:

```text
RAYOBOSS_TURN_URL=turns:turn.example.edu:5349
RAYOBOSS_TURN_USERNAME=<usuario>
RAYOBOSS_TURN_CREDENTIAL=<secreto>
```

No usar valores de ejemplo en producción.
