param(
  [string]$BaseUrl = "http://localhost:4000/api",
  [string]$AuthToken = "",
  [string]$EndpointsFile = "",
  [string]$LogFile = "",
  [string]$OutJson = "api_results.json"
)

# api_sweep.ps1
# Test all APIs from localhost:4000 and log results
# Works on Windows + Linux (PowerShell 5/7). No project path assumptions.

$ErrorActionPreference = 'Stop'
$here = (Get-Location).Path

function Resolve-Variables {
  param([string]$text, [hashtable]$vars)
  if ([string]::IsNullOrEmpty($text)) { return $text }
  return ($text -replace "\{\{(.*?)\}\}", { param($m)
      $k = $m.Groups[1].Value
      if ($vars.ContainsKey($k)) { return $vars[$k] } else { return $m.Value }
  })
}

function Parse-EndpointsFromFile {
  param([string]$path)
  if (-not (Test-Path $path)) { throw "Endpoints file not found: $path" }
  $ext = [System.IO.Path]::GetExtension($path).ToLower()
  if ($ext -eq '.json') {
    $data = Get-Content -Raw -Path $path | ConvertFrom-Json
    if ($data -is [System.Array]) { return $data }
    elseif ($data.endpoints) { return $data.endpoints }
    else { throw "Unsupported JSON structure in $path" }
  }
  elseif ($ext -eq '.txt') {
    $items = @()
    foreach ($line in Get-Content -Path $path) {
      $trim = $line.Trim()
      if (-not $trim -or $trim.StartsWith('#')) { continue }
      $parts = $trim -split "\s+", 2
      if ($parts.Count -lt 2) { continue }
      $items += [pscustomobject]@{ method=$parts[0]; path=$parts[1]; body=$null; headers=@{} }
    }
    return $items
  }
  else {
    throw "Unsupported file extension '$ext' for $path. Use .json or .txt"
  }
}

function Extract-PriorityFromLog {
  param([string]$logPath)
  if (-not (Test-Path $logPath)) { return @{} }
  $priority = @{}
  $regex = '^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(/[^\s]+)'
  foreach ($line in Get-Content -Path $logPath) {
    $m = [regex]::Match($line, $regex)
    if ($m.Success) {
      $key = "$($m.Groups[1].Value) $($m.Groups[2].Value)"
      if (-not $priority.ContainsKey($key)) { $priority[$key] = 0 }
      $priority[$key]++
    }
  }
  return $priority
}

# Seed endpoints: if no file provided, include common ones
$defaultEndpoints = @(
  @{ method='GET'; path='/health' },
  @{ method='POST'; path='/auth/register'; body=@{ name='Alice'; email='alice@example.com'; password='StrongP@ssw0rd' } },
  @{ method='POST'; path='/auth/login'; body=@{ email='alice@example.com'; password='StrongP@ssw0rd' } },
  @{ method='POST'; path='/auth/refresh-token'; body=@{ refreshToken='<paste-refresh-token>' } },
  @{ method='GET'; path='/analytics/overview' }
)

$endpoints = @()
if ($EndpointsFile) {
  try { $endpoints = Parse-EndpointsFromFile -path $EndpointsFile } catch { Write-Warning $_; $endpoints = @() }
}
if (-not $endpoints -or $endpoints.Count -eq 0) { $endpoints = $defaultEndpoints }

# Normalize endpoint objects (compatible with PS5 - no '??')
$normalized = @()
foreach ($e in $endpoints) {
  $m = if ($null -ne $e.method -and $e.method -ne '') { [string]$e.method } else { 'GET' }
  $p = if ($null -ne $e.path) { [string]$e.path } else { '' }
  $h = if ($null -ne $e.headers) { $e.headers } else { @{} }
  $normalized += [pscustomobject]@{ method = $m.ToUpper(); path = $p; body = $e.body; headers = $h; url = $e.url }
}
$endpoints = $normalized

# Prioritize based on log occurrences (failed/seen first)
$priorityMap = @{}
if ($LogFile) { $priorityMap = Extract-PriorityFromLog -logPath $LogFile }
$endpoints = $endpoints | Sort-Object -Descending -Property @{ Expression = {
    $k = "$($_.method) $($_.path)"; if ($priorityMap.ContainsKey($k)) { $priorityMap[$k] } else { 0 }
  } }

# Variable map for templating
$vars = @{ baseUrl = $BaseUrl }
if ($AuthToken) { $vars['authToken'] = $AuthToken }

$results = @()
$counts = @{ total=0; ok=0; client=0; server=0 }
$totalMs = 0

function Write-Color($text, $color) {
  try { Write-Host $text -ForegroundColor $color } catch { Write-Host $text }
}

foreach ($ep in $endpoints) {
  $counts.total++
  $method = $ep.method
  # Support either absolute URL or a path joined to BaseUrl
  $url = if ($ep.url) { [string]$ep.url } else { (Resolve-Variables -text ("{0}{1}" -f $BaseUrl.TrimEnd('/'), $ep.path) -vars $vars) }
  $headers = @{}
  foreach ($k in $ep.headers.Keys) { $headers[$k] = Resolve-Variables -text $ep.headers[$k] -vars $vars }
  if ($AuthToken) { $headers['Authorization'] = $AuthToken } elseif ($headers.ContainsKey('Authorization')) { $headers['Authorization'] = Resolve-Variables -text $headers['Authorization'] -vars $vars }

  $bodyJson = $null
  if ($ep.body) { $bodyJson = ($ep.body | ConvertTo-Json -Depth 10) }

  $attempt = 0
  $maxRetries = 3
  $statusCode = 0
  $respBody = $null
  $errorMsg = $null
  $ms = 0

  while ($attempt -lt $maxRetries) {
    $attempt++
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
      $params = @{ Method=$method; Uri=$url; TimeoutSec=30; ErrorAction='Stop' }
      if ($headers.Count -gt 0) { $params['Headers'] = $headers }
      if ($bodyJson) { $params['ContentType'] = 'application/json'; $params['Body'] = $bodyJson }
      if ($PSVersionTable.PSVersion.Major -lt 6) { $params['UseBasicParsing'] = $true }

      $resp = Invoke-WebRequest @params
      $sw.Stop()
      $ms = [int]$sw.ElapsedMilliseconds
      $statusCode = [int]$resp.StatusCode
      $respBody = try { ($resp.Content | ConvertFrom-Json) } catch { $resp.Content }
      $totalMs += $ms

      break
    } catch {
      $sw.Stop()
      $ms = [int]$sw.ElapsedMilliseconds
      $totalMs += $ms
      $statusCode = try { [int]$_.Exception.Response.StatusCode.Value__ } catch { 0 }
      $errorMsg = $_.Exception.Message
      if ($attempt -lt $maxRetries) {
        Write-Color ("⚠️ Retry {0}/{1} {2} {3} -> {4}" -f $attempt,$maxRetries,$method,$url,$errorMsg) 'Yellow'
        Start-Sleep -Milliseconds 800
      }
    }
  }

  if ($statusCode -ge 200 -and $statusCode -lt 300) { $counts.ok++ }
  elseif ($statusCode -ge 400 -and $statusCode -lt 500) { $counts.client++ }
  elseif ($statusCode -ge 500) { $counts.server++ }

  $snippet = ''
  try {
    $snippet = ($respBody | ConvertTo-Json -Depth 4)
  } catch { $snippet = ($respBody | Out-String) }

  $results += [pscustomobject]@{
    Url = $url
    Method = $method
    Status = $statusCode
    TimeMs = $ms
    Result = $snippet
    Error = $errorMsg
  }

  $tag = if ($statusCode -ge 200 -and $statusCode -lt 300) { 'PASS' } elseif ($statusCode -ge 400 -and $statusCode -lt 500) { 'WARN' } elseif ($statusCode -ge 500) { 'FAIL' } else { 'UNK' }
  $color = switch ($tag) { 'PASS' { 'Green' } 'WARN' { 'Yellow' } 'FAIL' { 'Red' } default { 'Gray' } }
  Write-Color ("[{0}] {1} {2} ({3} ms)" -f $tag,$method,$url,$ms) $color
}

# Write outputs
$avg = if ($counts.total -gt 0) { [int]($totalMs / $counts.total) } else { 0 }
$results | ConvertTo-Json -Depth 8 | Out-File -FilePath (Join-Path $here $OutJson) -Encoding utf8

Write-Color "`n========= API SWEEP SUMMARY =========" 'Cyan'
Write-Color ("✅ Passed: {0}" -f $counts.ok) 'Green'
Write-Color ("⚠️ Warnings (4xx): {0}" -f $counts.client) 'Yellow'
Write-Color ("❌ Failed (5xx): {0}" -f $counts.server) 'Red'
Write-Host ("Avg: {0} ms  Total: {1}" -f $avg,$counts.total)
Write-Host ("📄 Results saved in {0}" -f (Join-Path $here $OutJson))
