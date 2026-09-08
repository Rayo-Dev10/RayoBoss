# Verificación funcional de StackCP 4.1.0

## Comprobaciones automatizadas

`pnpm run test:stackcp` construye un artefacto público y lo copia a un directorio temporal independiente. Crea credenciales exclusivas de prueba, inicia PHP local y ejecuta 85 operaciones HTTP, además de comprobaciones de archivos, contenido y concurrencia.

Cobertura:

- sintaxis de todos los archivos PHP y JavaScript del artefacto;
- respuesta anónima limitada al ingreso, sin marcado interno del panel, y entrega del panel después de autenticar;
- login scrypt, cookies protegidas, consultas de identidad y cierre de sesión;
- permisos de usuarios, protección de dev, cambio de contraseña y revocación;
- rechazo cross-origin, nombres inválidos e intentos excesivos;
- solicitud y aprobación de invitados con contraseña mostrada una sola vez;
- micrófonos durante un vivo, prueba privada, aprobación al aire y revocación;
- señales de conductor, participante, coanfitrión y oyente, token incorrecto y cierre;
- programación por roles, superposiciones y franjas que cruzan medianoche;
- catálogo, confirmación de derechos y activación;
- carga de MP3 real, rechazo de MIME falso, reproducción HTTP parcial y eliminación;
- carga de soportes jurídicos y descarga restringida a usuarios autorizados;
- inaccesibilidad HTTP de configuración, estado, respaldos y archivos binarios protegidos;
- informes, CSV y deduplicación de la misma ocurrencia AutoDJ;
- recuperación de estado corrupto y reparación desde copia;
- cuatro procesos PHP concurrentes: 40 actualizaciones sin pérdida.

Las pruebas Node/Vercel se conservan mediante `pnpm run verify:full`. Son independientes de la nueva implementación PHP.

## Verificación de navegador local

Se usa el navegador integrado con una instalación PHP aislada. Las comprobaciones realizadas incluyen:

- ingreso como desarrollador y navegación por módulos;
- biblioteca con siete medios de demostración;
- edición y guardado de programación desde la interfaz;
- recarga de un enlace de sección sin reglas de reescritura;
- reproductor público dentro de iframe y activación de sonido;
- inicio de vivo con señal sintética, conexión de otra pestaña como oyente y recepción visible de video;
- activación de cama y efecto, registro en informe mensual y retorno a AutoDJ al terminar.

`tests/fixtures/synthetic-devices.js` sustituye dispositivos únicamente en la instalación de prueba. Genera un tono y un lienzo animado propios; no captura el micrófono, cámara ni pantalla del usuario. No se incluye en producción.

Estas comprobaciones no acreditan redes externas, capacidad de 40 oyentes simultáneos, conectividad TURN, hardware real ni operación radial 24/7. Los topes de conexión son límites preventivos, no una promesa de capacidad del hosting.

## Comprobación posterior al despliegue

El despliegue debe comparar todos los hashes del manifiesto y ejecutar sintaxis PHP en el servidor. Además, comprobar HTTPS, la versión FPM, login con las credenciales provisionadas, lectura del catálogo y programación, protección HTTP de archivos privados y carga de la interfaz.

Los datos locales de operación y de pruebas no se copian a producción. La primera instalación remota crea su estado a partir de medios de demostración y de la cuenta dev configurada; conserva ese estado en despliegues posteriores.
