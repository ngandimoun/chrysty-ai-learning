$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..

$defaults = @{
  MOONSHOT_BASE_URL = 'https://api.moonshot.ai/v1'
  KIMI_MODEL_LEARN = 'kimi-k2.6'
  KIMI_MODEL_THINK = 'kimi-k2.6'
  KIMI_MODEL_PRACTICE = 'kimi-k2.6'
  KIMI_MODEL_PRACTICE_CODE = 'kimi-k2.7-code'
  KIMI_FORMULAS_LEARN = 'web-search,fetch'
  KIMI_FORMULAS_THINK = 'web-search,rethink'
  KIMI_FORMULAS_GENERATE = 'web-search'
  KIMI_MAX_TOOL_ROUNDS = '5'
}

$required = @(
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MOONSHOT_API_KEY',
  'MOONSHOT_BASE_URL',
  'KIMI_MODEL_LEARN',
  'KIMI_MODEL_THINK',
  'KIMI_MODEL_PRACTICE',
  'KIMI_MODEL_PRACTICE_CODE',
  'KIMI_FORMULAS_LEARN',
  'KIMI_FORMULAS_THINK',
  'KIMI_FORMULAS_PRACTICE',
  'KIMI_FORMULAS_GENERATE',
  'KIMI_MAX_TOOL_ROUNDS'
)

$optional = @('GEMINI_API_KEY', 'GEMINI_MODEL_TRANSCRIBE', 'ADMIN_SECRET', 'FAL_KEY')

$fromFile = @{}
foreach ($line in Get-Content .env.local) {
  $t = $line.Trim()
  if (-not $t -or $t.StartsWith('#')) { continue }
  $i = $t.IndexOf('=')
  if ($i -lt 1) { continue }
  $k = $t.Substring(0, $i).Trim()
  $v = $t.Substring($i + 1).Trim()
  if ($v) { $fromFile[$k] = $v }
}

function Set-VercelEnv([string]$Key, [string]$Value, [bool]$Required) {
  Write-Host "Setting $Key (production)..."
  & npx --yes vercel@latest env add $Key production --value $Value --force --yes
  if ($LASTEXITCODE -ne 0) {
    if ($Required) { throw "Failed to set $Key" }
    Write-Warning "Skipped optional $Key"
  }
}

foreach ($key in $required) {
  $value = if ($fromFile.ContainsKey($key)) { $fromFile[$key] } else { $defaults[$key] }
  if ([string]::IsNullOrWhiteSpace($value)) { throw "Missing required value for $key" }
  Set-VercelEnv $key $value $true
}

foreach ($key in $optional) {
  if (-not $fromFile.ContainsKey($key)) { continue }
  $value = $fromFile[$key]
  if ([string]::IsNullOrWhiteSpace($value)) { continue }
  Set-VercelEnv $key $value $false
}

Write-Host 'Done.'
