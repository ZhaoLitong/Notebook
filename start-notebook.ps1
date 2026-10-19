$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot

try {
  $node = (Get-Command node.exe -ErrorAction Stop).Source
  $npm = (Get-Command npm.cmd -ErrorAction Stop).Source

  if (-not (Test-Path (Join-Path $project 'node_modules\typescript\bin\tsc'))) {
    Write-Host 'Installing dependencies...'
    Push-Location $project
    try {
      & $npm install
      if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
    } finally { Pop-Location }
  }

  Write-Host 'Building Notebook...'
  Push-Location $project
  try {
    & $npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
  } finally { Pop-Location }

  $port = $null
  for ($candidate = 3000; $candidate -le 3100; $candidate++) {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::IPv6Any, $candidate)
    $listener.Server.DualMode = $true
    try {
      $listener.Start()
      $listener.Stop()
      $port = $candidate
      break
    } catch { $listener.Stop() }
  }
  if (-not $port) { throw 'No available port was found between 3000 and 3100.' }

  $url = "http://localhost:$port"
  $env:PORT = [string]$port
  $server = Start-Process -FilePath $node -ArgumentList 'dist/server.js' -WorkingDirectory $project -WindowStyle Hidden -PassThru
  Write-Host "Starting Notebook at $url (server process $($server.Id))..."

  $ready = $false
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    if ($server.HasExited) { throw "Server exited before $url became ready." }
    try {
      $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1
      if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch { Start-Sleep -Milliseconds 500 }
  }
  if (-not $ready) { throw "Server did not become ready at $url." }

  $chromeCommand = Get-Command chrome.exe -ErrorAction SilentlyContinue
  $chrome = if ($chromeCommand) { $chromeCommand.Source } else { $null }
  if (-not $chrome) {
    foreach ($folder in @($env:ProgramFiles, [Environment]::GetEnvironmentVariable('ProgramFiles(x86)'), $env:LOCALAPPDATA)) {
      if (-not $folder) { continue }
      $candidate = Join-Path $folder 'Google\Chrome\Application\chrome.exe'
      if (Test-Path $candidate) { $chrome = $candidate; break }
    }
  }
  if (-not $chrome) { throw "Google Chrome was not found. Open $url manually." }

  Start-Process -FilePath $chrome -ArgumentList @('--new-tab', $url)
  Write-Host "Opened $url in Chrome."
} catch {
  Write-Error $_
  exit 1
}
