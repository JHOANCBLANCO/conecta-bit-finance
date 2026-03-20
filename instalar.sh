#!/bin/bash

# Colores para la terminal
G='\033[0;32m'
R='\033[0;31m'
I='\033[0;34m'
NC='\033[0m' # No Color

clear
echo "============================================================"
echo "          INSTALADOR CONECTA-BIT FINANCE (LINUX)"
echo "============================================================"
echo

# --- PASO 1: Node.js ---
echo -e "${I} Paso 1: Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${R} [ERROR] Node.js no está instalado.${NC}"
    echo " Por favor, instálalo desde https://nodejs.org"
    exit 1
fi
NODE_VER=$(node -v)
echo -e "${G} [OK] Node.js $NODE_VER detectado.${NC}"
echo

# --- PASO 2: Limpieza ---
echo -e "${I} Paso 2: Limpiando instalaciones previas...${NC}"
rm -rf node_modules .next
if [ -f "dev.db" ]; then
    echo -e "${G} [OK] Base de datos encontrada. Se conservarán tus datos.${NC}"
else
    echo -e "${I} [INFO] No se encontró base de datos. Se creará una nueva.${NC}"
fi
echo -e "${G} [OK] Carpeta de trabajo lista.${NC}"
echo

# --- PASO 3: Dependencias ---
echo -e "${I} Paso 3: Instalando librerías (puede tardar)...${NC}"
if ! npm install --no-audit --no-fund &> /tmp/npm_err.txt; then
    echo -e "${R} [ERROR] Falló la instalación de dependencias.${NC}"
    cat /tmp/npm_err.txt
    exit 1
fi
echo -e "${G} [OK] Librerías instaladas perfectamente.${NC}"
echo

# --- PASO 4: Base de Datos ---
echo -e "${I} Paso 4: Configurando Base de Datos...${NC}"
if ! npx prisma generate &> /tmp/pri_gen.txt; then
    echo -e "${R} [ERROR] Falló prisma generate.${NC}"
    cat /tmp/pri_gen.txt
    exit 1
fi
if ! npx prisma db push --accept-data-loss &> /tmp/pri_push.txt; then
    echo -e "${R} [ERROR] Falló prisma db push.${NC}"
    cat /tmp/pri_push.txt
    exit 1
fi
echo -e "${G} [OK] Estructura de base de datos lista.${NC}"
echo

# --- PASO 5: Usuario Soporte ---
echo -e "${I} Paso 5: Creando usuario de soporte...${NC}"
cat <<'EOF' > temp_seed.js
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const bcrypt = require('bcryptjs');
const adapter = new PrismaLibSql({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });
async function seed() {
  const email = '1016095229';
  const pass = await bcrypt.hash('1016095229', 10);
  await prisma.user.upsert({
    where: { email },
    update: { password: pass, role: 'ADMIN', mustChangePassword: false },
    create: { name: 'SOPORTE CENTRAL', email, password: pass, role: 'ADMIN', mustChangePassword: false }
  });
  console.log('OK');
}
seed().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
EOF

SEED_RES=$(node temp_seed.js 2>&1)
if [ "$SEED_RES" != "OK" ]; then
    echo -e "${R} [ERROR] Falló la creación del usuario soporte.${NC}"
    echo "$SEED_RES"
    rm temp_seed.js
    exit 1
fi
rm temp_seed.js
echo -e "${G} [OK] Usuario soporte listo (1016095229).${NC}"
echo

# --- PASO 6: Compilación ---
echo -e "${I} Paso 6: Compilando aplicación (Next.js)...${NC}"
if ! npm run build &> /tmp/build_err.txt; then
    echo -e "${R} [ERROR] Falló la compilación.${NC}"
    cat /tmp/build_err.txt
    exit 1
fi
echo -e "${G} [OK] Compilación terminada con éxito.${NC}"
echo

# --- FINAL ---
IP=$(hostname -I | awk '{print $1}')
echo "============================================================"
echo "   INSTALACIÓN COMPLETADA CON ÉXITO"
echo "============================================================"
echo "   Local: http://localhost:3000"
echo "   Red:   http://$IP:3000"
echo
echo " Presiona una tecla para ARRANCAR la aplicación..."
read -n 1 -s
npm start -- -H 0.0.0.0
