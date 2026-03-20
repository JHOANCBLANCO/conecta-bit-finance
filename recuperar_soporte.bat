@echo off
title Recuperar Usuario Soporte - Conecta-Bit Finance
cd /d "%~dp0"
cls
echo ============================================================
echo   Recuperar Usuario Soporte - Conecta-Bit Finance
echo ============================================================
echo.
echo   Este script restablece el usuario de soporte tecnico
echo   sin borrar ni modificar ningun otro dato.
echo.
REM Verificar que existe la BD
IF NOT EXIST "%~dp0dev.db" (
    echo   ERROR: No se encontro la base de datos dev.db
    echo   Ejecuta primero instalar.bat
    echo.
    pause
    exit /b 1
)
REM Agregar Node al PATH
set "PATH=C:\Program Files\nodejs\;%APPDATA%\npm;%ProgramFiles%\nodejs\;%PATH%"
echo   Restableciendo usuario soporte...
call node "%~dp0create_support.js"
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo   ERROR al restablecer el usuario soporte.
    pause
    exit /b 1
)
echo.
echo ============================================================
echo   Listo! Usuario soporte restablecido.
echo   Usuario:    1016095229
echo   Contraseña: 1016095229
echo ============================================================
echo.
pause
