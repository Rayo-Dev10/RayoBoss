<?php
if (!defined('RB_APP')) { http_response_code(404); exit; }
function rb_musicbrainz(array $q): array {
    $parts=[];foreach(['title'=>'recording','artist'=>'artist','isrc'=>'isrc'] as $key=>$field){$v=rb_text($q[$key]??'',160);if($v!=='')$parts[]=$field.':"'.preg_replace('/([+\-&|!(){}\[\]^"~*?:\\\\\/])/','\\\\$1',$v).'"';}
    if(!$parts)rb_error(400,'Escribe título, artista o ISRC.');$query=implode(' AND ',$parts);$key=hash('sha256',$query);
    $store=new FileState();$s=&$store->data;
    if(isset($s['mbCache'][$key])&&$s['mbCache'][$key]['until']>time()){$value=$s['mbCache'][$key]['value'];$store->close();return $value;}
    if(($s['mbLast']??0)>microtime(true)-1){$store->close();rb_error(429,'Espera un segundo antes de consultar nuevamente.');}
    $s['mbLast']=microtime(true);$store->close();
    if(!function_exists('curl_init'))rb_error(503,'El hosting no dispone de conexión cURL para MusicBrainz.');
    $url='https://musicbrainz.org/ws/2/recording?'.http_build_query(['query'=>$query,'fmt'=>'json','limit'=>8]);$ch=curl_init($url);
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>12,CURLOPT_CONNECTTIMEOUT=>5,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_HTTPHEADER=>['Accept: application/json','User-Agent: RayoBoss/'.RB_VERSION.' ( https://github.com/Rayo-Dev10/RayoBoss )']]);
    $raw=curl_exec($ch);$code=curl_getinfo($ch,CURLINFO_RESPONSE_CODE);curl_close($ch);
    if($code!==200||!is_string($raw))rb_error(502,'MusicBrainz no respondió. Intenta nuevamente más tarde.');
    $data=json_decode($raw,true);if(!is_array($data))rb_error(502,'Respuesta inválida de MusicBrainz.');$items=[];
    foreach($data['recordings']??[] as $rec){if(!preg_match('/^[a-f0-9-]{36}$/iD',$rec['id']??''))continue;$rel=$rec['releases'][0]??[];foreach($rec['releases']??[] as $r)if(($r['status']??'')==='Official'){$rel=$r;break;}$artist='';$ids=[];foreach($rec['artist-credit']??[] as $a){$artist.=($a['name']??($a['artist']['name']??'')).($a['joinphrase']??'');if(isset($a['artist']['id']))$ids[]=$a['artist']['id'];}
        $items[]=['recordingId'=>$rec['id'],'title'=>$rec['title']??'','artist'=>$artist,'artistIds'=>$ids,'album'=>$rel['title']??'','releaseId'=>$rel['id']??'','releaseGroupId'=>$rel['release-group']['id']??'','year'=>substr($rec['first-release-date']??($rel['date']??''),0,4),'isrc'=>$rec['isrcs'][0]??'','genre'=>implode('; ',array_column($rec['genres']??($rec['tags']??[]),'name')),'durationSeconds'=>isset($rec['length'])?$rec['length']/1000:null,'score'=>$rec['score']??0,'source'=>'musicbrainz','picardUri'=>'mbid://track/'.$rec['id']];
    }
    $value=['ok'=>true,'query'=>$query,'items'=>$items,'source'=>'MusicBrainz','freeService'=>true];$store=new FileState();$store->data['mbCache'][$key]=['until'=>time()+3600,'value'=>$value];$store->data['mbCache']=array_slice($store->data['mbCache'],-200,null,true);$store->close();return $value;
}
