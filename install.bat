@echo off
REM Copyright © 2025
REM All rights reserved.

echo IP Finder - Raycast Extension Installer
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed
    echo Please install Node.js 16 or higher from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Raycast CLI is installed
ray --version >nul 2>&1
if errorlevel 1 (
    echo Installing Raycast CLI...
    npm install -g @raycast/api
)

REM Install dependencies
echo Installing dependencies...
npm install

REM Build the extension
echo Building extension...
npm run build

echo.
echo Installation complete!
echo.
echo To use the extension:
echo 1. Open Raycast
echo 2. Go to Extensions
echo 3. Search for "IP Finder"
echo 4. The extension should now be available
echo.
echo For development:
echo - Run "npm run dev" to start development mode
echo - Run "npm run lint" to check code quality
echo.
echo Thank you for using IP Finder!
pause 