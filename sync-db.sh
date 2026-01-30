#!/bin/bash
# Script de sincronización de base de datos para Hostinger
# Ejecutar este script en tu terminal SSH

echo "=== Sincronización de Base de Datos ArgenCash ==="
echo ""

# Configurar PATH para usar Node.js 20
export PATH=/opt/alt/alt-nodejs20/root/bin:$PATH

# Verificar que Node.js esté disponible
echo "Verificando Node.js..."
node -v
npm -v

# Ir a la carpeta del proyecto
cd ~/domains/argencash.galuweb.com/public_html

echo ""
echo "Ejecutando Prisma DB Push..."
echo "Esto sincronizará el esquema de la base de datos."
echo ""

# Ejecutar la sincronización
npx prisma db push --accept-data-loss

echo ""
echo "=== Sincronización completada ==="
echo ""
echo "Ahora necesitas reiniciar la aplicación."
echo "Si usas PM2, ejecuta: pm2 restart finance-manager"
echo "Si no, contacta con soporte de Hostinger para reiniciar la app."
