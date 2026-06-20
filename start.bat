@echo off
title AttendEase - Attendance System
color 0A

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║       AttendEase - Starting Up...        ║
echo  ╚══════════════════════════════════════════╝
echo.

echo  [1/2] Starting Backend API (Port 5000)...
start "AttendEase Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

timeout /t 3 /nobreak > nul

echo  [2/2] Starting Frontend (Port 5173)...
start "AttendEase Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 4 /nobreak > nul

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║         Both Servers Running!            ║
echo  ║                                          ║
echo  ║  Frontend : http://localhost:5173        ║
echo  ║  Backend  : http://localhost:5000        ║
echo  ║  Health   : http://localhost:5000/api/health
echo  ║                                          ║
echo  ║  Admin    : admin@company.com            ║
echo  ║  Password : Admin@123                    ║
echo  ╚══════════════════════════════════════════╝
echo.

start "" "http://localhost:5173"

pause
