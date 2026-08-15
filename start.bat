@echo off
REM dsh-lan-bridge - one-click start (double-click this file)
REM Works no matter where this repo is extracted/run from.
cd /d "%~dp0"
node bin\dsh-bridge.cjs
pause
