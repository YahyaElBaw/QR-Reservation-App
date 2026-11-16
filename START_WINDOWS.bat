@echo off
cd /d "%~dp0"
echo Medina - Frontend Vue
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Installez Node.js 24 LTS depuis https://nodejs.org/ puis relancez ce fichier.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installation des dependances. Patientez...
  call npm.cmd ci
  if errorlevel 1 (
    echo L'installation a echoue. Copiez le message affiche pour obtenir de l'aide.
    pause
    exit /b 1
  )
)
echo Ouvrez l'adresse Local affichee ci-dessous. Pour arreter : Ctrl+C.
call npm.cmd run dev
pause
