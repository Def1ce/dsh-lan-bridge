@echo off
REM dsh-lan-bridge launcher (Windows)
REM Double-click to start/check: dsh and the bridge. LAN only, no certs.
title dsh-lan-bridge launcher

REM Point these at your actual paths.
set NODE=C:\nvm4w\nodejs\node.exe
set DSH=node_modules\.bin\dsh.cmd
set BRIDGE=dsh-lan-bridge

echo ============================================
echo    dsh-lan-bridge one-click launcher
echo ============================================

REM 1. dsh backend (port 3080)
netstat -ano | findstr ":3080" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
  echo [OK]  dsh is running (3080)
) else (
  echo [RUN] starting dsh ...
  start "dsh" /min cmd /c ""%DSH%" --profile web"
  timeout /t 10 /nobreak >nul
)

REM 2. dsh-lan-bridge (http :8088)
netstat -ano | findstr ":8088" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
  echo [OK]  dsh-lan-bridge is running (8088)
) else (
  echo [RUN] starting dsh-lan-bridge ...
  start "dsh-lan-bridge" /min "%NODE%" "%BRIDGE%"
  timeout /t 5 /nobreak >nul
)

echo.
echo ============================================
echo   Phone URL - same Wi-Fi, no cert needed:
echo   http://192.168.1.100:8088
echo ============================================
echo   Replace 192.168.1.100 with this machine's LAN IP (ipconfig).
echo.
pause
