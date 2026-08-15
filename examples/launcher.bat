@echo off
REM dsh-lan-bridge launcher (Windows)
REM Starts/checks the bridge. dsh itself must already be running on port 3080
REM (the bridge is a proxy, it does not start dsh).
title dsh-lan-bridge launcher

echo ============================================
echo    dsh-lan-bridge launcher
echo ============================================

REM 1. dsh backend must be up on 3080
netstat -ano | findstr ":3080" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
  echo [OK]  dsh is running on port 3080
) else (
  echo [WARN] dsh is NOT running on port 3080.
  echo        Start dsh first, then run this launcher again.
)

REM 2. bridge (http :8088)
netstat -ano | findstr ":8088" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
  echo [OK]  bridge is running on port 8088
) else (
  echo [RUN] starting bridge ...
  start "dsh-lan-bridge" /min node "%~dp0..\bin\dsh-bridge.js"
  timeout /t 4 /nobreak >nul
  netstat -ano | findstr ":8088" | findstr "LISTENING" >nul 2>&1
  if %errorlevel%==0 (echo [OK]  bridge started) else (echo [FAIL] bridge did not start - is node on PATH?)
)

echo.
echo ============================================
echo   Phone URL - same Wi-Fi, no cert needed:
echo   http://<your-lan-ip>:8088
echo ============================================
echo   Replace <your-lan-ip> with this machine's LAN IP (ipconfig).
echo.
pause
