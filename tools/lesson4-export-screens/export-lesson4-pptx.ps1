# Lossless per-slide PNG export from Lesson4.pptx (native slide dimensions)
param(
  [string]$PptxPath = "$PSScriptRoot\..\..\course-content\Lesson4.pptx",
  [string]$OutDir = "$PSScriptRoot\..\..\exports\lesson-4-screenshot\png"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$pptxAbs = Resolve-Path $PptxPath
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$pp = New-Object -ComObject PowerPoint.Application
try {
  $pres = $pp.Presentations.Open($pptxAbs, $true, $false, $false)
  $count = $pres.Slides.Count
  $screens = @()

  for ($i = 1; $i -le $count; $i++) {
    $fileName = "screen-{0:D3}.png" -f $i
    $outPath = Join-Path $OutDir $fileName
    if (Test-Path $outPath) { Remove-Item $outPath -Force }
    $pres.Slides.Item($i).Export($outPath, "PNG")
    $probe = [System.Drawing.Image]::FromFile($outPath)
    $screens += [PSCustomObject]@{
      screenNumber = $i
      sourceSlide  = $i
      fileName     = $fileName
      widthPx      = $probe.Width
      heightPx     = $probe.Height
    }
    $probe.Dispose()
  }
  $pres.Close()
}
finally {
  $pp.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($pp) | Out-Null
}

Write-Host "Exported $count slides to $OutDir"
$screens | ConvertTo-Json | Set-Content (Join-Path (Split-Path $OutDir) "export-meta.json") -Encoding UTF8
