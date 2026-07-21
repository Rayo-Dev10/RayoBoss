# Verificación técnica

La validación se ejecuta con:

```bash
npm run verify
```

Incluye:

- compilación del cliente Blob;
- generación del bundle autocontenido para Vercel;
- comprobación de imports relativos y capitalización;
- pruebas funcionales;
- diagnóstico de configuración;
- verificación de archivos críticos;
- arranque simulado del bundle Vercel sin Blob y con Blob conectado.

La auditoría de dependencias conectada a npm se ejecuta con:

```bash
npm run verify:full
```

Antes del `push`, `scripts/publish-github.sh` comprueba que Git esté siguiendo todos los módulos necesarios y que `.env` no forme parte del commit.
