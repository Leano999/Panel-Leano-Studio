@echo off
setlocal
cd /d "%~dp0"

title Panel Kontrol Leano - Auto Start

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] Node.js belum terinstall.
  echo Install Node.js LTS terlebih dahulu, lalu klik START PANEL.bat lagi.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] npm tidak ditemukan.
  echo Pastikan Node.js terinstall dengan npm.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\express\package.json" (
  echo.
  echo [1/2] Dependency belum ada. Sedang install otomatis...
  echo.
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install gagal.
    echo Coba jalankan file ini lagi setelah memastikan internet aktif.
    echo.
    pause
    exit /b 1
  )
) else if not exist "node_modules\node-edge-tts\package.json" (
  echo.
  echo [1/2] Modul TTS Natural belum ada. Memasang node-edge-tts...
  echo.
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo.
    echo [ERROR] Instalasi modul TTS Natural gagal.
    echo Pastikan internet aktif lalu jalankan lagi.
    echo.
    pause
    exit /b 1
  )
) else (
  echo [1/2] Dependency sudah terpasang. Lewati npm install.
)

echo.
echo [2/2] Menjalankan Panel Leano Studio...
echo.
echo Panel: http://localhost:4200/control.html

echo Membuka Control Panel dalam 2 detik...
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start "" "http://localhost:4200/control.html""

npm start

if errorlevel 1 (
  echo.
  echo Server berhenti karena terjadi error.
  echo.
  pause
)
endlocal
