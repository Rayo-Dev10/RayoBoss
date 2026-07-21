# Arquitectura de producción

## Plano de control

RayoBoss gestiona usuarios, roles, solicitudes, permisos, biblioteca, metadatos jurídicos, playlists, franjas, continuidad, consola de estudio, endpoints y diagnóstico.

## Plano de medios

La demostración mezcla y distribuye el vivo desde el navegador mediante WebRTC. La producción 24/7 debe incorporar:

- MediaMTX o equivalente para ingesta y distribución;
- Icecast para audio tradicional;
- FFmpeg o Liquidsoap para AutoDJ de servidor;
- HLS para video;
- TURN administrado;
- normalización y medición de loudness;
- grabación y archivo cuando aplique.

## Persistencia

La siguiente etapa institucional debe mover usuarios, catálogo, programación, auditoría y permisos a PostgreSQL. Los objetos pueden vivir en disco, MinIO, S3 o Blob mediante `StorageProvider`.

## StorageProvider

El contrato evita acoplar la biblioteca a un proveedor:

```text
MediaLibrary
   ↓
StorageProvider
   ├─ LocalDiskStorageProvider
   ├─ VercelBlobStorageProvider
   └─ ReadOnlyStorageProvider
```

Un futuro `S3StorageProvider` debe implementar el mismo contrato.

## Motor AutoDJ de servidor

La interfaz visual produce la configuración. En producción, un worker persistente debe:

1. leer programación y catálogo;
2. resolver la franja vigente;
3. preparar la cola;
4. insertar identificadores y cuñas;
5. aplicar crossfade y normalización;
6. publicar a Icecast/MediaMTX;
7. registrar repertorio y errores;
8. recuperar continuidad tras reinicios.

## Observabilidad

Se requiere:

- métricas de CPU, memoria, disco y red;
- logs estructurados;
- alertas de silencio y caída del stream;
- salud del almacenamiento;
- auditoría de acciones administrativas;
- retención y rotación.
