@echo off
setlocal
set "PROJECT_DIR=%~dp0"
if not exist "%PROJECT_DIR%start-notebook.ps1" set "PROJECT_DIR=D:\My Projects\personal-assistant\"
if not exist "%PROJECT_DIR%start-notebook.ps1" (
  echo Notebook project was not found at "%PROJECT_DIR%".
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_DIR%start-notebook.ps1"
if errorlevel 1 (
  echo Notebook could not start. Review the error above.
  pause
  exit /b 1
)
