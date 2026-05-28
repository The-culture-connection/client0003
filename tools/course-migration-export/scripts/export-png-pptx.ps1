param(
  [Parameter(Mandatory = $true)][string]$PptxPath,
  [Parameter(Mandatory = $true)][string]$OutDir
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $PptxPath)) {
  throw "PPTX not found: $PptxPath"
}

$outAbs = $null
try {
  $outAbs = (Resolve-Path $OutDir).Path
} catch {
  $outAbs = (New-Item -ItemType Directory -Force -Path $OutDir).FullName
}
if (-not (Test-Path $outAbs)) {
  $outAbs = (New-Item -ItemType Directory -Force -Path $OutDir).FullName
}

$pptxAbs = (Resolve-Path $PptxPath).Path

$pp = New-Object -ComObject PowerPoint.Application
try {
  $pres = $pp.Presentations.Open($pptxAbs, $true, $false, $false)
  $pres.Export($outAbs, "PNG", 1920, 1080)
  $pres.Close()
}
finally {
  $pp.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($pp) | Out-Null
}
