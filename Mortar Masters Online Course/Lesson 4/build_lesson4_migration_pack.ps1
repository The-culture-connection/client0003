$ErrorActionPreference = "Stop"

$lessonDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$outDir = Join-Path $lessonDir "exports"
$pngDir = Join-Path $outDir "slide_png_export"
$pptxPath = Join-Path $outDir "Lesson4_Migration_Pack.pptx"
$surveyMapPath = Join-Path $outDir "Lesson4_Mock_Surveys_And_Quiz.md"
$placementPath = Join-Path $outDir "Lesson4_Video_GIF_Placement.md"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
New-Item -ItemType Directory -Force -Path $pngDir | Out-Null

Add-Type -AssemblyName System.Drawing

$files = Get-ChildItem -Path $lessonDir -Filter "L4-*.png"

# Build ordered page map from numbered screenshots
$pageMap = @{}
foreach ($file in $files) {
  if ($file.BaseName -match '^L4-(\d+)(?:-(top|mid|bottom))?$') {
    $num = [int]$matches[1]
    $part = $matches[2]
    if (-not $pageMap.ContainsKey($num)) {
      $pageMap[$num] = @{ top = $null; mid = $null; bottom = $null; single = $null }
    }
    if ($part) {
      $pageMap[$num][$part] = $file.FullName
    } else {
      $pageMap[$num]["single"] = $file.FullName
    }
  }
}

$orderedSlides = New-Object System.Collections.Generic.List[Object]
foreach ($num in ($pageMap.Keys | Sort-Object)) {
  $entry = $pageMap[$num]
  $label = "L4-{0:D2}" -f $num
  if ($entry.single) {
    $orderedSlides.Add([PSCustomObject]@{
      Id = $label
      Paths = @($entry.single)
    })
  } else {
    $segments = @()
    if ($entry.top) { $segments += $entry.top }
    if ($entry.mid) { $segments += $entry.mid }
    if ($entry.bottom) { $segments += $entry.bottom }
    if ($segments.Count -gt 0) {
      $orderedSlides.Add([PSCustomObject]@{
        Id = $label
        Paths = $segments
      })
    }
  }
}

$quizFiles = Get-ChildItem -Path $lessonDir -Filter "L4-quiz-q*.png" | Sort-Object Name
foreach ($q in $quizFiles) {
  $orderedSlides.Add([PSCustomObject]@{
    Id = $q.BaseName
    Paths = @($q.FullName)
  })
}

# Build PowerPoint
$pp = New-Object -ComObject PowerPoint.Application
$pres = $pp.Presentations.Add()
$pres.PageSetup.SlideSize = 16  # 16:9

# Intro slide
$intro = $pres.Slides.Add(1, 12)
$t1 = $intro.Shapes.AddTextbox(1, 40, 40, 1200, 90)
$t1.TextFrame.TextRange.Text = "Mortar Masters Online - Lesson 4 Migration Pack"
$t1.TextFrame.TextRange.Font.Size = 36
$t1.TextFrame.TextRange.Font.Bold = $true
$t1.TextFrame.TextRange.Font.Color.RGB = 0x9CCB5A

$t2 = $intro.Shapes.AddTextbox(1, 40, 150, 1200, 250)
$t2.TextFrame.TextRange.Text = @"
This deck is assembled from your ordered Lesson 4 captures.
Source folder: Mortar Masters Online Course/Lesson 4
Video links:
 - L4-01: https://youtu.be/g1TkE84pGII?si=MqXgf6ZzC84WLz-S
 - L4-12: https://youtu.be/Wi3cV1asrOs?si=7zBJmWYrdgMoSQMr

Use this as migration source for Mortar media slides.
"@
$t2.TextFrame.TextRange.Font.Size = 20
$t2.TextFrame.TextRange.Font.Color.RGB = 0xFFFFFF

$slideIndex = 2
foreach ($s in $orderedSlides) {
  $slide = $pres.Slides.Add($slideIndex, 12)
  $segmentInfo = @()
  foreach ($p in $s.Paths) {
    $img = [System.Drawing.Image]::FromFile($p)
    $segmentInfo += [PSCustomObject]@{ Path = $p; W = $img.Width; H = $img.Height }
    $img.Dispose()
  }
  $totalRawHeight = ($segmentInfo | ForEach-Object { $_.H } | Measure-Object -Sum).Sum
  if ($totalRawHeight -le 0) { $totalRawHeight = 1 }
  $y = 0
  foreach ($seg in $segmentInfo) {
    $targetH = [double](720 * ($seg.H / $totalRawHeight))
    $slide.Shapes.AddPicture($seg.Path, $false, $true, 0, $y, 1280, $targetH) | Out-Null
    $y += $targetH
  }
  $cap = $slide.Shapes.AddTextbox(1, 20, 680, 600, 30)
  $cap.TextFrame.TextRange.Text = $s.Id
  $cap.TextFrame.TextRange.Font.Size = 12
  $cap.TextFrame.TextRange.Font.Color.RGB = 0xCCCCCC
  $slideIndex++
}

$pres.SaveAs($pptxPath)
$pres.Export($pngDir, "PNG", 1920, 1080)

$pres.Close()
$pp.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($pres) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($pp) | Out-Null

@"
# Lesson 4 Mock Surveys + Quiz Placement

## Recommended survey checkpoints (based on lesson flow)

- After `L4-05`:
  - What does your audience need most right now?
  - What assumptions are you making that need validating?
  - What one change would make your offer clearer?

- After `L4-10`:
  - Draft your mission statement in 1-2 sentences.
  - Who is your primary customer?
  - What measurable outcome should your customer get?

- After `L4-14`:
  - What is your WHY in one sentence?
  - Which business decision this month should align with that WHY?
  - What barrier could stop you, and how will you address it?

## End-of-lesson quiz (after `L4-23`)

1. A mission statement should primarily explain:
   - A) Why the business exists and whom it serves
   - B) Color palette choices
   - C) Accounting software setup
   - D) Social posting cadence
   - Correct: A

2. In Lesson 4, identifying your WHY helps with:
   - A) Faster logo creation
   - B) Better alignment in strategy and decisions
   - C) Avoiding customer feedback
   - D) Reducing all risk
   - Correct: B

3. A strong customer-focused statement includes:
   - A) Vague inspirational language only
   - B) A clear target audience and value outcome
   - C) Internal org chart details
   - D) No action verbs
   - Correct: B

4. Reflection activities in this lesson are used to:
   - A) Replace all planning
   - B) Clarify positioning, intent, and execution
   - C) Avoid operational decisions
   - D) Eliminate the need for iteration
   - Correct: B
"@ | Set-Content -Path $surveyMapPath -Encoding UTF8

@"
# Video + GIF Placement Plan (Lesson 4)

- `L4-01` -> insert YouTube video block before/after this visual:
  - https://youtu.be/g1TkE84pGII?si=MqXgf6ZzC84WLz-S
- `L4-12` -> insert second YouTube video block:
  - https://youtu.be/Wi3cV1asrOs?si=7zBJmWYrdgMoSQMr

Suggested GIF enhancement slots:
- `L4-03` intro emphasis
- `L4-08` transition accent
- `L4-14` WHY statement emphasis
- `L4-20` recap/CTA emphasis

When you upload GIFs, replace the matching slide image in Mortar as `type: image` (GIF file) at the same order index.
"@ | Set-Content -Path $placementPath -Encoding UTF8

Write-Host "Generated Lesson 4 migration pack:"
Write-Host " - $pptxPath"
Write-Host " - $pngDir (exported PPT PNGs)"
Write-Host " - $surveyMapPath"
Write-Host " - $placementPath"
