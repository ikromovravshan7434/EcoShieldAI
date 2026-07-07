@echo off
title EcoShield AI
cd /d "%~dp0"

echo EcoShield AI ishga tushirilmoqda...

where python >nul 2>nul
if errorlevel 1 (
  echo Python topilmadi. Python 3 o'rnating.
  pause
  exit /b 1
)

python -m pip install -r requirements.txt
if errorlevel 1 (
  echo Kutubxonalarni o'rnatishda xato yuz berdi.
  pause
  exit /b 1
)

start "" http://127.0.0.1:5000
python app.py
pause
