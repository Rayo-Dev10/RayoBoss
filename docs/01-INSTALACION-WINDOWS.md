# Instalación en Windows

## Programas requeridos

- Git para Windows.
- Node.js 22 LTS.
- Navegador actualizado.

Después de instalar Git o Node.js, reinicia Windows.

## Preparación

Descomprime el repositorio, abre la carpeta y selecciona **Open Git Bash here**. Ejecuta:

```bash
npm config set registry https://registry.npmjs.org/
bash scripts/windows-first-run.sh
```

El script genera `.env`, instala dependencias, compila y verifica el proyecto. La contraseña de `dev` aparece una sola vez; guárdala en un medio seguro.

## Inicio

```bash
npm start
```

Abre `http://localhost:3000` e ingresa con `dev`.

## Reinicio posterior

En usos posteriores basta con:

```bash
npm start
```

## Recuperación de la contraseña dev

Edita `RAYOBOSS_DEV_PASSWORD` en `.env` y ejecuta:

```bash
npm run reset-dev-password
npm start
```

El procedimiento conserva los demás usuarios, la biblioteca y la programación.
