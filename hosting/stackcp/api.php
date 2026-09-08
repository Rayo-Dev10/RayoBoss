<?php
declare(strict_types=1);
define('RB_APP',true);
require __DIR__.'/core/runtime.php';
rb_headers();
foreach(['auth','storage','media','programming','rtc','public','musicbrainz'] as $module)require __DIR__.'/core/'.$module.'.php';
$store=null;
try {
    $route=$_GET['route']??'';$method=$_SERVER['REQUEST_METHOD']??'GET';
    if(!is_string($route)||!preg_match('#^/[a-zA-Z0-9/_.-]+$#D',$route))rb_error(404,'Ruta no encontrada.');
    if($route==='/health'&&$method==='GET'){rb_json(['ok'=>true,'name'=>'RayoBoss','version'=>RB_VERSION,'mode'=>'stackcp','time'=>rb_iso()]);exit;}
    rb_origin();$body=rb_body();$store=new FileState();$s=&$store->data;
    if($route==='/media/musicbrainz/search'&&$method==='GET'){rb_actor($s,['desarrollador','administrador']);$store->close();rb_json(rb_musicbrainz($_GET));exit;}
    $result=null;
    foreach(['rb_auth_route','rb_media_route','rb_program_route','rb_live_route','rb_public_route'] as $handler){$result=$handler($route,$method,$body,$s);if($result!==null)break;}
    if($result===null)rb_error(404,'Ruta no encontrada.');
    $store->close();
    if(isset($result['_file'])){(new ProtectedDiskStorage())->stream($result['_file']);exit;}
    if(isset($result['_redirect'])){header('Location: '.$result['_redirect'],true,307);exit;}
    if(isset($result['_empty'])){http_response_code(204);exit;}
    if(isset($result['_csv'])){
        header('Content-Type: text/csv; charset=utf-8');header('Content-Disposition: attachment; filename="rayoboss-reproducciones-'.$result['_csv']['month'].'.csv"');$out=fopen('php://output','wb');fwrite($out,"\xEF\xBB\xBF");
        $keys=['title','artist','album','isrc','category','licenseType','rightsBasis','rightsReference','plays','totalSeconds','firstPlayedAt','lastPlayedAt'];fputcsv($out,['Título','Artista','Álbum','ISRC','Categoría','Licencia','Base de derechos','Referencia','Reproducciones','Segundos','Primera reproducción','Última reproducción'], ',', '"', '');
        foreach($result['_csv']['items'] as $item){$row=[];foreach($keys as $k){$v=(string)($item[$k]??'');if(preg_match('/^[=+@-]/',$v))$v="'".$v;$row[]=$v;}fputcsv($out,$row, ',', '"', '');}fclose($out);exit;
    }
    rb_json($result);
} catch(Throwable $e) {
    $code=$e->getCode();$status=is_int($code)&&$code>=400&&$code<600?$code:500;
    if($store && $status<500){try{$store->close();}catch(Throwable $ignored){$status=503;}}
    if ($status >= 500) error_log('RayoBoss: fallo en '.basename($e->getFile()).':'.$e->getLine());
    http_response_code($status);rb_json(['error'=>$status<500?$e->getMessage():'No se pudo completar la operación. Revisa el diagnóstico del servidor.']);
}
