<?php
if (!defined('RB_APP')) { http_response_code(404); exit; }
function rb_ice(): array { return rb_config()['iceServers'] ?? [['urls'=>'stun:stun.l.google.com:19302']]; }
function rb_live(array $s): array {
    return array_merge(['live'=>false,'broadcastId'=>null,'host'=>null,'startedAt'=>null,'title'=>'AutoDJ institucional'], $s['live'] ?? [], ['source'=>$s['live']?'live':'autodj','listeners'=>count(array_filter($s['rtc']['clients'],function($c){return $c['kind']==='listener';})),'totalSessions'=>0,'autodj'=>['franja'=>'Programación visual','playlist'=>'Continuidad'],'latency'=>['frameMs'=>200,'sampleRate'=>22050],'rtc'=>['enabled'=>true,'transport'=>'webrtc-http-signaling','turnConfigured'=>count(rb_ice())>1],'mode'=>'stackcp','version'=>RB_VERSION]);
}
function rb_request_mic(array &$s,array $actor,string $display='',?string $access=null): array {
    if (!$s['live']) rb_error(400,'Solo se puede solicitar micrófono durante un vivo.');
    foreach ($s['microphones'] as $r) if ($r['username']===$actor['username'] && $r['broadcastId']===$s['live']['broadcastId'] && !in_array($r['state'],['revoked','expired'],true)) return $r;
    $r=['id'=>rb_id(),'username'=>$actor['username'],'role'=>$actor['role'],'displayName'=>$display?:$actor['username'],'accessRequestId'=>$access,'broadcastId'=>$s['live']['broadcastId'],'state'=>'requested','testStatus'=>'not_started','createdAt'=>rb_iso()];
    $s['microphones'][]=$r; $s['microphones']=array_slice($s['microphones'],-1000); return $r;
}
function rb_mic(array $s,string $username): ?array {
    foreach ($s['microphones'] as $r) if ($r['username']===$username && $r['broadcastId']===($s['live']['broadcastId']??null) && !in_array($r['state'],['revoked','expired'],true)) return $r;
    return null;
}
function rb_rtc_remove(array &$s,string $id): void {
    unset($s['rtc']['clients'][$id],$s['rtc']['inboxes'][$id]);
    $s['rtc']['joins']=array_values(array_filter($s['rtc']['joins'],function($v)use($id){return $v!==$id;}));
    $s['rtc']['inboxes']['host'][]=['from'=>$id,'type'=>'close','payload'=>null,'createdAt'=>rb_iso()];
}
function rb_live_route(string $route,string $method,array $b,array &$s) {
    foreach ($s['rtc']['clients'] as $id=>$c) if ($c['seen']<time()-180) rb_rtc_remove($s,$id);
    foreach ($s['rtc']['inboxes'] as &$inbox) $inbox=array_slice(array_values(array_filter($inbox,function($v){return strtotime($v['createdAt'])>time()-180;})),-100);
    unset($inbox);
    if ($route==='/live/status' && $method==='GET') return rb_live($s);
    if ($route==='/live/start' && $method==='POST') {
        $a=rb_actor($s,['desarrollador','administrador','locutor']);
        if ($s['live'] && $s['live']['host']!==$a['username']) rb_error(409,'Ya existe un vivo. Puedes sumarte sin reemplazarlo.');
        $s['live']=['live'=>true,'broadcastId'=>$s['live']['broadcastId']??rb_id(),'startedAt'=>$s['live']['startedAt']??rb_iso(),'host'=>$a['username'],'title'=>rb_text($b['title']??'',120)?:'En vivo con '.$a['username']];
        return ['ok'=>true,'status'=>rb_live($s),'streamUrl'=>'embed.php'];
    }
    if ($route==='/live/end' && $method==='POST') {
        $a=rb_actor($s,['desarrollador','administrador','locutor']);
        if ($s['live'] && $a['role']==='locutor' && $a['username']!==$s['live']['host']) rb_error(403,'Solo el conductor o un administrador puede terminar el vivo.');
        foreach ($s['microphones'] as &$r) if ($r['state']!=='revoked') $r['state']='expired'; unset($r);
        $s['live']=null; $s['rtc']=['clients'=>[],'inboxes'=>['host'=>[]],'joins'=>[]]; return ['ok'=>true,'status'=>rb_live($s)];
    }
    if ($route==='/live/stream') rb_error(409,'Usa el reproductor público para escuchar AutoDJ o el vivo WebRTC.');
    if ($route==='/microphones' && $method==='GET') {
        rb_actor($s,['desarrollador','administrador']); $rows=$s['microphones'];
        foreach($rows as &$r) $r['active']=$s['live'] && $r['broadcastId']===$s['live']['broadcastId'] && !in_array($r['state'],['revoked','expired'],true);
        return ['requests'=>$rows,'live'=>rb_live($s)];
    }
    if ($route==='/microphones/me' && $method==='GET') { $a=rb_actor($s); return ['request'=>rb_mic($s,$a['username']),'live'=>rb_live($s)]; }
    if ($route==='/microphones/request' && $method==='POST') { $a=rb_actor($s,['periodista','invitado']); return ['ok'=>true,'request'=>rb_request_mic($s,$a)]; }
    if (preg_match('#^/microphones/([^/]+)/(approve-test|approve-live|revoke|test-result)$#D',$route,$m) && $method==='POST') {
        $a=rb_actor($s,$m[2]==='test-result'?['periodista','invitado']:['desarrollador','administrador']);
        foreach($s['microphones'] as &$r) {
            if ($m[1]==='me' ? $r['username']!==$a['username'] || $r['broadcastId']!==($s['live']['broadcastId']??null) : $r['id']!==$m[1]) continue;
            if ($m[2]!=='revoke' && (!$s['live'] || $r['broadcastId']!==$s['live']['broadcastId'] || in_array($r['state'],['expired','revoked'],true))) rb_error(400,'Solicitud fuera del vivo actual.');
            if ($m[2]==='test-result') {
                if (!in_array($r['state'],['test_approved','live_approved'],true)) rb_error(403,'La prueba no está autorizada.');
                $r['testStatus']=($b['result']??'')==='ready'?'ready':'failed';
            } else {
                $r['state']=$m[2]==='revoke'?'revoked':($m[2]==='approve-live'?'live_approved':($r['state']==='live_approved'?'live_approved':'test_approved'));
                $r['approvedBy']=$a['username'];
                if ($m[2]==='revoke') foreach($s['rtc']['clients'] as $id=>$c) if ($c['username']===$r['username']) rb_rtc_remove($s,$id);
            }
            return ['ok'=>true,'request'=>$r];
        }
        rb_error(404,'Solicitud no encontrada.');
    }
    if (strpos($route,'/rtc/')!==0) return null;
    if (!$s['live']) rb_error(409,'No hay un vivo activo.');
    if (preg_match('#^/rtc/(listeners|participants|cohosts)/join$#D',$route,$m) && $method==='POST') {
        $kind=['listeners'=>'listener','participants'=>'participant','cohosts'=>'cohost'][$m[1]];
        $a=$kind==='listener'?['username'=>null,'role'=>null]:rb_actor($s,$kind==='cohost'?['desarrollador','administrador','locutor']:['periodista','invitado']);
        if ($kind==='participant' && (rb_mic($s,$a['username'])['state']??'')!=='live_approved') rb_error(403,'Tu micrófono todavía no fue aprobado al aire.');
        if ($kind==='cohost' && $s['live']['host']===$a['username']) rb_error(403,'El conductor ya opera este vivo.');
        $count=0; foreach($s['rtc']['clients'] as $c) if (($c['kind']==='listener')===($kind==='listener')) $count++;
        if ($count>=($kind==='listener'?40:8)) rb_error(429,'Se alcanzó el cupo de conexiones del estudio.');
        $id=rb_id(); $token=rb_b64(random_bytes(24));
        $sessionVersion=null; foreach($s['users'] as $u) if ($u['username']===$a['username']) $sessionVersion=$u['sessionVersion'];
        $s['rtc']['clients'][$id]=['id'=>$id,'kind'=>$kind,'username'=>$a['username'],'role'=>$a['role'],'sessionVersion'=>$sessionVersion,'displayName'=>$a['username']??'Oyente','joinedAt'=>rb_iso(),'seen'=>time(),'tokenHash'=>hash('sha256',$token)];
        $s['rtc']['inboxes'][$id]=[]; $s['rtc']['joins'][]=$id;
        return ['ok'=>true,'session'=>['connectionId'=>$id,'token'=>$token,'broadcastId'=>$s['live']['broadcastId'],'pollMs'=>1500,'iceServers'=>rb_ice(),'turnConfigured'=>count(rb_ice())>1]];
    }
    $host=strpos($route,'/rtc/host/')===0;
    if ($host) {
        $a=rb_actor($s,['desarrollador','administrador','locutor']);
        if ($a['username']!==$s['live']['host']) rb_error(403,'Solo el conductor puede operar el estudio principal.');
        $id='host';
    } else {
        $id=$b['connectionId']??''; $c=$s['rtc']['clients'][$id]??null;
        if (!$c || !is_string($b['token']??null) || !hash_equals($c['tokenHash'],hash('sha256',$b['token']))) rb_error(403,'Conexión no autorizada.');
        if ($c['username']) {
            $valid=false; foreach($s['users'] as $u) if ($u['username']===$c['username'] && $u['sessionVersion']===($c['sessionVersion']??null)) $valid=true;
            if (!$valid || ($c['kind']==='participant' && (rb_mic($s,$c['username'])['state']??'')!=='live_approved')) rb_error(403,'Permiso revocado.');
        }
        $s['rtc']['clients'][$id]['seen']=time();
    }
    if (substr($route,-5)==='/poll' && $method===($host?'GET':'POST')) {
        $signals=$s['rtc']['inboxes'][$id]??[]; $s['rtc']['inboxes'][$id]=[];
        $result=['signals'=>$signals,'pollMs'=>1500,'live'=>true];
        if ($host) {
            $result['joins']=[]; foreach($s['rtc']['joins'] as $cid) if (isset($s['rtc']['clients'][$cid])) { $c=$s['rtc']['clients'][$cid]; unset($c['tokenHash'],$c['seen']); $result['joins'][]=$c; }
            $s['rtc']['joins']=[]; $result['iceServers']=rb_ice();
        }
        return $result;
    }
    if (substr($route,-7)==='/signal' && $method==='POST') {
        $signal=$b['signal']??null;
        if (!is_array($signal) || !in_array($signal['type']??'', ['description','candidate','close'],true) || strlen(json_encode($signal))>100000) rb_error(400,'Señal WebRTC inválida.');
        $target=$host?($b['targetId']??''):'host';
        if ($host && !isset($s['rtc']['clients'][$target])) rb_error(404,'Conexión no encontrada.');
        if (count($s['rtc']['inboxes'][$target]??[])>=100) rb_error(429,'La conexión tiene señales pendientes.');
        $s['rtc']['inboxes'][$target][]=['from'=>$id,'kind'=>$host?'host':$c['kind'],'username'=>$host?$a['username']:$c['username'],'type'=>$signal['type'],'payload'=>$signal['payload']??null,'createdAt'=>rb_iso()];
        return ['ok'=>true];
    }
    if ($route==='/rtc/clients/leave' && $method==='POST') { rb_rtc_remove($s,$id); return ['ok'=>true]; }
    return null;
}
