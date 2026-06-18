$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$lines = Get-Content '.env.local' | Where-Object { $_ -match '^\s*[^#]' -and $_ -match '=' }
$extra = @{
  'MOONSHOT_BASE_URL' = 'https://api.moonshot.ai/v1'
  'KIMI_MODEL_LEARN' = 'kimi-k2.6'
  'KIMI_MODEL_THINK' = 'kimi-k2.6'
  'KIMI_MODEL_PRACTICE' = 'kimi-k2.6'
  'KIMI_MODEL_PRACTICE_CODE' = 'kimi-k2.7-code'
  'KIMI_FORMULAS_LEARN' = 'web-search,fetch'
  'KIMI_FORMULAS_THINK' = 'web-search,rethink'
  'KIMI_FORMULAS_GENERATE' = 'web-search'
  'KIMI_MAX_TOOL_ROUNDS' = '5'
}

$vars = @{}
foreach ($line in $lines) {
  $idx = $line.IndexOf('=')
  if ($idx -lt 1) { continue }
  $key = $line.Substring(0, $idx).Trim()
  $val = $line.Substring($idx + 1).Trim()
  if ($val) { $vars[$key] = $val }
}
foreach ($entry in $extra.GetEnumerator()) {
  if (-not $vars.ContainsKey($entry.Key)) {
    $vars[$entry.Key] = $entry.Value
  }
}

$environments = @('production', 'preview', 'development')
foreach ($entry in $vars.GetEnumerator()) {
  if ($entry.Key -eq 'CHRYSTY_API_URL') { continue }
  foreach ($envName in $environments) {
    Write-Host "Setting $($entry.Key) ($envName)..."
    $entry.Value | npx vercel@latest env add $entry.Key $envName --yes 2>&1 | Out-Null
  }
}
