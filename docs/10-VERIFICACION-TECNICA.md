# Verificación técnica

La validación se ejecuta con:

```bash
pnpm run verify
```

Incluye:

- compilación del cliente Blob;
- generación del bundle autocontenido para Vercel;
- comprobación de imports relativos y capitalización;
- pruebas funcionales;
- diagnóstico de configuración;
- verificación de archivos críticos;
- arranque simulado del bundle Vercel sin Blob y con Blob conectado.

La suite actual contiene 128 pruebas. Incluye 50 verificaciones nuevas para Node.js 24, pnpm 10, Express 5, MusicBrainz/Picard y la participación de coanfitriones sin reemplazar el vivo activo.

La auditoría conectada al registro de paquetes se ejecuta con:

```bash
pnpm run verify:full
```

Antes del `push`, `scripts/publish-github.sh` comprueba que Git esté siguiendo todos los módulos necesarios y que `.env` no forme parte del commit.
