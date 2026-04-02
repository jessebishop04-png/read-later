@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%LocalAppData%\Programs\nodejs;%PATH%"

set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"

if not exist "%NODE_EXE%" (
  echo Install Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)

set "NPM=%ProgramFiles%\nodejs\npm.cmd"
if not exist "%NPM%" set "NPM=%ProgramFiles(x86)%\nodejs\npm.cmd"
if not exist "%NPM%" set "NPM=%LocalAppData%\Programs\nodejs\npm.cmd"

if not exist "node_modules\" (
  echo Installing dependencies...
  if exist "%NPM%" ( call "%NPM%" install ) else (
    echo npm.cmd not found — install Node with "npm" included, then run again.
    pause & exit /b 1
  )
)

if not exist ".env" if exist ".env.example" copy /Y ".env.example" ".env" >nul

call "%NODE_EXE%" scripts\ensure-auth-secret.cjs
if errorlevel 1 pause & exit /b 1

echo.
echo Starting dev server (SQLite off OneDrive when needed)...
echo http://localhost:3000
echo.
call "%NODE_EXE%" scripts\dev-no-npm.cjs
pause
