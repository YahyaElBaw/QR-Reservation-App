@echo off
cd /d "%~dp0"
echo Starting Medina QR Restaurant (Backend + Frontend)...

start "Medina Backend (NestJS)" cmd /k "cd /d ""%~dp0backend"" && npm.cmd run start:dev"
timeout /t 3 /nobreak >nul
start "Medina Frontend (Vue 3)" cmd /k "cd /d ""%~dp0frontend"" && npm.cmd run dev"

echo Both services launched in separate windows!
echo Backend:  http://localhost:3000/api/v1 (Docs: http://localhost:3000/docs)
echo Frontend: http://localhost:5173
echo Mobile:   Run START_MOBILE.bat to start the Expo mobile app!
