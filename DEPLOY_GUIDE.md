# 🚀 Guía de Despliegue en Hostinger (Actualizada)

Dominio Configurado: **https://argencash.galuweb.com**

## 1. Configuración de Compilación (Build)
Basado en tu pantalla de Hostinger, la configuración correcta es:

- **Comando de compilación**: `npm run build`
  *(Si el despliegue falla por falta de dependencias, intenta cambiarlo a: `npm install && npm run build`)*
- **Directorio de salida**: `.next`
- **Gestor de paquetes**: `npm`

## 2. Variables de Entorno (Environment Variables)
Copia y pega estas claves y valores EXACTAMENTE en el panel de Hostinger.

| Clave (Key) | Valor (Value) | Notas |
| :--- | :--- | :--- |
| `NEXTAUTH_URL` | `https://argencash.galuweb.com` | **Crucial**: Sin barra al final. |
| `NEXTAUTH_SECRET` | `4f8e9a2b5d7c1a2e3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6` | Clave generada aleatoriamente. Úsala tal cual. |
| `DATABASE_URL` | `file:./database.sqlite` | La base de datos se creará en el servidor. |
| `App_KEY` | `base64:xgH/8gW5...` | *(Opcional)* Solo si tu app usaba alguna otra key. |

## 3. Comandos de Inicio (Start)
Si Hostinger te pide un "Comando de Inicio" o "Start Command" separado:
- `npm start`

## 4. Primeros Pasos Post-Deploy
Una vez que el sitio diga "Online":
1.  Es posible que al inicio te de Error 500 si la base de datos no existe.
2.  Si tienes acceso a la **Terminal** en Hostinger (SSH o Web Terminal), ejecuta:
    ```bash
    npx prisma migrate deploy
    npx prisma db seed
    ```
    *Esto creará las tablas y el usuario administrador.*

---
¡Mucha suerte con el lanzamiento! 🚀
