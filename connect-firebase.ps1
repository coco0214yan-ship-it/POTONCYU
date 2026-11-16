$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$potonchuNode = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $potonchuNode) {
    $potonchuNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
}
$potonchuCli = Join-Path $PSScriptRoot '.tools\node_modules\firebase-tools\lib\bin\firebase.js'
if (-not (Test-Path -LiteralPath $potonchuCli)) {
    Write-Host 'Firebaseの道具が見つかりません。Codexに戻って教えてください。'
    exit 1
}

$potonchuCheck = & $potonchuNode $potonchuCli projects:list --json --non-interactive 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host 'Firebaseにログイン済みです。Codexに戻り「Firebaseログインできた」と送ってください。'
    exit 0
}

Write-Host ''
Write-Host '1. 下に出るURLをコピーし、ブラウザで開いてください。'
Write-Host '2. ぽとんちゅを作ったGoogleアカウントでログインしてください。'
Write-Host '3. 表示された認証コードを、この画面に貼り付けてください。チャットには貼らないでください。'
Write-Host ''
& $potonchuNode $potonchuCli login --no-localhost
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$potonchuCode = Read-Host '認証コード（入力は画面に表示されません）' -AsSecureString
$potonchuPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($potonchuCode)
try {
    $potonchuPlainCode = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($potonchuPointer)
    if ([string]::IsNullOrWhiteSpace($potonchuPlainCode)) { exit 1 }
    $potonchuLoginResult = & $potonchuNode $potonchuCli login $potonchuPlainCode --json 2>$null
    $potonchuExit = $LASTEXITCODE
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($potonchuPointer)
    $potonchuPlainCode = $null
    $potonchuLoginResult = $null
}

if ($potonchuExit -eq 0) {
    Write-Host 'Firebaseログインが完了しました。Codexに戻り「Firebaseログインできた」と送ってください。'
} else {
    Write-Host 'ログインが完了しませんでした。Codexに戻って教えてください。認証コードはチャットに貼らないでください。'
}
exit $potonchuExit
