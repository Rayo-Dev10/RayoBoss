# Instalación limpia en Windows

## 1. Requisitos

- Windows 10 u 11 de 64 bits.
- Git para Windows.
- Node.js 22.x de 64 bits.
- Cuenta local con permisos para escribir en la carpeta del proyecto.
- Navegador actualizado con acceso a micrófono y cámara.

El reinicio de Windows solo es necesario si Git o Node no aparecen en el `PATH` después de instalarlos.

## 2. Obtener el repositorio

### Desde GitHub

```bash
git clone URL_DEL_REPOSITORIO RayoBoss
cd RayoBoss
```

### Desde ZIP

1. Descomprimir el ZIP en una ruta corta, por ejemplo:
   `C:\Users\Rayo\Documents\GitHub\RayoBoss`.
2. Abrir la carpeta.
3. Clic derecho en un espacio vacío.
4. Elegir **Open Git Bash here**.

## 3. Confirmar herramientas

```bash
git --version
node --version
npm --version
npm config get registry
```

La versión de Node debe iniciar con `v22.` y el registro debe ser `https://registry.npmjs.org/`.

Si el registro es distinto:

```bash
npm config set registry https://registry.npmjs.org/
```

## 4. Preparación automática

```bash
bash scripts/windows-first-run.sh
```

El script:

1. verifica Git, Node y npm;
2. crea `.env` si no existe;
3. genera `RAYOBOSS_DEV_PASSWORD` y `RAYOBOSS_SECRET`;
4. muestra una sola vez la contraseña inicial de `dev`;
5. ejecuta `npm ci`;
6. compila el cliente Blob;
7. ejecuta pruebas y diagnóstico.

Guardar la contraseña fuera del repositorio. No fotografiarla ni publicarla.

## 5. Iniciar RayoBoss

```bash
npm start
```

Abrir:

```text
http://localhost:3000
```

Credenciales:

```text
Usuario: dev
Contraseña: la generada durante la preparación
```

Para detener el servidor, regresar a Git Bash y pulsar `Ctrl+C`.

## 6. Primer control funcional

1. Ingresar como `dev`.
2. Abrir **Diagnóstico** y confirmar que no existan fallas.
3. Abrir **Biblioteca** y comprobar los recursos de demostración.
4. Abrir **Programación** y revisar las cuatro pestañas.
5. Abrir **Reproductor público** y probar AutoDJ.
6. Iniciar un vivo breve y conceder permisos de micrófono/cámara.

## 7. Datos locales

RayoBoss crea automáticamente:

- `data/`: usuarios, solicitudes, programación y archivos locales;
- `logs/`: registros cuando se usan scripts de servicio;
- `backups/`: copias generadas por el script de respaldo.

Estas carpetas están ignoradas por Git.

## 8. No usar `rm -rf data` para el login

La versión 4 sincroniza el usuario `dev` con la contraseña vigente de `.env`. Las pruebas no escriben en `data/`. Borrar `data/` eliminaría usuarios, solicitudes, catálogo y programación local, por lo que solo debe hacerse para un reinicio total deliberado y después de un respaldo.

## 9. Respaldo local

```bash
bash scripts/backup.sh
```

Guardar además una copia segura de `.env`, porque contiene la clave de sesiones y la contraseña inicial.

## 10. Limpieza antes de publicar

Vista previa:

```bash
bash scripts/clean-workspace.sh
```

Aplicar:

```bash
bash scripts/clean-workspace.sh --apply
```

El script elimina dependencias, datos locales, logs, respaldos, `.vercel` y archivos temporales, pero conserva `.git` y `.env` por seguridad. `.env` nunca se publica porque está en `.gitignore`.
