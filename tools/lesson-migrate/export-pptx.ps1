# Lossless per-slide PNG export from LessonN.pptx (native slide dimensions)
param(
  [string]$ConfigPath = "$PSScriptRoot\lesson-5.config.json"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$configAbs = Resolve-Path $ConfigPath
$config = Get-Content $configAbs -Raw | ConvertFrom-Json

$pptxRel = $config.sourcePptx
$pptxAbs = Join-Path $repoRoot $pptxRel
if (-not (Test-Path $pptxAbs)) {
  throw "PPTX not found: $pptxAbs`nExport Lesson $($config.lessonNumber) from Canva as PowerPoint and save to course-content/Lesson$($config.lessonNumber).pptx"
}

$outDir = Join-Path $repoRoot (Join-Path $config.exportDir "png")
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$pp = New-Object -ComObject PowerPoint.Application
try {
  $pres = $pp.Presentations.Open($pptxAbs, $true, $false, $false)
  $count = $pres.Slides.Count
  if ($config.totalPptSlides -and $count -ne $config.totalPptSlides) {
    Write-Warning "PPTX has $count slides; config totalPptSlides=$($config.totalPptSlides). Update lesson-$($config.lessonNumber).config.json if needed."
  }
  $screens = @()

  for ($i = 1; $i -le $count; $i++) {
    $fileName = "screen-{0:D3}.png" -f $i
    $outPath = Join-Path $outDir $fileName
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

$metaPath = Join-Path $repoRoot (Join-Path $config.exportDir "export-meta.json")
$screens | ConvertTo-Json | Set-Content $metaPath -Encoding UTF8
Write-Host "Exported $count slides to $outDir"
