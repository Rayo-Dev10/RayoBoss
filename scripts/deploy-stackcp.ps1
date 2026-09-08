$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$keyPath = Join-Path $env:USERPROFILE '.ssh/id_ed25519'
$sshTarget = 'rayogestion.com@ssh.us.stackcp.com'
$sshOptions = @('-i', $keyPath, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20')
if ((git branch --show-current).Trim() -ne 'main') { throw 'El despliegue requiere main.' }
if (git status --porcelain) { throw 'Hay cambios locales pendientes de commit.' }
$commit = (git rev-parse HEAD).Trim()
$remoteResult = git ls-remote origin refs/heads/main
if ($LASTEXITCODE -ne 0) { throw 'No se pudo verificar origin/main.' }
if (($remoteResult -split '\s+')[0] -ne $commit) { throw 'HEAD no coincide con main publicado. Hacer push antes de desplegar.' }
node scripts/build-stackcp.js
if ($LASTEXITCODE -ne 0) { throw 'Build StackCP fallido.' }
$artifact = Join-Path (Get-Location) 'dist/stackcp'
$manifest = Get-Content (Join-Path $artifact 'manifest.json') -Raw | ConvertFrom-Json
$expectedFiles = @('index.php', 'login.css', 'manifest.json')
foreach ($file in @('index.php', 'login.css')) {
    $actualHash = (Get-FileHash (Join-Path $artifact $file) -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne $manifest.files.$file) { throw "Integridad local incorrecta: $file" }
}
# El destino absoluto fue confirmado por SSH. Fallar si cambia o contiene enlaces.
$guard = @'
set -eu
target="$HOME/public_html/radio"
test -d "$target"
test ! -L "$target"
test "$(realpath "$target")" = "/home/sites/42b/e/e52161a3c2/public_html/radio"
for name in index.php login.css manifest.json; do
  test ! -L "$target/$name"
  if test -e "$target/$name"; then test -f "$target/$name"; fi
done
test ! -e "$target/index.html"
'@
$guard | ssh @sshOptions $sshTarget "tr -d '\r' | bash -s"
if ($LASTEXITCODE -ne 0) { throw 'Destino no seguro o existe index.html que puede ocultar la portada; no se transfirió nada.' }
# Lista cerrada, sin recursión, sin borrados, sin secretos.
$localFiles = $expectedFiles | ForEach-Object { Join-Path $artifact $_ }
scp @sshOptions @localFiles "${sshTarget}:/home/sites/42b/e/e52161a3c2/public_html/radio/"
if ($LASTEXITCODE -ne 0) { throw 'Transferencia incompleta; verificar archivos antes de continuar.' }
$checks = foreach ($file in $expectedFiles) {
    $hash = (Get-FileHash (Join-Path $artifact $file) -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  $file"
}
$verification = $guard + "`ncd `"`$target`"`nsha256sum -c <<'HASHES'`n" + ($checks -join "`n") + "`nHASHES`nphp -l index.php`n"
$verification | ssh @sshOptions $sshTarget "tr -d '\r' | bash -s"
if ($LASTEXITCODE -ne 0) { throw 'Falló la verificación remota.' }
Write-Output "Archivos verificados en radio/. Commit publicado: $commit"
