param([string]$Database='ancu_account_roles_20261103')
$ErrorActionPreference='Stop'
# Compatibility entrypoint; reuse the existing isolated DB rather than create more DBs.
& (Join-Path $PSScriptRoot 'verify-role-catalog.ps1') -Database $Database
