<?php
if (!defined('RB_APP')) { http_response_code(404); exit; }
function rb_seed(): array { static $seed; if($seed===null)$seed=json_decode(file_get_contents(dirname(__DIR__).'/seed.json'),true);return $seed; }
function rb_metadata(array $b,array $a,?array $old=null): array {
    $category=$b['category']??($old['category']??'');$cats=rb_seed()['categories'];$licenses=rb_seed()['licenseTypes'];
    if(!isset($cats[$category]))rb_error(400,'Categoría inválida.');
    $out=$old??['id'=>rb_id(),'createdAt'=>rb_iso(),'bundled'=>false,'uploadedBy'=>$a['username'],'active'=>true];
    foreach(['title'=>160,'artist'=>160,'album'=>160,'genre'=>80,'year'=>4,'isrc'=>20,'composer'=>160,'performer'=>160,'recordLabel'=>160,'notes'=>500,'subtype'=>40] as $k=>$max)if(array_key_exists($k,$b))$out[$k]=rb_text($b[$k]??'',$max,$k==='title');
    if(empty($out['title']))rb_error(400,'El título es obligatorio.');
    if(!empty($out['year'])&&!preg_match('/^\d{4}$/D',$out['year']))rb_error(400,'Año inválido.');
    if(!empty($out['isrc'])&&!preg_match('/^[A-Z0-9-]{5,20}$/iD',$out['isrc']))rb_error(400,'ISRC inválido.');
    $out['category']=$category;$out['mediaType']=$cats[$category]['mediaType'];
    $mime=$b['contentType']??($old['contentType']??'');if(!is_string($mime)||!preg_match('#^(audio|video)/[a-z0-9.+-]+$#iD',$mime))rb_error(400,'Tipo multimedia inválido.');
    $out['contentType']=$mime;$out['kind']=strpos($mime,'video/')===0?'video':'audio';
    $d=$b['durationSeconds']??($old['durationSeconds']??0);if(!is_numeric($d)||$d<=0||$d>86400)rb_error(400,'Duración inválida.');$out['durationSeconds']=round((float)$d,3);
    if(isset($b['active'])){if(!is_bool($b['active']))rb_error(400,'Estado inválido.');$out['active']=$b['active'];}
    $rights=$old['rights']??['confirmed'=>false,'basis'=>'','reference'=>'','licenseType'=>$category==='autodj.sayco'?'sayco-acinpro':'pendiente'];
    foreach(['rightsBasis'=>'basis','rightsReference'=>'reference','licenseType'=>'licenseType'] as $from=>$to)if(isset($b[$from]))$rights[$to]=rb_text($b[$from],240);
    if(!isset($licenses[$rights['licenseType']]))rb_error(400,'Licencia inválida.');
    if(array_key_exists('rightsConfirmed',$b))$rights['confirmed']=$b['rightsConfirmed']===true||$b['rightsConfirmed']==='true';
    if($category==='autodj.sayco' && empty($rights['confirmed']))rb_error(403,'Confirma la autorización SAYCO-ACINPRO antes de activar la pieza.');
    $out['rights']=$rights;
    if(array_key_exists('musicbrainz',$b)) {
        $mb=$b['musicbrainz'];
        if($mb!==null) {
            if(!is_array($mb)||$out['mediaType']!=='music')rb_error(400,'MusicBrainz solo se admite para música.');
            foreach(['recordingId','releaseId','releaseGroupId'] as $k)if(($k==='recordingId'||!empty($mb[$k]))&&!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iD',$mb[$k]??''))rb_error(400,'Identificador MusicBrainz inválido.');
            if(!is_array($mb['artistIds']??[])||count($mb['artistIds']??[])>10)rb_error(400,'Artistas inválidos.');
            foreach($mb['artistIds']??[] as $id)if(!is_string($id)||!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iD',$id))rb_error(400,'Artista MusicBrainz inválido.');
            $mb=array_intersect_key($mb,array_flip(['recordingId','releaseId','releaseGroupId','artistIds']));$mb['source']=($b['musicbrainz']['source']??'')==='musicbrainz-picard'?'musicbrainz-picard':'musicbrainz';$mb['matchedAt']=rb_iso();$mb['picardUri']='mbid://track/'.$mb['recordingId'];
        }$out['musicbrainz']=$mb;
    }
    $out['expiresAt']=$category==='live.volatil'?($old['expiresAt']??gmdate('Y-m-d\TH:i:s\Z',time()+86400)):null;
    $out['updatedAt']=rb_iso();return $out;
}
function rb_media_route(string $r,string $m,array $b,array &$s) {
    if(preg_match('#^/objects/([a-f0-9]{24})$#D',$r,$match)&&in_array($m,['GET','HEAD'],true)) {
        $storage=new ProtectedDiskStorage();$meta=$storage->metadata($match[1]);
        $found=null;foreach($s['media'] as $item)if(($item['storageKey']??'')===$match[1]||($item['rights']['document']['storageKey']??'')===$match[1])$found=$item;
        if($meta['license'] || !$found || !$found['active'])rb_actor($s,['desarrollador','administrador','locutor']);
        if($found && !empty($found['expiresAt']) && strtotime($found['expiresAt'])<=time())rb_error(404,'El archivo temporal venció.');
        return ['_file'=>$meta];
    }
    if(strpos($r,'/media')!==0)return null;
    $a=rb_actor($s,$r==='/media'&&$m==='GET'?['desarrollador','administrador','locutor']:['desarrollador','administrador']);
    $storage=new ProtectedDiskStorage();
    if($r==='/media'&&$m==='GET')return ['items'=>array_values(array_filter($s['media'],function($v){return (empty($_GET['category'])||$v['category']===$_GET['category'])&&(empty($v['expiresAt'])||strtotime($v['expiresAt'])>time());})),'categories'=>rb_seed()['categories'],'licenseTypes'=>rb_seed()['licenseTypes']];
    if($r==='/media/config'&&$m==='GET')return ['provider'=>'stackcp-disk','uploadMode'=>'server','writable'=>true,'maxUploadBytes'=>rb_upload_limit(),'maxLicenseBytes'=>min(rb_upload_limit(),25*1048576),'categories'=>rb_seed()['categories'],'licenseTypes'=>rb_seed()['licenseTypes'],'blobConfigured'=>false];
    if($r==='/media/orphans'&&$m==='GET') {
        $keys=[];foreach($s['media'] as $v){$keys[]=$v['storageKey']??'';$keys[]=$v['rights']['document']['storageKey']??'';}
        return ['items'=>array_values(array_filter($storage->objects(),function($v)use($keys){return !$v['license']&&!in_array($v['key'],$keys,true);}))];
    }
    if(($r==='/media/local-upload'||$r==='/media/import-stored')&&$m==='POST') {
        $metadata=$b['metadata']??[];if(is_string($metadata))$metadata=json_decode($metadata,true);if(!is_array($metadata))rb_error(400,'Metadatos inválidos.');
        $old=null;$oldIndex=null;foreach($s['media'] as $i=>$v)if($v['id']===($b['replaceItemId']??'')){$old=$v;$oldIndex=$i;}
        if(!empty($b['replaceItemId'])&&!$old)rb_error(404,'Pieza por reemplazar no encontrada.');
        if(!$old&&count($s['media'])>=5000)rb_error(400,'Se alcanzó el límite del catálogo.');
        $item=rb_metadata($metadata,$a,$old);
        if($r==='/media/import-stored') {
            $stored=$storage->metadata($b['storageKey']??'');if($stored['license']||$stored['category']!==$item['category'])rb_error(400,'El archivo no corresponde a esa categoría.');
            foreach($s['media'] as $v)if(($v['storageKey']??'')===$stored['key'])rb_error(400,'El archivo ya está incorporado.');
        } else $stored=$storage->store($_FILES['file']??[],$item['category']);
        $item=array_merge($item,$stored);$item['kind']=strpos($stored['contentType'],'video/')===0?'video':'audio';$item['bundled']=false;
        if(isset($_FILES['licenseFile'])&&$_FILES['licenseFile']['error']!==UPLOAD_ERR_NO_FILE)$item['rights']['document']=$storage->store($_FILES['licenseFile'],'licenses',true);
        if($oldIndex!==null){$s['media'][$oldIndex]=$item;if(!empty($old['storageKey']))$storage->delete($old['storageKey']);}else $s['media'][]=$item;
        return ['ok'=>true,'item'=>$item];
    }
    if(preg_match('#^/media/([^/]+)(/license-upload)?$#D',$r,$match))foreach($s['media'] as $i=>$old)if($old['id']===$match[1]) {
        if($m==='PATCH'&&empty($match[2])){$item=rb_metadata($b,$a,$old);$s['media'][$i]=$item;return ['ok'=>true,'item'=>$item];}
        if($m==='DELETE'&&empty($match[2])){if(!empty($old['storageKey']))$storage->delete($old['storageKey']);if(!empty($old['rights']['document']['storageKey']))$storage->delete($old['rights']['document']['storageKey']);array_splice($s['media'],$i,1);return ['ok'=>true];}
        if($m==='POST'&&!empty($match[2])){$doc=$storage->store($_FILES['licenseFile']??[],'licenses',true);$s['media'][$i]['rights']['document']=$doc;if(!empty($old['rights']['document']['storageKey']))$storage->delete($old['rights']['document']['storageKey']);return ['ok'=>true,'item'=>$s['media'][$i]];}
    }
    return null;
}
