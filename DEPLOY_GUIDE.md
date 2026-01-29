# 🚀 Guía de Despliegue en Hostinger (VPS / App Platform)

Esta guía te ayudará a configurar tu aplicación **Finance Manager Pro** en Hostinger utilizando la integración con Git (GitHub/GitLab).

## 1. Requisitos Previos
- **Cuenta en GitHub**: Este repositorio debe estar subido a tu GitHub.
- **Plan en Hostinger**: VPS (con Node.js/Docker) o "Aplicación Node.js" (Shared/Cloud).

## 2. Configuración de Variables de Entorno (Environment Variables)
En el panel de Hostinger, busca la sección de **Environment Variables** (Variables de Entorno) y agrega las siguientes. **NO subas tu archivo `.env` al repositorio.**

| Clave (Key) | Valor (Value) | Descripción |
| :--- | :--- | :--- |
| `NEXTAUTH_URL` | `https://tu-dominio.com` | La URL final de tu sitio (con https). |
| `NEXTAUTH_SECRET` | `(Generar uno seguro)` | Cadena aleatoria larga. Puedes usar un generador online o `openssl rand -base64 32`. |
| `DATABASE_URL` | `file:./database.sqlite` | Para SQLite. Si usas VPS, esta ruta está bien. |
| `App_KEY` | `(Tu clave de app)` | Si tu app usa alguna clave específica extra. |

> **Nota sobre Base de Datos**: Esta app usa **SQLite**.
> - Al desplegar, se creará un archivo `database.sqlite` en el servidor.
> - **Importante**: Asegúrate de que el directorio donde se guarda la DB sea persistente. En algunos despliegues de contenedores, los archivos se borran al redeployar.
> - Si usas **Hostinger VPS**, no hay problema.
> - Si usas **Hostinger Shared/Cloud Node.js App**, asegúrate de que `database.sqlite` no se sobrescriba.

## 3. Comandos de Build y Start
Hostinger te pedirá los comandos para construir y arrancar la app.

- **Build Command**:
  ```bash
  npm install && npm run build
  ```
  *(Esto instala las dependencias, genera el cliente de Prisma y compila Next.js)*

- **Start Command**:
  ```bash
  npm start
  ```

## 4. Primer Despliegue (Seed)
La primera vez que despliegues, la base de datos estará vacía. Necesitarás "sembrarla" (crear el usuario SuperAdmin por defecto).

Si tienes acceso a la **Consola/Terminal** en Hostinger:
1.  Navega a la carpeta de tu app.
2.  Ejecuta:
    ```bash
    npx prisma migrate deploy
    ```
    *(Esto crea las tablas en la DB)*
3.  Si tienes un script de seed (`prisma/seed.ts`), ejecútalo:
    ```bash
    npx prisma db seed
    ```
    *O crea el primer usuario manualmente si tienes un script para ello.*

---
**¡Listo!** Tu aplicación debería estar corriendo.
