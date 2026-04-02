# Run from read-later folder. If execution policy blocks scripts:
#   powershell -ExecutionPolicy Bypass -File .\run-dev.ps1
#
# Uses scripts/dev-no-npm.cjs so npm does not need to be on PATH.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$nodeExe = $null
foreach ($base in @(
    "${env:ProgramFiles}\nodejs",
    "${env:ProgramFiles(x86)}\nodejs",
    "${env:LocalAppData}\Programs\nodejs"
  )) {
  $c = Join-Path $base "node.exe"
  if (Test-Path -LiteralPath $c) {
    $nodeExe = $c
    break
  }
}

if (-not $nodeExe) {
  Write-Host ""
  Write-Host "Node.js was not found. Install LTS from https://nodejs.org/"
  Write-Host "Or double-click START-SERVER.bat in this folder."
  Write-Host ""
  exit 1
}

& $nodeExe "scripts\dev-no-npm.cjs"
