<?php
declare(strict_types=1);
define('RB_APP', true);
require __DIR__.'/core/runtime.php';
rb_headers();
if (isset($_GET['health'])) { rb_json(['ok'=>true,'version'=>RB_VERSION,'deployment'=>'stackcp','authenticationReady'=>is_file(__DIR__.'/private/config.php'),'runtime'=>['php'=>PHP_VERSION,'sapi'=>PHP_SAPI,'scryptAvailable'=>function_exists('sodium_crypto_pwhash_scryptsalsa208sha256_str_verify')]]); exit; }
if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET','HEAD'], true)) { http_response_code(405); header('Allow: GET, HEAD'); exit; }
header('Content-Type: text/html; charset=utf-8');
require __DIR__.'/core/panel.php';
