# Endpoints públicos

## Reproductor embebible

```text
/embed?autoplay=1
```

Uso recomendado en páginas estáticas:

```html
<iframe
  src="https://DOMINIO/embed?autoplay=1"
  allow="autoplay; fullscreen"
  style="width:100%;aspect-ratio:16/9;border:0"
  title="UNIOC Radio"></iframe>
```

El navegador puede exigir una interacción para audio audible.

## Estado

```text
GET /api/public/on-air
```

Devuelve modo, título, elemento AutoDJ, siguiente pieza, playlist, franja, progreso y endpoints.

## Audio

```text
GET /api/public/audio
```

En AutoDJ redirige al archivo programado. En vivo usa la URL de audio de la VPS si está configurada; en Vercel indica utilizar `/embed` y WebRTC.

## Video

```text
GET /api/public/video
```

En AutoDJ redirige cuando la pieza actual es video. En vivo utiliza el endpoint de VPS configurado o el reproductor WebRTC.

## Integración

El panel **Reproductor público** genera automáticamente la URL y el código iframe del dominio actual.
