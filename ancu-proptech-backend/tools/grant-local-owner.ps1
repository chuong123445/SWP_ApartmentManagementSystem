# Chạy cho SQL Server local sau khi tài khoản đã đăng nhập ít nhất một lần.
param([Parameter(Mandatory)][string]$Email)
$ErrorActionPreference='Stop'
$Email=$Email.Trim().ToLowerInvariant()
if($Email.Length -gt 254 -or $Email -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$'){throw 'Email không hợp lệ.'}
$taskRoot=Split-Path $PSScriptRoot -Parent
$taskSettings=@{}
foreach($taskFile in @('src/main/resources/application.properties','.env.local')) {
    foreach($taskLine in [IO.File]::ReadAllLines((Join-Path $taskRoot $taskFile))) {
        if($taskLine -match '^([^#=]+)=(.*)$') {$taskSettings[$matches[1].Trim()]=$matches[2]}
    }
}
function Resolve-TaskSetting([string]$Value) {
    if($Value -match '^\$\{([^:}]+):([^}]*)\}$') {
        $taskName=$matches[1];$taskFallback=$matches[2]
        $taskEnvironment=[Environment]::GetEnvironmentVariable($taskName)
        if($taskEnvironment){return $taskEnvironment}
        if($taskSettings.ContainsKey($taskName)){return $taskSettings[$taskName]}
        return $taskFallback
    }
    return $Value
}
$taskBuilder=New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$taskBuilder['Data Source']='localhost,1433'
$taskBuilder['Initial Catalog']='proptech_db'
$taskBuilder['User ID']=Resolve-TaskSetting $taskSettings['spring.datasource.username']
$taskBuilder['Password']=Resolve-TaskSetting $taskSettings['spring.datasource.password']
$taskBuilder['Encrypt']=$true
$taskBuilder['TrustServerCertificate']=$true
$taskBuilder['Connect Timeout']=5
$taskConnection=New-Object System.Data.SqlClient.SqlConnection $taskBuilder.ConnectionString
try {
    $taskConnection.Open()
    $command=$taskConnection.CreateCommand()
    $command.CommandText=@"
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;
DECLARE @accountId bigint;
SELECT @accountId=id FROM dbo.auth_accounts WITH (UPDLOCK,HOLDLOCK) WHERE email=@email AND status='ACTIVE';
IF @accountId IS NULL THROW 51000,N'Tài khoản chưa có hoặc chưa hoạt động trong database local.',1;
IF EXISTS (SELECT 1 FROM dbo.auth_account_roles ar JOIN dbo.auth_roles r ON r.id=ar.role_id WHERE ar.account_id=@accountId AND r.code='ADMIN')
    THROW 51000,N'Tài khoản Admin cần được quản lý riêng.',1;
IF (SELECT COUNT(*) FROM dbo.auth_roles WHERE code IN ('CUSTOMER','OWNER'))<>2
    THROW 51000,N'Database chưa có danh mục quyền cần thiết.',1;
INSERT dbo.auth_account_roles(account_id,role_id)
SELECT @accountId,r.id FROM dbo.auth_roles r
WHERE r.code IN ('CUSTOMER','OWNER')
AND NOT EXISTS (SELECT 1 FROM dbo.auth_account_roles ar WHERE ar.account_id=@accountId AND ar.role_id=r.id);
UPDATE dbo.auth_accounts SET role='OWNER',version=version+1 WHERE id=@accountId AND role<>'OWNER';
COMMIT;
SELECT r.code AS role FROM dbo.auth_account_roles ar JOIN dbo.auth_roles r ON r.id=ar.role_id WHERE ar.account_id=@accountId ORDER BY r.code;
"@
    $parameter=$command.Parameters.Add('@email',[Data.SqlDbType]::NVarChar,254)
    $parameter.Value=$Email
    $roles=New-Object Data.DataTable
    $roles.Load($command.ExecuteReader())
    $roles | Select-Object role
} finally {
    $taskConnection.Dispose()
}
