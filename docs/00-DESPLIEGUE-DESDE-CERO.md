# Despliegue completo desde cero

## Secuencia recomendada

1. Instalar Git para Windows y Node.js 22 LTS.
2. Reiniciar Windows.
3. Descomprimir RayoBoss en una carpeta nueva.
4. Abrir Git Bash en la raíz.
5. Ejecutar la preparación automática:

```bash
npm config set registry https://registry.npmjs.org/
bash scripts/windows-first-run.sh
```

6. Guardar la contraseña de `dev` mostrada por el script.
7. Ejecutar `npm start` y validar `http://localhost:3000`.
8. Crear un repositorio privado y vacío en GitHub.
9. Publicar con:

```bash
bash scripts/publish-github.sh https://github.com/USUARIO/RayoBoss.git
```

10. Importar el repositorio en Vercel usando **Other**.
11. Importar el `.env` generado localmente.
12. Desplegar y validar `/api/health`.
13. Crear un Blob Store público conectado a Production y Preview.
14. Hacer redeploy.
15. Iniciar sesión y comprobar que Biblioteca informa `vercel-blob`, `direct` y escritura habilitada.

## Archivos que nunca deben subirse

```text
.env
node_modules/
data/
.vercel/
logs/
backups/
```

La verificación automática del índice Git impide publicar el repositorio si falta un módulo crítico o si un secreto quedó agregado por error.
