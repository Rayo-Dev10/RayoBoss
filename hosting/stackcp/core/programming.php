<?php
if (!defined('RB_APP')) { http_response_code(404); exit; }
function rb_clock($v): int { if (!is_string($v) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/D',$v)) rb_error(400,'Hora inválida; usa HH:MM.'); return intval(substr($v,0,2))*60+intval(substr($v,3)); }
function rb_segments(array $slot): array {
    $start=rb_clock($slot['start']); $end=rb_clock($slot['end']); if ($end===1439) $end=1440;
    if ($start===$end) rb_error(400,'La franja debe tener horas distintas.');
    $result=[]; foreach($slot['days'] as $day) {
        if ($end>$start) $result[]=[$day,$start,$end];
        else { $result[]=[$day,$start,1440]; if ($end>0) $result[]=[($day+1)%7,0,$end]; }
    } return $result;
}
function rb_program_validate(array $p): array {
    if (!isset($p['playlists'],$p['schedule'],$p['continuity']) || !is_array($p['playlists']) || !is_array($p['schedule']) || !is_array($p['continuity']) || count($p['playlists'])<1 || count($p['playlists'])>100 || count($p['schedule'])>250) rb_error(400,'Programación inválida.');
    $ids=[];
    foreach($p['playlists'] as &$v) {
        if (!is_array($v) || !preg_match('/^[a-z0-9_-]{2,48}$/iD',$v['id']??'') || isset($ids[$v['id']]) || !is_array($v['itemIds']??null) || count($v['itemIds'])>500) rb_error(400,'Playlist inválida o duplicada.');
        $v['name']=rb_text($v['name']??'',100,true); $ids[$v['id']]=true;
        foreach($v['itemIds'] as $id) if (!is_string($id) || strlen($id)>64) rb_error(400,'Pieza inválida.');
        $v['itemIds']=array_values(array_unique($v['itemIds'])); $v['shuffle']=!empty($v['shuffle']); $v['repeat']=($v['repeat']??true)!==false;
    } unset($v);
    $slots=[]; $segments=[];
    foreach($p['schedule'] as &$v) {
        if (!is_array($v) || !preg_match('/^[a-z0-9_-]{2,48}$/iD',$v['id']??'') || isset($slots[$v['id']]) || !isset($ids[$v['playlistId']??'']) || !is_array($v['days']??null) || !$v['days']) rb_error(400,'Franja inválida o duplicada.');
        $v['name']=rb_text($v['name']??'',100,true); $slots[$v['id']]=true;
        foreach($v['days'] as $d) if (!is_int($d) || $d<0 || $d>6) rb_error(400,'Día inválido.');
        $v['days']=array_values(array_unique($v['days'])); $v['enabled']=($v['enabled']??false)===true;
        foreach(rb_segments($v) as $seg) if ($v['enabled']) {
            foreach($segments as $old) if ($seg[0]===$old[0] && $seg[1]<$old[2] && $seg[2]>$old[1]) rb_error(400,'Las franjas activas se superponen.');
            $segments[]=$seg;
        }
    } unset($v);
    $c=&$p['continuity'];
    foreach(['stationIdEveryTracks'=>50,'cueEveryMinutes'=>240,'crossfadeSeconds'=>10] as $key=>$max) { if (!is_numeric($c[$key]??0)) rb_error(400,'Continuidad inválida.'); $c[$key]=max(0,min($max,(float)($c[$key]??0))); }
    if (floor($c['stationIdEveryTracks'])!==$c['stationIdEveryTracks']) rb_error(400,'La frecuencia del identificador debe ser un número entero de pistas.');
    foreach(['stationIdItemIds','cueItemIds'] as $key) { if (!is_array($c[$key]??null) || count($c[$key])>100) rb_error(400,'Continuidad inválida.'); foreach($c[$key] as $id) if (!is_string($id)) rb_error(400,'Pieza inválida.'); }
    $c['cueOrder']=($c['cueOrder']??'')==='random'?'random':'sequential';
    if (!isset($ids[$c['fallbackPlaylistId']??''])) $c['fallbackPlaylistId']=$p['playlists'][0]['id'];
    $p['schemaVersion']=2; return $p;
}
function rb_now(array $s, ?int $epoch=null): array {
    $epoch=$epoch??time(); $date=(new DateTimeImmutable('@'.$epoch))->setTimezone(new DateTimeZone('America/Bogota'));
    $p=$s['programming']; $slot=null; $day=(int)$date->format('w'); $minute=(int)$date->format('G')*60+(int)$date->format('i');
    foreach($p['schedule'] as $v) if ($v['enabled']) foreach(rb_segments($v) as $seg) if ($seg[0]===$day && $minute>=$seg[1] && $minute<$seg[2]) $slot=$v;
    $playlist=$p['playlists'][0]; foreach($p['playlists'] as $v) if ($v['id']===($slot['playlistId']??$p['continuity']['fallbackPlaylistId'])) $playlist=$v;
    $catalog=[]; foreach($s['media'] as $item) if ($item['active'] && (empty($item['expiresAt']) || strtotime($item['expiresAt'])>$epoch)) $catalog[$item['id']]=$item;
    $resolve=function($ids)use($catalog){ $out=[];foreach($ids as $id)if(isset($catalog[$id]))$out[]=$catalog[$id];return $out;};
    $base=$resolve($playlist['itemIds']); $seed=(int)gmdate('Ymd',$epoch); $c=$p['continuity'];
    if ($playlist['shuffle']) { $mutable=$seed; for($i=count($base)-1;$i>0;$i--) { $mutable=($mutable*1664525+1013904223)&0xffffffff; $j=$mutable%($i+1); $tmp=$base[$i];$base[$i]=$base[$j];$base[$j]=$tmp; } }
    $result=['item'=>null,'next'=>null,'playlist'=>['id'=>$playlist['id'],'name'=>$playlist['name']],'slot'=>$slot,'offsetSeconds'=>0,'remainingSeconds'=>0,'progressPercent'=>0,'crossfadeSeconds'=>$c['crossfadeSeconds']];
    if (!$base) return $result;
    $ids=$resolve($c['stationIdItemIds']);$cues=$resolve($c['cueItemIds']);$timeline=[];$elapsed=0;$lastCue=0;$si=0;$ci=0;
    $duration=array_sum(array_column($base,'durationSeconds'));
    $rounds=$playlist['repeat']?max(3,min(600,ceil(600/max(1,$duration)))):1;
    for($round=0;$round<$rounds;$round++) foreach($base as $index=>$item) {
        $timeline[]=$item; $elapsed+=$item['durationSeconds']?:30;
        if ($c['stationIdEveryTracks']>0 && $ids && (($round*count($base)+$index+1)%(int)$c['stationIdEveryTracks'])===0) { $id=$ids[$si++%count($ids)];$timeline[]=$id;$elapsed+=$id['durationSeconds']; }
        if ($c['cueEveryMinutes']>0 && $cues && $elapsed-$lastCue>=$c['cueEveryMinutes']*60) { $cue=$cues[($c['cueOrder']==='random'?$seed+$ci*7:$ci)%count($cues)];$ci++;$timeline[]=$cue;$elapsed+=$cue['durationSeconds'];$lastCue=$elapsed; }
    }
    if ($elapsed<=0) return $result;
    // Repetición desactivada: reproducir una vez desde el comienzo de la franja o del día.
    $reference=$epoch;
    if (!$playlist['repeat']) {
        $start=$date->setTime(0,0)->getTimestamp();
        if ($slot) { $start+=rb_clock($slot['start'])*60; if($start>$epoch)$start-=86400; }
        $reference=$epoch-$start; if($reference>=$elapsed)return $result;
    }
    $cursor=fmod($reference,$elapsed);$cycle=floor($reference/$elapsed);
    foreach($timeline as $index=>$item) {
        $d=$item['durationSeconds']?:30;
        if ($cursor<$d) return array_merge($result,['item'=>$item,'next'=>(!$playlist['repeat'] && $index===count($timeline)-1)?null:$timeline[($index+1)%count($timeline)],'offsetSeconds'=>$cursor,'remainingSeconds'=>$d-$cursor,'progressPercent'=>$cursor/$d*100,'startedAt'=>gmdate('Y-m-d\TH:i:s\Z',(int)($epoch-$cursor)),'playoutKey'=>'autodj:'.$p['revision'].':'.$playlist['id'].':'.($playlist['repeat']?$cycle:$start).':'.$index]);
        $cursor-=$d;
    } return $result;
}
function rb_program_route(string $r,string $m,array $b,array &$s) {
    if ($r==='/programming' && $m==='GET') { rb_actor($s,['desarrollador','administrador','locutor']);return $s['programming']; }
    if (($r==='/programming' && $m==='PUT') || ($r==='/programming/reset' && $m==='POST')) {
        $a=rb_actor($s,['desarrollador','administrador']);
        if($r==='/programming/reset')$b=json_decode(file_get_contents(dirname(__DIR__).'/seed.json'),true)['programming'];
        $p=rb_program_validate($b);$p['revision']=($s['programming']['revision']??1)+1;$p['updatedAt']=rb_iso();$p['updatedBy']=$a['username'];$s['programming']=$p;return ['ok'=>true,'programming'=>$p];
    } return null;
}
