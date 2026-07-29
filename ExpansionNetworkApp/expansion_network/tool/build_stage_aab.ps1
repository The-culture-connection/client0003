<#
.SYNOPSIS
    Builds a signed release .aab pointed at a chosen Firebase project.

.DESCRIPTION
    Pointing the app at an environment takes TWO changes that must agree:

      1. Native  - android/app/google-services.json  (FCM, Crashlytics)
      2. Dart    - DefaultFirebaseOptions             (Auth, Firestore, Storage)

    Change only one and the app silently splits its traffic across two projects:
    push tokens registered on stage while Firestore reads dev. This script makes
    both changes together, then restores the checkout to its dev default in a
    finally block so an interrupted or failed build never leaves the tree
    pointed somewhere unexpected.

.PARAMETER FirebaseEnv
    'stage' (default) or 'dev'.

.PARAMETER KeepConfig
    Leave the swapped google-services.json in place instead of restoring it.
    For iterating on stage builds; remember to restore before dev work.

.EXAMPLE
    pwsh tool/build_stage_aab.ps1
    powershell -File tool/build_stage_aab.ps1 -FirebaseEnv stage
#>
[CmdletBinding()]
param(
    [ValidateSet('dev', 'stage')]
    [string]$FirebaseEnv = 'stage',
    [switch]$KeepConfig
)

$ErrorActionPreference = 'Stop'

$appRoot     = Split-Path -Parent $PSScriptRoot
$projectId   = "mortar-$FirebaseEnv"
$liveConfig  = Join-Path $appRoot 'android\app\google-services.json'
$wantConfig  = Join-Path $appRoot "android\config\google-services.$projectId.json"
$backup      = "$liveConfig.build-backup"

function Get-ProjectId([string]$path) {
    return (Get-Content -Raw -Path $path | ConvertFrom-Json).project_info.project_id
}

# --- Preflight -------------------------------------------------------------
if (-not (Test-Path $wantConfig)) {
    throw "Missing $wantConfig. Download it with: firebase apps:sdkconfig ANDROID <appId> --project $projectId --out `"$wantConfig`""
}

$actualId = Get-ProjectId $wantConfig
if ($actualId -ne $projectId) {
    throw "$wantConfig declares project_id '$actualId' but this script expects '$projectId'."
}

# The Google Services Gradle plugin fails the build if no client entry matches
# the applicationId. Catch that here, where the message is actionable.
$gradle = Get-Content -Raw -Path (Join-Path $appRoot 'android\app\build.gradle.kts')
if ($gradle -match 'applicationId\s*=\s*"([^"]+)"') {
    $applicationId = $Matches[1]
    $packages = (Get-Content -Raw -Path $wantConfig | ConvertFrom-Json).client |
        ForEach-Object { $_.client_info.android_client_info.package_name }
    if ($packages -notcontains $applicationId) {
        throw "No app registered on $projectId for package '$applicationId' (found: $($packages -join ', ')). Register it in the Firebase console, then re-download the config."
    }
}

$keyProps = Join-Path $appRoot 'android\key.properties'
if (-not (Test-Path $keyProps)) {
    throw "Missing android/key.properties - the release build would fall back to the debug key and Play would reject it."
}

if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
    throw 'flutter is not on PATH.'
}

$version = (Select-String -Path (Join-Path $appRoot 'pubspec.yaml') -Pattern '^version:\s*(.+)$').Matches[0].Groups[1].Value.Trim()

Write-Host ''
Write-Host "  Firebase project : $projectId"
Write-Host "  Version          : $version"
Write-Host "  Signing          : android/key.properties"
Write-Host ''

# --- Swap, build, restore --------------------------------------------------
Copy-Item -Path $liveConfig -Destination $backup -Force
try {
    Copy-Item -Path $wantConfig -Destination $liveConfig -Force
    Write-Host "google-services.json -> $(Get-ProjectId $liveConfig)"

    # --dart-define must match the config just copied in; see DefaultFirebaseOptions.
    # Run from the app root so the script works from any working directory.
    Push-Location $appRoot
    try {
        & flutter build appbundle --release --dart-define=FIREBASE_ENV=$FirebaseEnv
        if ($LASTEXITCODE -ne 0) {
            throw "flutter build appbundle failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    if ($KeepConfig) {
        Write-Host "Left google-services.json pointed at $projectId (-KeepConfig)."
        Remove-Item -Path $backup -Force -ErrorAction SilentlyContinue
    }
    else {
        Copy-Item -Path $backup -Destination $liveConfig -Force
        Remove-Item -Path $backup -Force
        Write-Host "Restored google-services.json -> $(Get-ProjectId $liveConfig)"
    }
}

$aab = Join-Path $appRoot 'build\app\outputs\bundle\release\app-release.aab'
if (Test-Path $aab) {
    $mb = [math]::Round((Get-Item $aab).Length / 1MB, 1)
    Write-Host ''
    Write-Host "Bundle: $aab ($mb MB)"
    Write-Host "Built against $projectId. Play requires a versionCode higher than any previous upload (currently $version)."
}
