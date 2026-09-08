<?php
if (!defined('RB_APP')) { http_response_code(404); exit; }
function rb_record(array &$s,array $item,string $source,string $key='',string $at=''): array {
    foreach($s['events'] as $e)if($key!==''&&$e['playoutKey']===$key)return ['recorded'=>false];
    $e=['id'=>rb_id(),'playoutKey'=>$key?:'manual:'.rb_id(),'playedAt'=>$at?:rb_iso(),'source'=>$source,'recordedBy'=>'sistema','itemId'=>$item['id'],'licenseType'=>$item['rights']['licenseType']??'pendiente','rightsBasis'=>$item['rights']['basis']??'','rightsReference'=>$item['rights']['reference']??'','licenseDocument'=>!empty($item['rights']['document'])];
    foreach(['title','artist','album','isrc','category','kind','durationSeconds'] as $k)$e[$k]=$item[$k]??'';
    $s['events'][]=$e;$cutoff=strtotime('-36 months');$s['events']=array_slice(array_values(array_filter($s['events'],function($e)use($cutoff){return strtotime($e['playedAt'])>=$cutoff;})),-100000);
    return ['recorded'=>true];
}
function rb_report(array $s,string $month): array {
    if(!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/D',$month))rb_error(400,'Mes inválido.');
    $events=array_values(array_filter($s['events'],function($e)use($month){return substr($e['playedAt'],0,7)===$month;}));$groups=[];$seconds=0;$license=[];
    foreach($events as $e){$key=$e['itemId'].'|'.$e['licenseType'];if(!isset($groups[$key]))$groups[$key]=array_merge($e,['plays'=>0,'totalSeconds'=>0,'firstPlayedAt'=>$e['playedAt']]);$groups[$key]['plays']++;$groups[$key]['totalSeconds']+=(float)$e['durationSeconds'];$groups[$key]['lastPlayedAt']=$e['playedAt'];$seconds+=(float)$e['durationSeconds'];$license[$e['licenseType']]=($license[$e['licenseType']]??0)+1;}
    $rows=array_values($groups);usort($rows,function($a,$b){return $b['plays']<=>$a['plays'];});
    return ['month'=>$month,'generatedAt'=>rb_iso(),'totals'=>['plays'=>count($events),'uniquePieces'=>count($rows),'totalSeconds'=>$seconds,'byLicense'=>(object)$license],'items'=>$rows,'events'=>array_reverse(array_slice($events,-5000)),'licenseTypes'=>rb_seed()['licenseTypes']];
}
function rb_public_route(string $r,string $m,array $b,array &$s) {
    if(strpos($r,'/reports/')===0){$a=rb_actor($s,['desarrollador','administrador','locutor']);
        if(($r==='/reports/playback'||$r==='/reports/playback.csv')&&$m==='GET'){$report=rb_report($s,$_GET['month']??gmdate('Y-m'));return $r==='/reports/playback.csv'?['_csv'=>$report]:$report;}
        if($r==='/reports/playback/record'&&$m==='POST'){if(!$s['live']||!in_array($b['source']??'', ['live-effect','live-bed','live-media'],true))rb_error(400,'Reproducción fuera de un vivo o fuente inválida.');foreach($s['media'] as $item)if($item['id']===($b['itemId']??'')&&$item['active'])return array_merge(['ok'=>true],rb_record($s,$item,$b['source']));rb_error(404,'Pieza no encontrada.');}
    }
    if(strpos($r,'/public/')!==0)return null;
    $root=rtrim(rb_config()['origin'],'/').'/';$embed=$root.'embed.php?autoplay=1';
    if($r==='/public/embed-code'&&$m==='GET')return ['url'=>$embed,'iframe'=>'<iframe src="'.$embed.'" allow="autoplay; fullscreen" style="width:100%;aspect-ratio:16/9;border:0" title="UNIOC Radio"></iframe>'];
    $now=$s['live']?null:rb_now($s);
    if($r==='/public/on-air'&&$m==='GET') {
        if($now)foreach(['item','next'] as $k)if($now[$k])$now[$k]=array_intersect_key($now[$k],array_flip(['id','title','artist','album','category','kind','contentType','durationSeconds','url']));
        return ['mode'=>$s['live']?'live':'autodj','status'=>rb_live($s),'autodj'=>$now,'liveTransport'=>$s['live']?'webrtc':'direct-file','liveMediaUrl'=>null,'embedUrl'=>$embed,'audioEndpoint'=>$root.'api.php?route=/public/audio','videoEndpoint'=>$root.'api.php?route=/public/video','autoplayNotice'=>'El navegador puede pedir una pulsación para activar el sonido.'];
    }
    if(in_array($r,['/public/audio','/public/video'],true)&&$m==='GET') {
        if($s['live'])rb_error(409,'El vivo usa WebRTC; abre el reproductor público.');
        if(empty($now['item'])||($r==='/public/video'&&$now['item']['kind']!=='video'))return ['_empty'=>true];
        rb_record($s,$now['item'],'autodj',$now['playoutKey'],$now['startedAt']);return ['_redirect'=>$now['item']['url']];
    }
    if($r==='/public/playback'&&$m==='POST') {
        if(empty($now['item'])||($b['playoutKey']??'')!==$now['playoutKey'])return ['ok'=>true,'recorded'=>false];
        return array_merge(['ok'=>true],rb_record($s,$now['item'],'autodj',$now['playoutKey'],$now['startedAt']));
    }return null;
}
