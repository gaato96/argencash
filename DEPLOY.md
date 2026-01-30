# Guía de Despliegue para Hostinger (VPS)

Esta guía detalla los pasos para desplegar **Finance Manager Pro** en un servidor VPS de Hostinger (o cualquier servidor Linux/Ubuntu) utilizando GitHub.

## 1. Requisitos Previos

- **Servidor VPS**: Un servidor Ubuntu 20.04 o superior.
- **Dominio**: Un dominio apuntando a la IP de tu VPS.
- **Node.js**: Versión 18.17 o superior (Se recomienda 20.x LTS).
- **Git**: Instalado en el servidor.
- **PM2**: Gestor de procesos para mantener la app viva.
- **Nginx**: Servidor web / Proxy inverso.

## 2. Preparación de Entorno en el Servidor

Accede a tu VPS vía SSH:
```bash
ssh root@tu-ip-vps
```

### Instalar Node.js y npm
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Instalar PM2
```bash
sudo npm install -g pm2
```

## 3. Configuración del Proyecto

### Clonar el Repositorio
```bash
cd /var/www
git clone https://github.com/tu-usuario/finance-manager-pro.git
cd finance-manager-pro
```

### Configurar Variables de Entorno
Crea el archivo `.env` de producción:
```bash
nano .env
```
Pega el contenido (ajustando valores secretos):
```env
DATABASE_URL="file:/var/www/finance-manager-pro/finance.db"
NEXTAUTH_URL="https://tu-dominio.com"
NEXTAUTH_SECRET="generar-un-string-seguro-largo"
```
*Tip: Para SQLite, asegúrate de que el path a la DB sea absoluto o esté claro.*

## 4. Instalación y Construcción

```bash
# Instalar dependencias
npm install --production=false

# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones de base de datos
npx prisma migrate deploy

# Construir la aplicación
npm run build
```

## 5. Ejecución con PM2

```bash
pm2 start npm --name "finance-manager" -- start
pm2 save
pm2 startup
```

## 6. Configurar Nginx (Proxy Inverso)

Instala Nginx si no lo tienes:
```bash
sudo apt install nginx
```

Edita la configuración:
```bash
sudo nano /etc/nginx/sites-available/finance-manager
```
Contenido:
```nginx
server {
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Activa el sitio:
```bash
sudo ln -s /etc/nginx/sites-available/finance-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 7. Certificado SSL (HTTPS)
Usa Certbot para HTTPS gratuito:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

## 8. Actualizaciones Futuras (CD Manual)
Para actualizar tu aplicación cuando hagas cambios en GitHub:
```bash
cd /var/www/finance-manager-pro
git pull
npm install
npx prisma migrate deploy
npm run build
pm2 restart finance-manager
```

## 9. Sincronización de Esquema (Fixing Mismatches)

Si encuentras errores de "columna no existente" (ej: `isActive` en Tenant) tras una actualización, sincroniza el esquema directamente:

```bash
cd ~/domains/argencash.galuweb.com/public_html
npx prisma db push
# Si pide confirmación por posible pérdida de datos, asegúrate de tener backup y acepta si es necesario.
pm2 restart finance-manager
```

## Notas Importantes sobre SQLite
Al usar SQLite (`finance.db`), el archivo de base de datos se guarda en el disco del servidor.
- **Backups**: Configura un cronjob para copiar `finance.db` a una ubicación segura (ej. S3 o Google Drive) periódicamente.
- **Persistencia**: Si reinstalas el servidor, perderás la DB a menos que tengas backup.
