@echo off
cd /d "%~dp0frontend"
echo Starting Medina Frontend (Vue 3)...
call npm.cmd run dev
pause
