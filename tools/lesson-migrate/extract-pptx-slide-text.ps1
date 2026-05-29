param(
  [string]$PptxPath = "$PSScriptRoot\..\..\course-content\Lesson 5.pptx",
  [int[]]$SlideNumbers = @(5, 6, 11, 12, 14)
)

$ErrorActionPreference = "Stop"
$pptxAbs = Resolve-Path $PptxPath
$pp = New-Object -ComObject PowerPoint.Application
try {
  $pres = $pp.Presentations.Open($pptxAbs, $true, $false, $false)
  foreach ($n in $SlideNumbers) {
    Write-Output "`n========== SLIDE $n =========="
    $slide = $pres.Slides.Item($n)
    foreach ($shape in $slide.Shapes) {
      if ($shape.HasTextFrame -eq -1) {
        $text = $shape.TextFrame.TextRange.Text
        if ($text -and $text.Trim()) {
          Write-Output "---"
          Write-Output $text.Trim()
        }
      }
      if ($shape.Type -eq 6) {
        # msoGroup
        try {
          foreach ($sub in $shape.GroupItems) {
            if ($sub.HasTextFrame -eq -1) {
              $text = $sub.TextFrame.TextRange.Text
              if ($text -and $text.Trim()) { Write-Output $text.Trim() }
            }
          }
        } catch {}
      }
    }
  }
  $pres.Close()
}
finally {
  $pp.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($pp) | Out-Null
}
