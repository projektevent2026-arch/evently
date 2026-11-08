$ErrorActionPreference = "Stop"
$root = (Get-Location).Path

$files = @()
$files += Get-ChildItem -Path "app\api" -Recurse -Filter "route.ts" -File

$names = @(
  "proxy.ts",
  "next.config.ts", "next.config.js", "next.config.mjs",
  "lib\rateLimit.ts", "lib\verifyOrigin.ts", "lib\supabaseAdmin.ts", "lib\requireStaff.ts",
  "lib\getEventWithDates.ts", "lib\publishedFilter.ts"
)
foreach ($n in $names) {
  if (Test-Path -LiteralPath $n) { $files += Get-Item -LiteralPath $n }
}

if (Test-Path -LiteralPath "supabase\migrations") {
  $files += Get-ChildItem -LiteralPath "supabase\migrations" -Filter "*.sql" -File
}

$sb = New-Object System.Text.StringBuilder
foreach ($f in $files) {
  $rel = $f.FullName.Substring($root.Length + 1)
  [void]$sb.AppendLine("=== " + $rel + " ===")
  [void]$sb.AppendLine((Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8))
  [void]$sb.AppendLine("")
}

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $root "review.txt"), $sb.ToString(), $enc)
Write-Host ("Zebrano plikow: " + $files.Count)