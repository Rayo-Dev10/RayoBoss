# Biblioteca multimedia y derechos

La biblioteca se abre en:

```text
/biblioteca
```

La interfaz presenta fichas reproducibles y filtros por título, artista, álbum, ISRC, categoría, estado y soporte jurídico. Escuchar una previsualización dentro de la biblioteca no cuenta como una emisión al aire.

## Categorías

### AutoDJ

- Música libre y no restrictiva.
- SAYCO-ACINPRO.
- Producción y continuidad: identificadores, cuñas, cortinillas y promociones.

### En vivo

- Material temporal con vencimiento máximo de 24 horas.
- Efectos persistentes.
- Camas musicales persistentes.

## Carga

1. Seleccionar o arrastrar audio o video.
2. Esperar la comprobación técnica del formato y la duración.
3. Revisar título, artista, álbum, género, año, ISRC, compositor y sello. En MP3 se aprovechan etiquetas ID3 disponibles.
4. Elegir el destino editorial y, cuando corresponda, el subtipo de producción.
5. Elegir el tipo de licencia, registrar su base y referencia.
6. Adjuntar opcionalmente un certificado TXT, PDF, JPG, PNG o WebP.
7. Confirmar los derechos de emisión y pulsar **Incorporar a la biblioteca**.

La duración no se escribe manualmente: el navegador la obtiene del archivo y el servidor rechaza fichas sin una duración válida.

La comprobación técnica distingue audio y video. La condición de “música” es una clasificación editorial: se asigna al elegir `Música libre y no restrictiva` o `SAYCO-ACINPRO`; el sistema no pretende inferir derechos o naturaleza musical únicamente a partir de la forma de onda.

## Carga masiva

Puede seleccionarse un lote de hasta 200 archivos. RayoBoss:

- analiza hasta cuatro archivos en paralelo;
- conserva las etiquetas musicales detectadas por pieza;
- carga hasta tres archivos simultáneamente;
- muestra el estado individual de cada elemento;
- permite que el resto del lote continúe cuando una pieza falla.

Un certificado se adjunta durante la carga de una sola pieza. En un lote, los soportes particulares se agregan después desde **Editar ficha** para evitar asociar por error el mismo documento a obras distintas.

## Catálogo y almacenamiento

El binario y la ficha de catálogo son capas coordinadas. En Vercel, la carga directa termina con una confirmación autenticada que verifica el objeto en Blob antes de habilitarlo en Programación.

Si la conexión se interrumpe después de subir el binario, **Archivos por incorporar** enumera objetos de `rayoboss/` que no tienen ficha. **Completar ficha** recupera duración, categoría, metadatos y derechos sin volver a transferir el archivo.

Desde cada ficha se puede:

- reproducir audio o video;
- editar metadatos y derechos;
- adjuntar o reemplazar el soporte de licencia;
- reemplazar el archivo conservando el identificador usado en playlists;
- activar o desactivar;
- eliminar el binario, la ficha y el soporte adjunto.

## Regla SAYCO-ACINPRO

No activar repertorio protegido hasta contar con autorización, licencia o pago aplicable. RayoBoss registra la declaración administrativa, pero no reemplaza la verificación jurídica ni el reporte de repertorio.

## Almacenamiento

- Windows/VPS: disco local mediante `LocalDiskStorageProvider`.
- Vercel: Vercel Blob mediante carga directa.
- Futuro: MinIO o S3 mediante un proveedor adicional sin modificar la biblioteca.

## Informe mensual

El módulo `/informes` agrupa por mes y pieza:

- título, artista, álbum e ISRC;
- categoría y tipo de licencia declarado al momento de sonar;
- existencia del soporte jurídico;
- cantidad de reproducciones;
- tiempo acumulado;
- primera y última reproducción;
- histórico cronológico.

Una ocurrencia de AutoDJ se registra una sola vez aunque varios oyentes la escuchen. Efectos y camas activados durante un vivo se registran desde el estudio. El CSV sirve para análisis y preparación de reportes, pero debe revisarse antes de entregarlo a una sociedad de gestión.

En Vercel demostrativo el catálogo y el histórico usan Runtime Cache. La operación institucional debe migrarlos a PostgreSQL para garantizar retención, auditoría y concurrencia transaccional.

## Recomendaciones operativas

- usar formatos estándar MP3, WAV, AAC, MP4 o WebM;
- normalizar niveles antes de publicar;
- conservar el archivo maestro fuera de la aplicación;
- evitar nombres ambiguos;
- registrar autor, licencia, vigencia y soporte;
- no usar contenido descargado de internet sin autorización verificable.
