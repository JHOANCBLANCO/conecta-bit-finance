@echo off
title Instalador Conecta-Bit Finance
cd /d "%~dp0"
cls

set "G=[OK]"
set "R=[ERROR]"
set "I=[INFO]"

echo ============================================================
echo           INSTALADOR CONECTA-BIT FINANCE
echo ============================================================
echo.

REM ── PASO 1: Node.js ──────────────────────────────────────────
echo %I% Paso 1: Verificando Node.js...

REM Agregar rutas por defecto al PATH de esta sesión
set "PATH=C:\Program Files\nodejs\;%APPDATA%\npm;%ProgramFiles%\nodejs\;%PATH%"

node -v > "%temp%\node_v.txt" 2>&1
if errorlevel 1 goto :err_node
set /p node_ver= < "%temp%\node_v.txt"
echo %G% Node.js %node_ver% detectado.
echo.

REM ── PASO 2: Limpieza ─────────────────────────────────────────
echo %I% Paso 2: Limpiando instalaciones previas...
if exist "node_modules" rmdir /s /q "node_modules"
if exist ".next" rmdir /s /q ".next"
REM No borramos dev.db para permitir migraciones/actualizaciones
if exist "dev.db" (
    echo %G% Base de datos encontrada. Se conservaran tus datos.
) else (
    echo %I% No se encontro base de datos. Se creara una nueva.
)
echo %G% Carpeta de trabajo lista.
echo.

REM ── PASO 3: Dependencias ─────────────────────────────────────
echo %I% Paso 3: Instalando librerias (puede tardar unos minutos)...
call npm install --no-audit --no-fund > "%temp%\npm_res.txt" 2>&1
if errorlevel 1 goto :err_npm
echo %G% Librerias instaladas correctamente.
echo.

REM ── PASO 4: Base de Datos ────────────────────────────────────
echo %I% Paso 4: Configurando Base de Datos...
call npx prisma generate > "%temp%\pri_gen.txt" 2>&1
if errorlevel 1 goto :err_pri_gen
call npx prisma db push --accept-data-loss > "%temp%\pri_push.txt" 2>&1
if errorlevel 1 goto :err_pri_push
echo %G% Base de datos configurada.
echo.

REM ── PASO 5: Usuario Soporte ──────────────────────────────────
echo %I% Paso 5: Creando usuario de soporte...

REM Crear el script sin usar bloques de paréntesis para evitar colapsos
echo const { PrismaClient } = require('@prisma/client'); > temp_seed.js
echo const { PrismaLibSql } = require('@prisma/adapter-libsql'); >> temp_seed.js
echo const bcrypt = require('bcryptjs'); >> temp_seed.js
echo const adapter = new PrismaLibSql({ url: 'file:./dev.db' }); >> temp_seed.js
echo const prisma = new PrismaClient({ adapter }); >> temp_seed.js
echo async function seed() { >> temp_seed.js
echo   const email = '1016095229'; >> temp_seed.js
echo   const pass = await bcrypt.hash('1016095229', 10); >> temp_seed.js
echo   await prisma.user.upsert({ >> temp_seed.js
echo     where: { email }, >> temp_seed.js
echo     update: { password: pass, role: 'ADMIN', mustChangePassword: false }, >> temp_seed.js
echo     create: { name: 'SOPORTE CENTRAL', email, password: pass, role: 'ADMIN', mustChangePassword: false } >> temp_seed.js
echo   }); >> temp_seed.js
echo   console.log('OK'); >> temp_seed.js
echo } >> temp_seed.js
echo seed().catch(e =^> { console.error(e); process.exit(1); }).finally(() =^> prisma.$disconnect()); >> temp_seed.js

node temp_seed.js > "%temp%\seed_res.txt" 2>&1
set /p seed_ok= < "%temp%\seed_res.txt"
if not "%seed_ok%"=="OK" goto :err_seed
del /q temp_seed.js
echo %G% Usuario soporte listo (1016095229).
echo.

REM ── PASO 6: Compilación ──────────────────────────────────────
echo %I% Paso 6: Compilando aplicacion (Next.js)...
call npm run build > "%temp%\build_res.txt" 2>&1
if errorlevel 1 goto :err_build
echo %G% Compilacion terminada.
echo.

REM ── FINAL ───────────────────────────────────────────────────
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set "IP=%%a"
    goto :ready
)
:ready
set "IP=%IP: =%"
echo ============================================================
echo   INSTALACION COMPLETADA CON EXITO
echo ============================================================
echo   Local: http://localhost:3000
echo   Red:   http://%IP%:3000
echo.
echo   Presiona una tecla para ARRANCAR la aplicacion...
pause > nul
npm start -- -H 0.0.0.0
exit /b 0

REM ── MANEJO DE ERRORES ──────────────────────────────────────

:err_node
echo %R% Node.js no funciona correctamente.
type "%temp%\node_v.txt"
goto :done

:err_npm
echo %R% Fallo al instalar las librerias.
type "%temp%\npm_res.txt"
goto :done

:err_pri_gen
echo %R% Fallo al generar Prisma.
type "%temp%\pri_gen.txt"
goto :done

:err_pri_push
echo %R% Fallo al configurar las tablas de la BD.
type "%temp%\pri_push.txt"
goto :done

:err_seed
echo %R% Fallo al crear el usuario administrador.
type "%temp%\seed_res.txt"
if exist temp_seed.js del /q temp_seed.js
goto :done

:err_build
echo %R% Error al compilar el proyecto.
type "%temp%\build_res.txt"
goto :done

:done
echo.
echo No se pudo completar la instalacion. Revisa los detalles arriba.
pause
exit /b 1
