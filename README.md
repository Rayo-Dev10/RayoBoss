# RayoBoss 4.0.0

RayoBoss es el plano de control de una emisora universitaria multimedia. Integra autenticación por roles, solicitudes de invitados, permisos de micrófono, estudio WebRTC, captura de cámara o pantalla, biblioteca de audio y video, AutoDJ, continuidad radial, reproductor público y almacenamiento intercambiable.

## Cambio principal de la versión 4

La programación del AutoDJ se administra mediante una interfaz visual para usuarios no técnicos. El JSON deja de ser un editor operativo y queda únicamente como formato de respaldo exportable/importable.

La interfaz permite:

- crear, nombrar y eliminar playlists;
- agregar contenidos de la biblioteca;
- ordenar piezas mediante botones subir/bajar;
- activar orden aleatorio y repetición;
- crear franjas con días, horas y playlist;
- habilitar o deshabilitar franjas;
- configurar identificadores, cuñas, orden y transición;
- consultar “Ahora programado” en lenguaje humano;
- exportar e importar respaldos;
- detectar franjas superpuestas antes de guardar.

## Inicio rápido en Windows con Git Bash

```bash
bash scripts/windows-first-run.sh
npm start
```

Abrir `http://localhost:3000` e ingresar con el usuario `dev` y la contraseña mostrada por el script.

RayoBoss sincroniza automáticamente `dev` con `RAYOBOSS_DEV_PASSWORD` y las pruebas usan un directorio temporal aislado.

## Comprobación

```bash
npm run verify
npm run doctor
```

Resultado esperado: **66/66 pruebas aprobadas** y auditoría de dependencias sin vulnerabilidades conocidas reportadas por npm en el momento de la construcción.

## Almacenamiento

`RAYOBOSS_STORAGE_PROVIDER=auto` selecciona:

| Entorno | Proveedor |
|---|---|
| Windows o VPS | `local-disk` |
| Vercel sin Blob | `vercel-demo-readonly` |
| Vercel con Blob conectado | `vercel-blob` |

## Documentación

0. `docs/00-PLAN-REINICIO-DESDE-CERO.md`
1. `docs/01-INSTALACION-WINDOWS.md`
2. `docs/02-DESPLIEGUE-VERCEL.md`
3. `docs/03-DESPLIEGUE-VPS.md`
4. `docs/04-PROGRAMACION-VISUAL.md`
5. `docs/05-BIBLIOTECA-Y-DERECHOS.md`
6. `docs/06-OPERACION-EN-VIVO.md`
7. `docs/07-ENDPOINTS-PUBLICOS.md`
8. `docs/08-SEGURIDAD-RESPALDOS-Y-RECUPERACION.md`
9. `docs/09-ARQUITECTURA-DE-PRODUCCION.md`
10. `docs/10-AUDITORIA-RETROSPECTIVA.md`
11. `docs/11-REPORTE-DE-PRUEBAS.md`

## Límite técnico honesto

Vercel demuestra la aplicación completa, el almacenamiento Blob y el vivo WebRTC, pero no reemplaza por sí solo una infraestructura radial 24/7. En producción, la VPS debe añadir un motor AutoDJ persistente, servidor de medios, base de datos, monitoreo, respaldos externos y TURN administrado según la escala institucional.
