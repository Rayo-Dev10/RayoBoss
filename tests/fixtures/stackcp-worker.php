<?php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('RB_APP',true);
require $argv[1].'/core/runtime.php';
for($i=0;$i<10;$i++) {
    $store=new FileState();
    $count=$store->data['testCounter']??0;
    usleep(10000);
    $store->data['testCounter']=$count+1;
    $store->close();
}
