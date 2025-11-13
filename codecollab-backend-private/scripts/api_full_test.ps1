param(
  [string]$BaseUrl = "http://localhost:4000/api",
  [string]$Email = "parmarohan360@gmail.com",
  [string]$Password = "rohan@123",
  [string]$NewPassword = "rohan@123",
  [switch]$ClearDatabase,
  [switch]$Force
)

# api_full_test.ps1
# End-to-end API test suite for CodeCollab (PowerShell 5/7 compatible)
# - Registers a user, logs in, stores JWT, runs protected routes, tests billing, rooms, files, execution
# - Handles password reset with user input
# - Verifies Docker compiler images exist
# - Retries failures with exponential backoff (2s -> 4s -> 8s)

$ErrorActionPreference = 'Stop'
$Here = (Get-Location).Path
$LogPath = Join-Path $Here 'api_full_log.txt'
$JsonPath = Join-Path $Here 'api_full_results.json'

# Reset logs
'' | Out-File -FilePath $LogPath -Encoding UTF8
$Results = @()
$Passed = 0
$Retried = 0
$Failed = 0

function Write-Color {
  param([string]$Text, [string]$Color = 'White')
  try { Write-Host $Text -ForegroundColor $Color } catch { Write-Host $Text }
  Add-Content -Path $LogPath -Value $Text
}

function Find-RepoRoot {
  $start = (Get-Location).Path
  $dir = Get-Item $start
  for ($i=0; $i -lt 6 -and $dir; $i++) {
    $schema = Join-Path $dir.FullName 'prisma\schema.prisma'
    $pkg = Join-Path $dir.FullName 'package.json'
    if (Test-Path $schema -or Test-Path $pkg) { return $dir.FullName }
    $dir = $dir.Parent
  }
  return $start
}

function Reset-Database {
  param([string]$Root)
  Write-Color ("[DB] Resetting database using Prisma in: {0}" -f $Root) 'Yellow'
  $envPath = Join-Path $Root '.env'
  if (Test-Path $envPath) {
    $dbLine = (Select-String -Path $envPath -Pattern '^DATABASE_URL=.*' -ErrorAction SilentlyContinue)
    if ($dbLine) { Write-Color ("[DB] Using {0}" -f $dbLine.Line) 'Yellow' }
  }
  try {
    Push-Location $Root
    # Prefer migrate reset; fallback to db push --force-reset
    try {
      & npx prisma migrate reset -f --skip-generate --skip-seed 2>&1 | Tee-Object -FilePath $LogPath -Append | Out-Null
    } catch {
      & npx prisma db push --force-reset --skip-generate 2>&1 | Tee-Object -FilePath $LogPath -Append | Out-Null
    }
  } finally {
    Pop-Location | Out-Null
  }
  Write-Color "[DB] Reset complete." 'Green'
}

function AsJsonSnippet {
  param($obj)
  try { return ($obj | ConvertTo-Json -Depth 6) } catch { return ($obj | Out-String) }
}

function Add-Result {
  param([string]$Name,[string]$Method,[string]$Url,[int]$Status,[int]$Ms,$Body,[string]$Error)
  $Results += [pscustomobject]@{
    name=$Name; method=$Method; url=$Url; status=$Status; ms=$Ms; body=(AsJsonSnippet $Body); error=$Error
  }
}

function Update-AuthFromBody {
  param($body)
  if (-not $body) { return }
  $payload = $body
  if ($payload.data) { $payload = $payload.data }
  $tok = $null
  if ($payload.accessToken) { $tok = $payload.accessToken }
  elseif ($payload.token) { $tok = $payload.token }
  elseif ($payload.access_token) { $tok = $payload.access_token }
  if ($tok) {
    $script:AuthToken = "Bearer $tok"
    if (-not $script:Headers) { $script:Headers = @{} }
    $script:Headers['Authorization'] = $script:AuthToken
  }
  if ($payload.user -and $payload.user.id) { $script:UserId = $payload.user.id }
}

function Sync-Headers {
  if ($script:AuthToken) {
    if (-not $script:Headers) { $script:Headers = @{} }
    $script:Headers['Authorization'] = $script:AuthToken
  } else {
    if (-not $script:Headers) { $script:Headers = @{} }
    if ($script:Headers.ContainsKey('Authorization')) { $script:Headers.Remove('Authorization') }
  }
  $global:Headers = $script:Headers
}

function Invoke-Api {
  param(
    [string]$Name,
    [string]$Method,
    [string]$Url,
    $Body = $null,
    [hashtable]$Headers = @{},
    [int]$Retries = 3
  )
  $attempt = 0
  $statusCode = 0
  $respBody = $null
  $errorMsg = $null
  $ms = 0
  $backoffs = @(2,4,8)

  while ($attempt -lt $Retries) {
    $attempt++
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
      $params = @{ Uri=$Url; Method=$Method; TimeoutSec=45; ErrorAction='Stop' }
      if ($Headers.Count -gt 0) { $params['Headers'] = $Headers }
      if ($null -ne $Body) {
        $params['ContentType'] = 'application/json'
        $params['Body'] = ($Body | ConvertTo-Json -Depth 10)
      }
      # Use Invoke-WebRequest to capture status code across PS5/PS7
      if ($PSVersionTable.PSVersion.Major -lt 6) { $params['UseBasicParsing'] = $true }
      $resp = Invoke-WebRequest @params
      $sw.Stop()
      $ms = [int]$sw.ElapsedMilliseconds
      $statusCode = [int]$resp.StatusCode
      $respBody = try { ($resp.Content | ConvertFrom-Json) } catch { $resp.Content }
      Write-Color ("[PASS] {0} {1} -> {2} ({3} ms)" -f $Method,$Url,$statusCode,$ms) 'Green'
      Add-Result -Name $Name -Method $Method -Url $Url -Status $statusCode -Ms $ms -Body $respBody -Error $null
      $script:Passed++
      return @{ Status=$statusCode; Body=$respBody; Ms=$ms }
    } catch {
      $sw.Stop()
      $ms = [int]$sw.ElapsedMilliseconds
      $statusCode = try { [int]$_.Exception.Response.StatusCode.Value__ } catch { 0 }
      $errorMsg = $_.Exception.Message
      $respBody = $null
      $script:Retried++
      Add-Result -Name $Name -Method $Method -Url $Url -Status=$statusCode -Ms=$ms -Body=$respBody -Error=$errorMsg
      if ($attempt -lt $Retries) {
        $delay = $backoffs[[Math]::Min($attempt-1, $backoffs.Count-1)]
        Write-Color ("[RETRY] {0}/{1} after {2}s -> {3} {4} ({5})" -f $attempt,$Retries,$delay,$Method,$Url,$errorMsg) 'Yellow'
        Start-Sleep -Seconds $delay
      } else {
        Write-Color ("[FAIL] {0} {1} -> {2} ({3} ms) {4}" -f $Method,$Url,$statusCode,$ms,$errorMsg) 'Red'
        $script:Failed++
        return @{ Status=$statusCode; Body=$null; Ms=$ms; Error=$errorMsg }
      }
    }
  }
}

function Ensure-Images {
  $required = @('codecollab-node:latest','codecollab-python:latest','codecollab-cpp:latest','codecollab-java:latest')
  try {
    $list = (& docker images --format '{{.Repository}}:{{.Tag}}' 2>$null)
  } catch { $list = @() }
  foreach ($img in $required) {
    if (-not ($list -match [regex]::Escape($img))) {
      Write-Color ("[WARN] Compiler image missing: {0}. Please build/pull it, then press Enter to continue..." -f $img) 'Yellow'
      Read-Host | Out-Null
    }
  }
}

# 0) Optional: clear database
if ($ClearDatabase) {
  if (-not $Force) {
    Write-Color "[CONFIRM] This will ERASE and RESEED your database (Prisma reset). Type 'YES' to proceed:" 'Yellow'
    $ans = Read-Host
    if ($ans -ne 'YES') { Write-Color "[DB] Reset aborted by user." 'Yellow' } else { Reset-Database -Root (Find-RepoRoot) }
  } else {
    Reset-Database -Root (Find-RepoRoot)
  }
}

# 1) Ensure compiler images
Ensure-Images

# 2) Auth bootstrap: try login first, else register, with alias fallback (random email each run)
# Generate random alias email every run
function New-RandomEmail {
  param([string]$Base)
  $stamp = (Get-Date).ToString('yyyyMMddHHmmssfff')
  if ($Base -match '^(.*)@(.+)$') { return ("{0}+{1}@{2}" -f $Matches[1],$stamp,$Matches[2]) }
  return ("tester+{0}@mailinator.com" -f $stamp)
}
$WorkEmail = New-RandomEmail -Base $Email

$login = Invoke-Api -Name 'Login' -Method 'POST' -Url ("{0}/auth/login" -f $BaseUrl.TrimEnd('/')) -Body @{ email=$WorkEmail; password=$Password }
if (-not $login -or $login.Status -ge 400) {
  # Attempt registration; handle username unique or email exists
  $regSuccess = $false
  for ($i=0; $i -lt 3 -and -not $regSuccess; $i++) {
    $suffix = (Get-Date).ToString('yyyyMMddHHmmssfff')
    $regName = "Rohan Parmar $suffix"
    $regBody = @{ name=$regName; email=$WorkEmail; password=$Password }
    $reg = Invoke-Api -Name 'Register' -Method 'POST' -Url ("{0}/auth/register" -f $BaseUrl.TrimEnd('/')) -Body $regBody
    if ($reg.Status -ge 200 -and $reg.Status -lt 300) { $regSuccess = $true; break }
    # Email already registered -> proceed to login
    if ($reg.Status -eq 400 -and (""+$reg.Error) -match 'Email already registered') { break }
    # Username unique/5xx -> change email alias and retry once
    if ($reg.Status -ge 500) {
      $alias = ((Get-Date).ToString('yyyyMMddHHmmssfff'))
      if ($WorkEmail -match '^(.*)@(.+)$') { $WorkEmail = ("{0}+{1}@{2}" -f $Matches[1],$alias,$Matches[2]) }
      continue
    }
    break
  }
  # Try login after registration attempt
  $login = Invoke-Api -Name 'Login' -Method 'POST' -Url ("{0}/auth/login" -f $BaseUrl.TrimEnd('/')) -Body @{ email=$WorkEmail; password=$Password }
}
$AuthToken = $null
$UserId = $null
if ($login -and $login.Body) { Update-AuthFromBody -body $login.Body }
Sync-Headers
$Headers = $script:Headers

# 4) Refresh token (optional)
if ($login.Body) {
  $payload = if ($login.Body.data) { $login.Body.data } else { $login.Body }
  if ($payload.refreshToken) {
    $ref = Invoke-Api -Name 'Refresh' -Method 'POST' -Url ("{0}/auth/refresh-token" -f $BaseUrl.TrimEnd('/')) -Body @{ refreshToken=$payload.refreshToken } -Headers $script:Headers
    if ($ref -and $ref.Body) { Update-AuthFromBody -body $ref.Body; Sync-Headers }
    $Headers = $script:Headers
  }
}

# 5) Skip forgot-password/reset-password per request

# 6) User profile
Invoke-Api -Name 'GetProfile' -Method 'GET' -Url ("{0}/users/profile" -f $BaseUrl.TrimEnd('/')) -Headers $script:Headers | Out-Null
$uname = ("User " + (Get-Date).ToString('HHmmss'))
Invoke-Api -Name 'UpdateProfile' -Method 'PUT' -Url ("{0}/users/profile" -f $BaseUrl.TrimEnd('/')) -Body @{ username=$uname; email=$WorkEmail; avatarUrl='https://example.com/a.png' } -Headers $script:Headers | Out-Null

# 7) Rooms
$roomCreate = Invoke-Api -Name 'CreateRoom' -Method 'POST' -Url ("{0}/rooms" -f $BaseUrl.TrimEnd('/')) -Body @{ name=('Team '+(Get-Date).ToString('HHmmss')); language='javascript'; description='Sprint doc' } -Headers $script:Headers
$RoomId = $null
if ($roomCreate.Body.id) { $RoomId = $roomCreate.Body.id } elseif ($roomCreate.Body.room.id) { $RoomId = $roomCreate.Body.room.id }
Invoke-Api -Name 'ListRooms' -Method 'GET' -Url ("{0}/rooms" -f $BaseUrl.TrimEnd('/')) -Headers $script:Headers | Out-Null
if ($RoomId) {
  Invoke-Api -Name 'GetRoom' -Method 'GET' -Url ("{0}/rooms/{1}" -f $BaseUrl.TrimEnd('/'),$RoomId) -Headers $script:Headers | Out-Null
  # join / leave room using current user
  if ($UserId) {
    Invoke-Api -Name 'JoinRoom' -Method 'POST' -Url ("{0}/rooms/join" -f $BaseUrl.TrimEnd('/')) -Body @{ roomId=$RoomId; userId=$UserId } -Headers $script:Headers | Out-Null
    Invoke-Api -Name 'LeaveRoom' -Method 'POST' -Url ("{0}/rooms/leave" -f $BaseUrl.TrimEnd('/')) -Body @{ roomId=$RoomId; userId=$UserId } -Headers $script:Headers | Out-Null
    # user rooms
    Invoke-Api -Name 'UserRooms' -Method 'GET' -Url ("{0}/users/{1}/rooms" -f $BaseUrl.TrimEnd('/'),$UserId) -Headers $script:Headers | Out-Null
  }
}

# 8) Files (within room)
$FileId = $null
if ($RoomId) {
  $fileCreate = Invoke-Api -Name 'CreateFile' -Method 'POST' -Url ("{0}/files/rooms/{1}/files" -f $BaseUrl.TrimEnd('/'),$RoomId) -Body @{ name='index.ts'; content="console.log('hi')"; path='/src/index.ts' } -Headers $script:Headers
  if ($fileCreate.Body.id) { $FileId = $fileCreate.Body.id }
  Invoke-Api -Name 'ListFiles' -Method 'GET' -Url ("{0}/files/rooms/{1}/files" -f $BaseUrl.TrimEnd('/'),$RoomId) -Headers $script:Headers | Out-Null
  if ($FileId) {
    Invoke-Api -Name 'GetFile' -Method 'GET' -Url ("{0}/files/{1}" -f $BaseUrl.TrimEnd('/'),$FileId) -Headers $script:Headers | Out-Null
    Invoke-Api -Name 'UpdateFile' -Method 'PUT' -Url ("{0}/files/{1}" -f $BaseUrl.TrimEnd('/'),$FileId) -Body @{ name='index.ts'; content="console.log('updated')"; path='/src/index.ts' } -Headers $script:Headers | Out-Null
    Invoke-Api -Name 'CreateSnapshot' -Method 'POST' -Url ("{0}/files/{1}/snapshots" -f $BaseUrl.TrimEnd('/'),$FileId) -Body @{ code="console.log('snapshot')"; language='javascript'; description='Initial snapshot' } -Headers $script:Headers | Out-Null
    Invoke-Api -Name 'ListSnapshots' -Method 'GET' -Url ("{0}/files/{1}/snapshots" -f $BaseUrl.TrimEnd('/'),$FileId) -Headers $script:Headers | Out-Null
    # delete file
    Invoke-Api -Name 'DeleteFile' -Method 'DELETE' -Url ("{0}/files/{1}" -f $BaseUrl.TrimEnd('/'),$FileId) -Headers $script:Headers | Out-Null
  }
}

# 9) Execution
if ($RoomId) {
  $exec = Invoke-Api -Name 'ExecuteCode' -Method 'POST' -Url ("{0}/execution/execute" -f $BaseUrl.TrimEnd('/')) -Body @{ language='javascript'; code='console.log(1+1)'; input=''; roomId=$RoomId } -Headers $script:Headers
  $ExecutionId = $null
  if ($exec.Body.id) { $ExecutionId = $exec.Body.id }
  Invoke-Api -Name 'ListExecutions' -Method 'GET' -Url ("{0}/execution" -f $BaseUrl.TrimEnd('/')) -Headers $script:Headers | Out-Null
  if ($ExecutionId) { Invoke-Api -Name 'GetExecution' -Method 'GET' -Url ("{0}/execution/{1}" -f $BaseUrl.TrimEnd('/'),$ExecutionId) -Headers $script:Headers | Out-Null }
}

# 10) Billing
Invoke-Api -Name 'BillingCreate' -Method 'POST' -Url ("{0}/billing/create" -f $BaseUrl.TrimEnd('/')) -Body @{ planType='1M' } -Headers $script:Headers | Out-Null
Invoke-Api -Name 'BillingActive' -Method 'GET' -Url ("{0}/billing/active" -f $BaseUrl.TrimEnd('/')) -Headers $script:Headers | Out-Null
Invoke-Api -Name 'BillingVerify' -Method 'POST' -Url ("{0}/billing/verify" -f $BaseUrl.TrimEnd('/')) -Body @{ razorpay_subscription_id='sub_test'; razorpay_payment_id='pay_test'; razorpay_signature='sig_test' } -Headers $script:Headers | Out-Null

# 11) Analytics
Invoke-Api -Name 'AnalyticsOverview' -Method 'GET' -Url ("{0}/analytics/overview" -f $BaseUrl.TrimEnd('/')) -Headers $script:Headers | Out-Null

# 12) Notifications
${null} = $null
$notifList = Invoke-Api -Name 'ListNotifications' -Method 'GET' -Url ("{0}/notifications" -f $BaseUrl.TrimEnd('/')) -Headers $script:Headers
$NotifId = $null
if ($notifList -and $notifList.Body -and $notifList.Body[0] -and $notifList.Body[0].id) { $NotifId = $notifList.Body[0].id }
if ($NotifId) {
  Invoke-Api -Name 'MarkNotificationRead' -Method 'PATCH' -Url ("{0}/notifications/{1}/read" -f $BaseUrl.TrimEnd('/'),$NotifId) -Headers $script:Headers | Out-Null
}
Invoke-Api -Name 'ClearNotifications' -Method 'DELETE' -Url ("{0}/notifications/clear" -f $BaseUrl.TrimEnd('/')) -Headers $script:Headers | Out-Null

# 13) Health (public via baseUrl)
Invoke-Api -Name 'Health' -Method 'GET' -Url ("{0}/health" -f $BaseUrl.TrimEnd('/')) | Out-Null

# 14) RBAC setup for admin endpoints (Option B)
$AdminRoleId = $null
# Try to find existing 'ADMIN' role
try {
  $roles = Invoke-Api -Name 'GetRoles' -Method 'GET' -Url ("{0}/roles" -f $BaseUrl.TrimEnd('/')) -Headers $script:Headers
  if ($roles -and $roles.Body) {
    foreach ($r in $roles.Body) { if ($r.name -eq 'ADMIN' -and $r.id) { $AdminRoleId = $r.id; break } }
    if (-not $AdminRoleId -and $roles.Body.data) { foreach ($r in $roles.Body.data) { if ($r.name -eq 'ADMIN' -and $r.id) { $AdminRoleId = $r.id; break } } }
  }
} catch {}

# If not found, create 'ADMIN'
if (-not $AdminRoleId) {
  try {
    $roleRes = Invoke-Api -Name 'CreateRole(ADMIN)' -Method 'POST' -Url ("{0}/roles" -f $BaseUrl.TrimEnd('/')) -Body @{ name='ADMIN'; description='Administrator' } -Headers $script:Headers
    if ($roleRes -and $roleRes.Body) {
      if ($roleRes.Body.id) { $AdminRoleId = $roleRes.Body.id }
      elseif ($roleRes.Body.role.id) { $AdminRoleId = $roleRes.Body.role.id }
    }
  } catch {}
}

# Create needed permissions and assign to role
$permMap = @{}
$neededPerms = @(
  @{ action='read'; resource='users'; description='Read users' },
  @{ action='read'; resource='rooms'; description='Read rooms' },
  @{ action='read'; resource='subscriptions'; description='Read subscriptions' }
)
foreach ($p in $neededPerms) {
  try {
    $pid = $null
    # Pre-check: list existing permissions
    try {
      $plist = Invoke-Api -Name 'ListPerms' -Method 'GET' -Url ("{0}/permissions" -f $BaseUrl.TrimEnd('/')) -Headers $script:Headers
      if ($plist -and $plist.Body) {
        foreach ($perm in $plist.Body) {
          if (($perm.action -eq $p.action) -and ($perm.resource -eq $p.resource)) { $pid = $perm.id; break }
        }
        if (-not $pid -and $plist.Body.data) {
          foreach ($perm in $plist.Body.data) {
            if (($perm.action -eq $p.action) -and ($perm.resource -eq $p.resource)) { $pid = $perm.id; break }
          }
        }
      }
    } catch {}
    # Create only if not found
    if (-not $pid) {
      $pRes = Invoke-Api -Name ('CreatePerm('+ $p.action +'-'+ $p.resource +')') -Method 'POST' -Url ("{0}/permissions" -f $BaseUrl.TrimEnd('/')) -Body $p -Headers $script:Headers
      if ($pRes -and $pRes.Body) { if ($pRes.Body.id) { $pid = $pRes.Body.id } elseif ($pRes.Body.permission.id) { $pid = $pRes.Body.permission.id } }
    }
    if ($pid) { $permMap[("{0}:{1}" -f $p.action,$p.resource)] = $pid }
    if ($AdminRoleId -and $pid) {
      Invoke-Api -Name ('AssignPerm('+ $p.action +'-'+ $p.resource +')') -Method 'POST' -Url ("{0}/roles/assign-permission" -f $BaseUrl.TrimEnd('/')) -Body @{ roleId=$AdminRoleId; permissionId=$pid } -Headers $script:Headers | Out-Null
    }
  } catch {}
}

# Assign role to current user
if ($AdminRoleId -and $UserId) {
  Invoke-Api -Name 'AssignRoleToUser(E2E)' -Method 'POST' -Url ("{0}/users/assign-role" -f $BaseUrl.TrimEnd('/')) -Body @{ userId=$UserId; roleId=$AdminRoleId } -Headers $script:Headers | Out-Null
}

# 15) Admin lists (should pass after RBAC setup)
Invoke-Api -Name 'AdminUsers' -Method 'GET' -Url ("{0}/admin/users" -f $BaseUrl.TrimEnd('/')) -Headers $script:Headers | Out-Null
Invoke-Api -Name 'AdminRooms' -Method 'GET' -Url ("{0}/admin/rooms" -f $BaseUrl.TrimEnd('/')) -Headers $script:Headers | Out-Null
Invoke-Api -Name 'AdminSubscriptions' -Method 'GET' -Url ("{0}/admin/subscriptions" -f $BaseUrl.TrimEnd('/')) -Headers $script:Headers | Out-Null

# 16) Roles: set parent and get hierarchy
$parentName = 'PARENT_TEST_' + (Get-Date).ToString('HHmmss')
$childName = 'CHILD_TEST_' + (Get-Date).ToString('HHmmss')
$ParentRoleId = $null
$ChildRoleId = $null
try {
  $pRes = Invoke-Api -Name 'CreateRole(Parent)' -Method 'POST' -Url ("{0}/roles" -f $BaseUrl.TrimEnd('/')) -Body @{ name=$parentName; description='Parent role' } -Headers $script:Headers
  if ($pRes.Body.id) { $ParentRoleId = $pRes.Body.id } elseif ($pRes.Body.role.id) { $ParentRoleId = $pRes.Body.role.id }
} catch {}
try {
  $cRes = Invoke-Api -Name 'CreateRole(Child)' -Method 'POST' -Url ("{0}/roles" -f $BaseUrl.TrimEnd('/')) -Body @{ name=$childName; description='Child role' } -Headers $script:Headers
  if ($cRes.Body.id) { $ChildRoleId = $cRes.Body.id } elseif ($cRes.Body.role.id) { $ChildRoleId = $cRes.Body.role.id }
} catch {}
if ($ParentRoleId -and $ChildRoleId) {
  Invoke-Api -Name 'SetParentRole' -Method 'POST' -Url ("{0}/roles/set-parent" -f $BaseUrl.TrimEnd('/')) -Body @{ roleId=$ChildRoleId; parentRoleId=$ParentRoleId } -Headers $script:Headers | Out-Null
}
Invoke-Api -Name 'GetRoleHierarchy' -Method 'GET' -Url ("{0}/roles/hierarchy" -f $BaseUrl.TrimEnd('/')) -Headers $script:Headers | Out-Null

# 17) Permissions: create unique temp permission then delete it
$tempResName = 'temp_' + (Get-Date).ToString('yyyyMMddHHmmssfff')
$TempPermId = $null
try {
  $tmpCreate = Invoke-Api -Name 'CreatePerm(temp)' -Method 'POST' -Url ("{0}/permissions" -f $BaseUrl.TrimEnd('/')) -Body @{ action='read'; resource=$tempResName; description='temp' } -Headers $script:Headers
  if ($tmpCreate.Body.id) { $TempPermId = $tmpCreate.Body.id } elseif ($tmpCreate.Body.permission.id) { $TempPermId = $tmpCreate.Body.permission.id }
} catch {}
if ($TempPermId) {
  Invoke-Api -Name 'DeletePerm(temp)' -Method 'DELETE' -Url ("{0}/permissions/{1}" -f $BaseUrl.TrimEnd('/'),$TempPermId) -Headers $script:Headers | Out-Null
}

# Cleanup: delete room if we created one
if ($RoomId) {
  Invoke-Api -Name 'DeleteRoom' -Method 'DELETE' -Url ("{0}/rooms/{1}" -f $BaseUrl.TrimEnd('/'),$RoomId) -Headers $script:Headers | Out-Null
}

# Output results
$Results | ConvertTo-Json -Depth 8 | Out-File -FilePath $JsonPath -Encoding UTF8

Write-Color "`n========= CODECOLLAB API SUMMARY =========" 'Cyan'
Write-Color ("Passed: {0}   Retried: {1}   Failed: {2}" -f $Passed,$Retried,$Failed) 'White'
Write-Host ("Log saved at: {0}" -f $LogPath)
Write-Host ("JSON results: {0}" -f $JsonPath)
Write-Color "==========================================" 'Cyan'
