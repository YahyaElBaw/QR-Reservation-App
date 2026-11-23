@echo off
chcp 65001 >nul
echo === Demarrage du projet avec Docker ===
echo (Docker Desktop doit etre lance)
docker compose up --build -d
echo.
echo Site     : http://localhost:8080/staff/login
echo API docs : http://localhost:3000/docs
echo Comptes  : admin / Admin123!
echo.
pause
