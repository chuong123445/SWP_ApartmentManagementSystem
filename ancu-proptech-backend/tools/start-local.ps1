$ErrorActionPreference = 'Stop'
$taskBackendRoot = Split-Path $PSScriptRoot -Parent
$taskEnvFile = Join-Path $taskBackendRoot '.env.local'
if (Test-Path -LiteralPath $taskEnvFile) {
    foreach ($taskEnvLine in [IO.File]::ReadAllLines($taskEnvFile)) {
        if ($taskEnvLine.TrimStart().StartsWith('#') -or -not $taskEnvLine.Contains('=')) { continue }
        $taskEnvPair = $taskEnvLine.Split('=', 2)
        [Environment]::SetEnvironmentVariable($taskEnvPair[0].Trim(), $taskEnvPair[1], 'Process')
    }
}
Push-Location $taskBackendRoot
try {
    & mvn.cmd spring-boot:run '-Dspring-boot.run.profiles=local'
    if ($LASTEXITCODE -ne 0) { throw 'Backend failed to start.' }
} finally { Pop-Location }
