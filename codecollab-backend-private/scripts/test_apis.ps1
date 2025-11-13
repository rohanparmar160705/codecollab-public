param(
  [string]$BaseUrl = "http://localhost:4000/api",
  [string]$AuthToken = ""
)

# Scripts: Test APIs using generated Postman collection
# Usage:
#   ./scripts/test_apis.ps1 -BaseUrl "http://localhost:4000/api" -AuthToken "Bearer <token>"

$collectionPath = Join-Path $PSScriptRoot "..\src\docs\postman_collection.json"
if (!(Test-Path $collectionPath)) {
  Write-Error "Postman collection not found at $collectionPath"
  exit 1
}

try {
  $collection = Get-Content -Raw -Path $collectionPath | ConvertFrom-Json
} catch {
  Write-Error "Failed to parse Postman collection JSON: $_"
  exit 1
}

# Build variable map from collection
$varMap = @{}
if ($collection.variable) {
  foreach ($v in $collection.variable) { $varMap[$v.key] = $v.value }
}
$varMap["baseUrl"] = $BaseUrl
if ($AuthToken -ne "") { $varMap["authToken"] = $AuthToken }

function Resolve-Variables {
  param([string]$text)
  if ([string]::IsNullOrEmpty($text)) { return $text }
  return ($text -replace "\{\{(.*?)\}\}", { param($m)
      $k = $m.Groups[1].Value
      if ($varMap.ContainsKey($k)) { return $varMap[$k] } else { return $m.Value }
  })
}

function Flatten-Items {
  param([Object[]]$items)
  $flat = @()
  foreach ($it in $items) {
    if ($it.request) { $flat += ,$it }
    if ($it.item) { $flat += Flatten-Items -items $it.item }
  }
  return $flat
}

$requests = Flatten-Items -items $collection.item
$results = @()
$totalMs = 0
$passed = 0
$failed = 0

foreach ($req in $requests) {
  $name = $req.name
  $method = $req.request.method
  $urlRaw = $req.request.url
  if (-not $urlRaw) { $urlRaw = $req.request.url.raw }
  $url = Resolve-Variables -text ([string]$urlRaw)

  $headers = @{}
  if ($req.request.header) {
    foreach ($h in $req.request.header) { $headers[$h.key] = Resolve-Variables -text $h.value }
  }
  if ($AuthToken -ne "") {
    $headers['Authorization'] = $AuthToken
  } elseif ($headers.ContainsKey('Authorization')) {
    $headers['Authorization'] = Resolve-Variables -text $headers['Authorization']
  }

  $bodyRaw = $null
  if ($req.request.body -and $req.request.body.mode -eq 'raw') {
    $bodyRaw = Resolve-Variables -text ([string]$req.request.body.raw)
  }

  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $params = @{ Method = $method; Uri = $url; Headers = $headers }
    if ($bodyRaw) {
      $params['ContentType'] = 'application/json'
      $params['Body'] = $bodyRaw
    }
    $resp = Invoke-RestMethod @params -TimeoutSec 30
    $stopwatch.Stop()
    $elapsed = [int]$stopwatch.ElapsedMilliseconds
    $totalMs += $elapsed
    $passed++
    Write-Host "[PASS] $method $url ($elapsed ms)" -ForegroundColor Green
    $results += [pscustomobject]@{ Name=$name; Method=$method; Url=$url; Status='PASS'; Ms=$elapsed }
  }
  catch {
    $stopwatch.Stop()
    $elapsed = [int]$stopwatch.ElapsedMilliseconds
    $totalMs += $elapsed
    $failed++
    $errMsg = $_.Exception.Message
    Write-Host "[FAIL] $method $url ($elapsed ms) -> $errMsg" -ForegroundColor Red
    $results += [pscustomobject]@{ Name=$name; Method=$method; Url=$url; Status='FAIL'; Ms=$elapsed; Error=$errMsg }
  }
}

$cnt = $requests.Count
$avg = if ($cnt -gt 0) { [int]($totalMs / $cnt) } else { 0 }

Write-Host ""; Write-Host "===== Summary =====" -ForegroundColor Cyan
Write-Host ("Total: {0}  ✅ Passed: {1}  ❌ Failed: {2}  Avg: {3} ms" -f $cnt,$passed,$failed,$avg)

# Output JSON results for CI if needed
$results | ConvertTo-Json -Depth 5 | Out-File (Join-Path $PSScriptRoot "api_test_results.json") -Encoding utf8

if ($failed -gt 0) { exit 1 } else { exit 0 }
