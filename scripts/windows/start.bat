@echo off
:: Hytale Server Manager - Start Script
:: This script starts the application in the foreground

setlocal EnableDelayedExpansion

:: Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
set "INSTALL_DIR=%SCRIPT_DIR%..\.."

:: Check if running from scripts folder or install folder
if exist "%INSTALL_DIR%\dist\index.js" (
    set "APP_DIR=%INSTALL_DIR%"
) else if exist "%SCRIPT_DIR%dist\index.js" (
    set "APP_DIR=%SCRIPT_DIR%"
) else (
    echo Error: Cannot find application files
    echo Expected to find dist\index.js
    pause
    exit /b 1
)

cd /d "%APP_DIR%"

:: Set environment
set NODE_ENV=production
set HSM_BASE_PATH=%APP_DIR%

echo.
echo ======================================
echo   Hytale Server Manager
echo ======================================
echo.
echo Starting application...
echo Press Ctrl+C to stop
echo.

:: Start the application
node dist\index.js
set EXIT_CODE=%ERRORLEVEL%

:: If exit code is 100, an update is in progress - exit silently
if %EXIT_CODE%==100 (
    echo.
    echo Update in progress... This window will close.
    timeout /t 2 /nobreak > nul
    exit /b 0
)

:: If we get here, the app stopped normally
echo.
echo Application stopped.
pause
