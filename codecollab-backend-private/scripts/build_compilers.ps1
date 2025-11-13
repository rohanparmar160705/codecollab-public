param()

$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '..' | Resolve-Path | Select-Object -ExpandProperty Path
Set-Location $root

$os = $PSVersionTable.OS
Write-Host "Building CodeCollab compiler images (OS=$os)" -ForegroundColor Cyan

function Build-Image {
  param([string]$Path, [string]$Tag)
  Write-Host "-- Building $Tag from $Path" -ForegroundColor Yellow
  docker build -q -t $Tag $Path | Out-Null
}

Build-Image -Path './docker/compiler-node'   -Tag 'codecollab-node:latest'
Build-Image -Path './docker/compiler-python' -Tag 'codecollab-python:latest'
Build-Image -Path './docker/compiler-cpp'    -Tag 'codecollab-cpp:latest'
Build-Image -Path './docker/compiler-java'   -Tag 'codecollab-java:latest'

Write-Host "`nBuilt images:" -ForegroundColor Green
& docker images | Select-String -Pattern 'codecollab-(node|python|cpp|java)'
