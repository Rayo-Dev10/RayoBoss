# Operación en vivo

## Inicio

1. Ingresar como locutor, administrador o desarrollador.
2. Abrir **En vivo**.
3. Escribir el título.
4. Pulsar **Iniciar vivo**.
5. Autorizar micrófono.
6. Activar o reconectar el estudio si es necesario.

Mientras existe un vivo, el conductor principal ve **Terminar vivo y regresar a AutoDJ**. Otro desarrollador, administrador o locutor autenticado ve **Sumarme al vivo**.

## Coanfitriones autorizados

1. El primer usuario autorizado inicia el vivo y conserva el estudio mezclador principal.
2. Otro desarrollador, administrador o locutor abre **En vivo** y pulsa **Sumarme al vivo**.
3. El navegador solicita su micrófono y crea una conexión WebRTC de coanfitrión dentro del mismo `broadcastId`.
4. El estudio principal recibe y mezcla esa señal con el conductor, invitados, efectos y cama.
5. El coanfitrión puede desconectarse sin terminar la emisión.

Sumarse no cambia el título, la hora de inicio ni el conductor principal. El botón de cierre solo se muestra al conductor; desarrolladores y administradores conservan las facultades de emergencia disponibles en la API.

## Video

- **Usar cámara**: captura cámara local.
- **Compartir pantalla o ventana**: selecciona una fuente mediante el navegador.
- **Retirar video**: mantiene solo audio.

## Invitados y periodistas

1. El participante solicita micrófono durante el vivo.
2. El administrador puede aprobar una prueba privada.
3. El participante reporta si el micrófono está correcto.
4. El administrador aprueba al aire.
5. También puede aprobar directamente al aire sin prueba previa.

Usar audífonos para evitar realimentación.

## Cama y ducking

1. Elegir una cama activa.
2. Definir volumen sin voz.
3. Pulsar **Activar cama**.
4. El analizador reduce la cama cuando detecta voz.
5. Al cesar la voz, el volumen se recupera gradualmente.

## Efectos

Los botones del soundboard reproducen recursos de la categoría `live.efectos` en la mezcla del estudio.

## Cierre

Pulsar **Terminar vivo y regresar a AutoDJ**. Confirmar que el reproductor público vuelve a la playlist correspondiente.
