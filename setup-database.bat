@echo off
setlocal
cd /d "%~dp0"

set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%LocalAppData%\Programs\nodejs;%PATH%"

set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"

set "NPX=%ProgramFiles%\nodejs\npx.cmd"
if not exist "%NPX%" set "NPX=%ProgramFiles(x86)%\nodejs\npx.cmd"
if not exist "%NPX%" set "NPX=%LocalAppData%\Programs\nodejs\npx.cmd"

if not exist "%NODE_EXE%" (
  echo Node.js not found. Install from https://nodejs.org/
  pause & exit /b 1
)

if not exist "node_modules\" (
  echo Run run-dev.bat first to install dependencies, or: npm install
  pause & exit /b 1
)

call "%NODE_EXE%" scripts\ensure-auth-secret.cjs
if exist "node_modules\.bin\prisma.cmd" (
  echo Running prisma generate...
  call "node_modules\.bin\prisma.cmd" generate
  echo Running prisma db push...
  call "node_modules\.bin\prisma.cmd" db push
) else (
  echo Running prisma generate...
  call "%NPX%" prisma generate
  echo Running prisma db push...
  call "%NPX%" prisma db push
)
echo Done.
pause
