param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot
$logDir = Join-Path $projectRoot '.local-logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Test-Port([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try { return $client.ConnectAsync('127.0.0.1', $Port).Wait(500) -and $client.Connected }
    catch { return $false }
    finally { $client.Dispose() }
}
function Wait-Ready([scriptblock]$Check, [string]$Name, [int]$Seconds = 120) {
    $deadline = (Get-Date).AddSeconds($Seconds)
    do {
        try { if (& $Check) { return } } catch {}
        Start-Sleep -Milliseconds 750
    } while ((Get-Date) -lt $deadline)
    throw "$Name chua san sang. Xem log tai $logDir"
}
function Start-Node([string]$Name, [string]$Directory, [string[]]$NodeArgs) {
    Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList $NodeArgs -WorkingDirectory $Directory -WindowStyle Hidden -RedirectStandardOutput "$logDir/$Name.log" -RedirectStandardError "$logDir/$Name.error.log" | Out-Null
}
try {
    foreach ($file in @('mobile/node_modules/expo/bin/cli', 'server/node_modules/tsx/dist/cli.mjs')) {
        if (!(Test-Path $file)) { throw 'Thieu dependencies. Chay npm ci; npm --prefix mobile ci; npm --prefix server ci.' }
    }
    $node = Get-Command node.exe -ErrorAction Stop
    # Read the same DB/PORT configuration as the API, without printing credentials.
    $dbConfig = (& $node.Source -e "require('./server/node_modules/dotenv').config({path:'server/.env'}); console.log(JSON.stringify({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT)||3306,apiPort:Number(process.env.PORT)||4000}))" | Select-Object -Last 1) | ConvertFrom-Json
    if ($dbConfig.host -in @('127.0.0.1','localhost') -and !(Test-Port $dbConfig.port)) {
        $mysqlRoots = @($env:VQ_XAMPP_HOME, 'D:/XAMPP', 'C:/xampp') | Where-Object { $_ }
        $xampp = $mysqlRoots | Where-Object { Test-Path (Join-Path $_ 'mysql/bin/mysqld.exe') } | Select-Object -First 1
        if (!$xampp) { throw 'Hay bat MySQL. Neu dung XAMPP o noi khac, dat bien VQ_XAMPP_HOME.' }
        Write-Host 'Dang bat MySQL...'
        $mysqlIni = Join-Path $xampp 'mysql/bin/my.ini'
        Start-Process -FilePath (Join-Path $xampp 'mysql/bin/mysqld.exe') -ArgumentList "--defaults-file=`"$mysqlIni`"", '--standalone' -WorkingDirectory $xampp -WindowStyle Hidden | Out-Null
        Wait-Ready { Test-Port $dbConfig.port } 'MySQL' 30
    }
    $apiPort = $dbConfig.apiPort
    if (!(Test-Port $apiPort)) {
        Write-Host 'Dang bat API...'
        Start-Node 'api' "$projectRoot/server" @('node_modules/tsx/dist/cli.mjs', 'watch', 'src/server.ts')
    }
    Wait-Ready { (Invoke-RestMethod "http://localhost:$apiPort/api/health" -TimeoutSec 5).success -eq $true } 'API / database' 40
    if (!(Test-Port 8081)) {
        Write-Host 'Dang bat web tu mobile/...'
        Start-Node 'web' "$projectRoot/mobile" @('node_modules/expo/bin/cli', 'start', '--web', '--port', '8081')
    }
    Wait-Ready {
        $html = (Invoke-WebRequest 'http://localhost:8081' -UseBasicParsing -TimeoutSec 5).Content
        if ($html -notmatch '<title>VQ FRUIT</title>') { return $false }
        return $html -match 'expo-router/entry'
    } 'Web VQ FRUIT (cong 8081 co the dang bi ung dung khac chiem)'
    Write-Host 'Dang kiem tra bundle...'
    $bundle = Invoke-WebRequest 'http://localhost:8081/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app' -UseBasicParsing -TimeoutSec 180
    if ($bundle.StatusCode -ne 200 -or $bundle.Content -notmatch '__BUNDLE_START_TIME__') { throw 'Web bundle bi loi. Xem log web.' }
    Write-Host 'VQ FRUIT san sang: http://localhost:8081'
    if (!$NoBrowser) { Start-Process 'http://localhost:8081' }
    exit 0
} catch {
    Write-Host "Khong the mo web: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
