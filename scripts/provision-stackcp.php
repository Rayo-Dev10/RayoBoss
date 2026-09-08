<?php
// Herramienta exclusivamente local. No incluir en el artefacto público.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
try {
    $input = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($input) || strlen($input['password'] ?? '') < 12 || strlen($input['secret'] ?? '') < 32 || !preg_match('#^https?://[a-z0-9.:-]+$#iD', $input['origin'] ?? '')) throw new RuntimeException('Configuración inválida.');
    if (!function_exists('sodium_crypto_pwhash_scryptsalsa208sha256_str')) throw new RuntimeException('PHP local requiere Sodium.');
    $config = ['secret'=>$input['secret'], 'origin'=>$input['origin'], 'devHash'=>sodium_crypto_pwhash_scryptsalsa208sha256_str($input['password'], SODIUM_CRYPTO_PWHASH_SCRYPTSALSA208SHA256_OPSLIMIT_INTERACTIVE, SODIUM_CRYPTO_PWHASH_SCRYPTSALSA208SHA256_MEMLIMIT_INTERACTIVE)];
    $target=$argv[1]??'';
    if (!is_dir(dirname($target)) || file_exists($target) || is_link($target)) throw new RuntimeException('El archivo de destino debe ser nuevo.');
    $source="<?php\nif (!defined('RB_APP')) { http_response_code(404); exit; }\nreturn ".var_export($config,true).";\n";
    $handle=fopen($target,'xb'); if(!$handle)throw new RuntimeException('No se pudo crear la configuración.');
    fwrite($handle,$source);fclose($handle);chmod($target,0600);
    echo "Configuración protegida creada. No contiene la contraseña en texto plano.\n";
} catch(Throwable $error) { fwrite(STDERR,"No se pudo aprovisionar la configuración.\n"); exit(1); }
