# Auditoría retrospectiva: decisiones que convenía tomar desde el inicio

## 1. Interfaz humana antes que JSON

El modelo anterior exponía la estructura interna como editor principal. Era eficiente para desarrollo, pero inadecuado para locutores. La versión 4 conserva JSON únicamente como respaldo e introduce formularios visuales.

## 2. Separar plano de control y plano de medios

Desde el inicio convenía declarar que Vercel demuestra control, señalización y almacenamiento, mientras la VPS soportará la emisión 24/7. Esto evita diseñar funciones serverless como procesos radiales permanentes.

## 3. Abstracción de almacenamiento temprana

`StorageProvider` debió existir antes de integrar Blob. Incorporarlo evita que AutoDJ, biblioteca y vivo dependan de Vercel o del disco.

## 4. Instalación reproducible

Debían fijarse desde la primera entrega:

- Node `22.x`;
- `package-lock.json` limpio;
- `npm ci`;
- `.env.example` versionable;
- variables opcionales comentadas;
- registro npm público;
- repositorio sin `node_modules` ni datos.

## 5. Pruebas aisladas

Las pruebas nunca debieron tocar `data/`. La versión 4 mantiene directorios temporales, sincronización automática de `dev` y prueba de regresión.

## 6. Contratos y migraciones de estado

El estado de programación ahora tiene versión de esquema y migración. En producción debe existir migración transaccional en base de datos.

## 7. Validación de conflictos

La programación debe impedir superposiciones y mostrar errores legibles antes de afectar el aire. La versión 4 lo incorpora.

## 8. Trazabilidad jurídica desde la biblioteca

Categorías, confirmación de derechos y referencias debían formar parte del catálogo desde el inicio. Aun falta automatizar reportes de repertorio y vencimientos.

## 9. Próximos cambios que sí justifican una versión mayor

- PostgreSQL y auditoría transaccional.
- Worker AutoDJ persistente.
- S3/MinIO.
- MediaMTX/Icecast/HLS integrados.
- observabilidad, alertas y grabación.
- reportes legales y analítica de audiencia.

Estos cambios deben implementarse cuando exista la infraestructura VPS; no conviene simularlos mediante archivos o procesos efímeros en Vercel.
