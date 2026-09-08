<?php
if (!defined('RB_APP')) { http_response_code(404); exit; }
abstract class StorageProvider {
    abstract public function store(array $file,string $category,bool $license=false): array;
    abstract public function metadata(string $key): array;
    abstract public function delete(string $key): void;
    abstract public function objects(): array;
}
final class ProtectedDiskStorage extends StorageProvider {
    private $dir;
    public function __construct() { $this->dir=dirname(__DIR__).'/private/objects'; if(!is_dir($this->dir) && !mkdir($this->dir,0700))rb_error(503,'No se pudo crear el almacenamiento.');if(is_link($this->dir))rb_error(503,'Almacenamiento inválido.'); }
    private function path(string $key,string $suffix=''): string { if(!preg_match('/^[a-f0-9]{24}$/D',$key))rb_error(400,'Clave de archivo inválida.');$p=$this->dir.'/'.$key.$suffix.'.php';if(is_link($p))rb_error(403,'Archivo no autorizado.');return $p; }
    public function store(array $file,string $category,bool $license=false): array {
        if (($file['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name']??'')) rb_error(400,'La carga no se completó. Revisa el tamaño permitido por el hosting.');
        $max=$license?min(rb_upload_limit(),25*1024*1024):rb_upload_limit();
        if ($file['size']<1 || $file['size']>$max) rb_error(413,'El archivo supera el tamaño permitido.');
        $name=rb_text(basename($file['name']),240,true);$ext=strtolower(pathinfo($name,PATHINFO_EXTENSION));
        $allowed=$license?['txt'=>['text/plain'],'pdf'=>['application/pdf'],'jpg'=>['image/jpeg'],'jpeg'=>['image/jpeg'],'png'=>['image/png'],'webp'=>['image/webp']]:['mp3'=>['audio/mpeg'],'wav'=>['audio/wav','audio/x-wav'],'aac'=>['audio/aac','audio/x-hx-aac-adts'],'m4a'=>['audio/mp4','video/mp4','audio/x-m4a'],'ogg'=>['audio/ogg','application/ogg'],'oga'=>['audio/ogg','application/ogg'],'opus'=>['audio/ogg','audio/opus','application/ogg'],'flac'=>['audio/flac','audio/x-flac'],'mp4'=>['video/mp4'],'m4v'=>['video/mp4'],'mov'=>['video/quicktime'],'webm'=>['video/webm','audio/webm']];
        $mime=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        if (!isset($allowed[$ext]) || !in_array($mime,$allowed[$ext],true)) rb_error(400,'El contenido del archivo no coincide con un formato permitido.');
        if($mime==='application/ogg')$mime='audio/ogg';if($ext==='m4a')$mime='audio/mp4';
        $key=rb_id();$path=$this->path($key);$out=fopen($path,'xb');$in=fopen($file['tmp_name'],'rb');
        if(!$out||!$in)rb_error(503,'No se pudo guardar el archivo.');
        fwrite($out,RB_GUARD);$written=stream_copy_to_stream($in,$out);fflush($out);fclose($in);fclose($out);chmod($path,0600);
        if($written!==$file['size'])rb_error(503,'La escritura quedó incompleta.');
        $meta=['key'=>$key,'storageKey'=>$key,'provider'=>'stackcp-disk','storage'=>'local','category'=>$category,'originalName'=>$name,'size'=>$file['size'],'contentType'=>$mime,'url'=>'api.php?route=/objects/'.$key,'license'=>$license,'createdAt'=>rb_iso()];
        if(file_put_contents($this->path($key,'.meta'),RB_GUARD.json_encode($meta,JSON_THROW_ON_ERROR))===false)rb_error(503,'No se pudieron guardar los metadatos del archivo.');
        chmod($this->path($key,'.meta'),0600);return $meta;
    }
    public function metadata(string $key): array { $file=$this->path($key,'.meta'); if(!is_file($file)||!is_file($this->path($key)))rb_error(404,'Archivo no encontrado.');$m=json_decode(substr(file_get_contents($file),strlen(RB_GUARD)),true);if(!is_array($m))rb_error(503,'Metadatos dañados.');return $m; }
    public function delete(string $key): void { foreach(['','.meta'] as $suffix){$p=$this->path($key,$suffix);if(is_file($p)&&!unlink($p))rb_error(503,'No se pudo eliminar el archivo.');} }
    public function objects(): array { $out=[];foreach(glob($this->dir.'/*.meta.php') as $file){$key=basename($file,'.meta.php');$out[]=$this->metadata($key);}return $out; }
    public function stream(array $meta): void {
        $path=$this->path($meta['storageKey']);$size=filesize($path)-strlen(RB_GUARD);$start=0;$end=$size-1;
        $range=$_SERVER['HTTP_RANGE']??'';
        if($range!=='') {
            if(!preg_match('/^bytes=(\d*)-(\d*)$/D',$range,$m) || ($m[1]===''&&$m[2]==='')){http_response_code(416);header('Content-Range: bytes */'.$size);return;}
            if($m[1]==='')$start=max(0,$size-(int)$m[2]);else{$start=(int)$m[1];if($m[2]!=='')$end=min($end,(int)$m[2]);}
            if($start>$end||$start>=$size){http_response_code(416);header('Content-Range: bytes */'.$size);return;}
            http_response_code(206);header("Content-Range: bytes $start-$end/$size");
        }
        header('Accept-Ranges: bytes');header('Content-Type: '.$meta['contentType']);header('Content-Length: '.($end-$start+1));
        if($meta['license'])header("Content-Disposition: attachment; filename*=UTF-8''".rawurlencode($meta['originalName']));
        if($_SERVER['REQUEST_METHOD']==='HEAD')return;
        $f=fopen($path,'rb');fseek($f,strlen(RB_GUARD)+$start);$left=$end-$start+1;
        while($left>0 && !feof($f) && !connection_aborted()){$chunk=fread($f,min(65536,$left));if($chunk===false||$chunk==='')break;echo $chunk;$left-=strlen($chunk);}fclose($f);
    }
}
function rb_upload_limit(): int { $parse=function($s){$n=(int)$s;$unit=strtolower(substr(trim($s),-1));return $n*($unit==='g'?1073741824:($unit==='m'?1048576:($unit==='k'?1024:1)));};return max(1,min(64*1048576,$parse(ini_get('upload_max_filesize')),$parse(ini_get('post_max_size'))-65536)); }
