# Programación visual del AutoDJ

## 1. Roles

- Desarrollador y administrador: crean y modifican programación.
- Locutor: consulta playlists, franjas, continuidad y “Ahora programado”, sin guardar cambios.

## 2. Playlists

1. Abrir **Programación → Playlists**.
2. Pulsar **Nueva playlist**.
3. Escribir un nombre comprensible.
4. Buscar contenidos activos de la biblioteca.
5. Pulsar **Agregar**.
6. Ordenar con las flechas subir y bajar.
7. Activar **Orden aleatorio** cuando corresponda.
8. Mantener **Repetición continua** para continuidad permanente.

Eliminar una pieza de una playlist no elimina el archivo de la biblioteca.

## 3. Franjas

1. Abrir **Franjas horarias**.
2. Pulsar **Nueva franja**.
3. Definir nombre, días, inicio, cierre y playlist.
4. Activar la franja cuando esté lista.
5. Guardar.

Las franjas activas no pueden superponerse. Una franja nueva nace desactivada para no interrumpir la programación general.

Los horarios usan intervalos continuos. Una franja `08:00–09:00` puede ser seguida por otra `09:00–10:00`.

## 4. Continuidad

- Playlist de respaldo: suena cuando no existe una franja coincidente.
- Transición: segundos de crossfade informados al reproductor.
- Identificador cada N pistas: inserta la identificación institucional.
- Cuña cada N minutos: inserta promociones o mensajes.
- Orden secuencial: respeta el orden seleccionado.
- Orden aleatorio: rota cuñas de forma determinística.

Los recursos aparecen según su categoría y subtipo en la biblioteca.

## 5. Resumen al aire

La pestaña **Resumen al aire** muestra:

- modo AutoDJ o EN VIVO;
- título actual;
- tipo, categoría y duración;
- progreso y tiempo restante;
- siguiente pieza;
- playlist y franja activas;
- resumen de continuidad;
- agenda semanal legible.

## 6. Guardar y descartar

Los cambios permanecen en el navegador hasta pulsar **Guardar programación**. El servidor valida estructura, identificadores, horas y superposiciones.

**Descartar cambios** recupera la última versión guardada.

## 7. Respaldo

- **Exportar respaldo** descarga un JSON técnico. No necesita editarse manualmente.
- **Importar respaldo** carga una copia en el editor visual; debe revisarse y guardarse.
- **Restablecer demostración** reemplaza playlists, franjas y continuidad por la configuración inicial.
