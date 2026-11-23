@echo off
cd /d "%~dp0backend"
echo Starting Medina Backend (NestJS)...
call npm.cmd run start:dev
pause
