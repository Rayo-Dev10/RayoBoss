<?php
declare(strict_types=1);
define('RB_APP', true);
require __DIR__.'/core/runtime.php';
rb_headers(true);
header('Content-Type: text/html; charset=utf-8');
require __DIR__.'/core/player.php';
