$ErrorActionPreference = 'Stop'
$OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Set-Location (Split-Path $PSScriptRoot -Parent)
$keyPath = Join-Path $env:USERPROFILE '.ssh/id_ed25519'
$sshTarget = 'rayogestion.com@ssh.us.stackcp.com'
$sshOptions = @('-i', $keyPath, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=30')
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
$expectedFiles = @($manifest.files.PSObject.Properties.Name) + @('manifest.json')
foreach ($file in $expectedFiles) {
    if ($file -notmatch '^[a-zA-Z0-9/_.-]+$' -or $file.Contains('..') -or $file.StartsWith('private/')) { throw 'Nombre de archivo no permitido.' }
    if ((Get-Item -LiteralPath (Join-Path $artifact $file)).LinkType) { throw 'Enlace local no autorizado.' }
    $actualHash = (Get-FileHash (Join-Path $artifact $file) -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($file -ne 'manifest.json' -and $actualHash -ne $manifest.files.$file) { throw "Integridad local incorrecta: $file" }
}
foreach ($item in Get-ChildItem -LiteralPath $artifact -Recurse) {
    if ($item.LinkType) { throw 'Enlace local no autorizado.' }
    if ($item.PSIsContainer -and $item.Name -notin @('core','css','js','media')) { throw 'Directorio no autorizado en el artefacto.' }
    if (-not $item.PSIsContainer) {
        $relative = $item.FullName.Substring($artifact.Length + 1).Replace('\','/')
        if ($relative -notin $expectedFiles) { throw "Archivo ajeno al manifiesto: $relative" }
    }
}
# El destino absoluto fue confirmado por SSH. Fallar si cambia o contiene enlaces.
$guard = @'
set -eu
target="$HOME/public_html/radio"
test -d "$target"
test ! -L "$target"
test "$(realpath "$target")" = "/home/sites/42b/e/e52161a3c2/public_html/radio"
for dir in core css js media private; do
  test ! -L "$target/$dir"
  if test -e "$target/$dir"; then test -d "$target/$dir"; fi
done
test ! -L "$target/private/config.php"
test ! -e "$target/index.html"
'@
$pathChecks = ($expectedFiles | ForEach-Object { "test ! -L `"`$target/$_`"" }) -join "`n"
$guard = $guard + "`n" + $pathChecks + "`n"
$preflight = $guard + "`nif test -f `"`$target/private/config.php`"; then echo CONFIG_EXISTS; else echo CONFIG_NEEDED; fi`n"
$remoteState = $preflight | ssh @sshOptions $sshTarget "tr -d '\r' | bash -e -s"
if ($LASTEXITCODE -ne 0) { throw 'Destino no seguro o existe index.html que puede ocultar la portada; no se transfirió nada.' }
if ($remoteState -contains 'CONFIG_NEEDED') {
    node scripts/prepare-stackcp-config.js
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar la configuración.' }
    $prepare = $guard + "`numask 077`nmkdir -p `"`$target/private`"`nchmod 700 `"`$target/private`"`ntest ! -e `"`$target/private/config.php`"`n"
    $prepare | ssh @sshOptions $sshTarget "tr -d '\r' | bash -e -s"
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar el directorio privado.' }
    scp @sshOptions 'data/stackcp-deploy/config.php' "${sshTarget}:/home/sites/42b/e/e52161a3c2/public_html/radio/private/config.php"
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo transferir la configuración.' }
    ssh @sshOptions $sshTarget 'chmod 600 ~/public_html/radio/private/config.php'
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron proteger los permisos.' }
}
# El contenido recursivo fue contrastado con el manifiesto; no incluye datos privados.
$localFiles = Get-ChildItem -LiteralPath $artifact | Where-Object { $_.Name -ne 'index.php' } | ForEach-Object { $_.FullName }
scp @sshOptions -r @localFiles "${sshTarget}:/home/sites/42b/e/e52161a3c2/public_html/radio/"
if ($LASTEXITCODE -ne 0) { throw 'Transferencia incompleta; verificar archivos antes de continuar.' }
$checks = foreach ($file in $expectedFiles | Where-Object { $_ -ne 'index.php' }) {
    $hash = (Get-FileHash (Join-Path $artifact $file) -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  $file"
}
$lint = ($expectedFiles | Where-Object { $_.EndsWith('.php') -and $_ -ne 'index.php' } | ForEach-Object { "php -l '$_'" }) -join "`n"
$verification = $guard + "`ncd `"`$target`"`nsha256sum -c <<'HASHES'`n" + ($checks -join "`n") + "`nHASHES`n" + $lint + "`n"
$verification | ssh @sshOptions $sshTarget "tr -d '\r' | bash -e -s"
if ($LASTEXITCODE -ne 0) { throw 'Falló la verificación remota.' }
scp @sshOptions (Join-Path $artifact 'index.php') "${sshTarget}:/home/sites/42b/e/e52161a3c2/public_html/radio/index.php"
if ($LASTEXITCODE -ne 0) { throw 'No se pudo activar la portada.' }
$indexHash = (Get-FileHash (Join-Path $artifact 'index.php') -Algorithm SHA256).Hash.ToLowerInvariant()
$finalCheck = $guard + "`ncd `"`$target`"`necho '$indexHash  index.php' | sha256sum -c`nphp -l index.php`n"
$finalCheck | ssh @sshOptions $sshTarget "tr -d '\r' | bash -e -s"
if ($LASTEXITCODE -ne 0) { throw 'Falló la verificación final.' }
Write-Output "Archivos verificados en radio/. Commit publicado: $commit"
