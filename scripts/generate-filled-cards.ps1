Param(
  [string]$OutputDir = "$(Resolve-Path "$PSScriptRoot/../src/assets/vectors/cards")",
  [switch]$CleanLegacy
)

# Usage examples:
#   pwsh ./scripts/generate-filled-cards.ps1
#   pwsh ./scripts/generate-filled-cards.ps1 -CleanLegacy
#   pwsh ./scripts/generate-filled-cards.ps1 -OutputDir ./out -CleanLegacy

Write-Host "Generating filled Dutch Blitz card SVGs into: $OutputDir" -ForegroundColor Cyan
if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir | Out-Null }

if ($CleanLegacy) {
  Write-Host "Cleaning legacy *_filled.svg and old PNG card assets..." -ForegroundColor Yellow
  # Remove any previously generated suffix-style filled SVGs and PNG fallbacks
  $patterns = @(
    'card_*_*_filled.svg',
    'card_red_*.png','card_green_*.png','card_blue_*.png','card_yellow_*.png'
  )
  foreach ($p in $patterns) {
    Get-ChildItem -Path $OutputDir -Filter $p -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne 'card_back.svg' } | ForEach-Object {
      Write-Host "Removing obsolete $_" -ForegroundColor DarkGray
      Remove-Item $_.FullName -ErrorAction SilentlyContinue
    }
  }
  Write-Host "Legacy cleanup complete." -ForegroundColor Yellow
}

$colors = @(
  @{ name='red';    base='#d63a3a'; dark='#b02222'; stroke='#7a1414'; text='#ffffff' },
  @{ name='green';  base='#25a04b'; dark='#1e7a39'; stroke='#145026'; text='#ffffff' },
  @{ name='blue';   base='#2d59d1'; dark='#1f3f94'; stroke='#142a54'; text='#ffffff' },
  @{ name='yellow'; base='#e3c132'; dark='#b69719'; stroke='#8a6808'; text='#ffffff' }
)

$width = 240
$height = 330
$centerYOffset = 12  # raise center number upward visually
$ringYOffset = 8     # raise ring slightly to match new number position

function New-CardSvg {
  param(
    [string]$ColorName,
    [int]$Value,
    [string]$Base,
    [string]$Dark,
    [string]$Stroke,
    [string]$TextColor
  )
  $id = "${ColorName}_${Value}_filled"
  $bottomY = $height - 44
  $centerY = ($height / 2) - $centerYOffset
  $ringY = ($height / 2) - $ringYOffset
  $valStr = $Value
  $cornerFontSize = 36
  $centerFontSize = 170
  @"
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 $width $height" width="$width" height="$height">
  <defs>
    <linearGradient id="grad_$id" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="$Base" />
      <stop offset="100%" stop-color="$Dark" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.35)" />
    </filter>
  </defs>
  <rect x="4" y="4" rx="24" ry="24" width="$( $width - 8 )" height="$( $height - 8 )" fill="url(#grad_$id)" stroke="$Stroke" stroke-width="8" filter="url(#shadow)" />
  <rect x="4" y="4" rx="24" ry="24" width="$( $width - 8 )" height="$( $height - 8 )" fill="rgba(255,255,255,0.06)" />
  <circle cx="$( $width / 2 )" cy="$ringY" r="92" fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="18" stroke-linecap="round" stroke-dasharray="24 18" />
  <g font-family="Arial, sans-serif" font-size="$cornerFontSize" font-weight="700" fill="$TextColor" stroke="rgba(0,0,0,0.25)" stroke-width="2" paint-order="stroke" text-anchor="middle">
    <text x="32" y="56">$valStr</text>
    <text x="$( $width - 32 )" y="$bottomY" transform="rotate(180 $( $width - 32 ) $bottomY)">$valStr</text>
  </g>
  <g font-family="Arial, sans-serif" font-size="$centerFontSize" font-weight="900" fill="$TextColor" stroke="rgba(0,0,0,0.45)" stroke-width="8" paint-order="stroke" text-anchor="middle" dominant-baseline="central">
    <text x="$( $width / 2 )" y="$centerY">$valStr</text>
  </g>
</svg>
"@
}

$generated = 0
$expectedFiles = @()
foreach ($c in $colors) {
  foreach ($v in 1..10) {
    $svg = New-CardSvg -ColorName $c.name -Value $v -Base $c.base -Dark $c.dark -Stroke $c.stroke -TextColor $c.text
    $file = Join-Path $OutputDir "card_$($c.name)_$v.svg"
    $expectedFiles += $file
    $svg | Set-Content -Path $file -Encoding UTF8
    $generated++
  }
}

# Validation
$missing = @()
foreach ($f in $expectedFiles) { if (-not (Test-Path $f)) { $missing += $f } }
Write-Host "Generated $generated filled card SVGs." -ForegroundColor Green
if ($missing.Count -gt 0) {
  Write-Host "WARNING: Missing $($missing.Count) expected files:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  Write-Host "Check interpolation syntax or file permissions." -ForegroundColor Red
  exit 1
}
Write-Host "All expected card SVGs present." -ForegroundColor Green
Write-Host "Done." -ForegroundColor Cyan
