<?php
declare(strict_types=1);
if (!defined('RB_APP')) { http_response_code(404); exit; }
ini_set('display_errors', '0');
set_error_handler(function($severity, $message, $file, $line) { throw new ErrorException('Error de ejecución PHP.', 0, $severity, $file, $line); });
const RB_VERSION = '4.1.0';
const RB_GUARD = "<?php http_response_code(404); exit; ?>\n";
function rb_error(int $status, string $message): void { throw new RuntimeException($message, $status); }
function rb_id(): string { return bin2hex(random_bytes(12)); }
function rb_iso(): string { return gmdate('Y-m-d\TH:i:s\Z'); }
function rb_text($value, int $max = 160, bool $required = false): string {
    if (!is_string($value)) rb_error(400, 'Texto inválido.');
    $value = trim($value);
    if (strlen($value) > $max || preg_match('/[<>\x00-\x08]/', $value) || ($required && $value === '')) rb_error(400, 'Texto vacío, demasiado largo o con caracteres no permitidos.');
    return $value;
}
function rb_headers(bool $embed = false): void {
    header('Cache-Control: no-store'); header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; media-src 'self' blob:; img-src 'self' blob: data:; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors " . ($embed ? '*' : "'none'"));
    if (!$embed) header('X-Frame-Options: DENY');
}
function rb_config(): array {
    static $config;
    if ($config !== null) return $config;
    $file = dirname(__DIR__) . '/private/config.php';
    if (!is_file($file)) rb_error(503, 'La instalación requiere configurar las credenciales de acceso.');
    $config = require $file;
    if (!is_array($config) || strlen($config['secret'] ?? '') < 32 || empty($config['devHash'])) rb_error(503, 'Configuración de acceso incompleta.');
    if (!function_exists('sodium_crypto_pwhash_scryptsalsa208sha256_str_verify')) rb_error(503, 'El servidor requiere Sodium para verificar contraseñas.');
    return $config;
}
// Todos los archivos operativos terminan en .php y abortan si se solicitan por HTTP.
final class FileState {
    private $lock;
    private $dir;
    public $data;
    private $original;
    public function __construct() {
        $this->dir = dirname(__DIR__) . '/private';
        if (is_link($this->dir)) rb_error(503, 'Directorio de datos no válido.');
        foreach (['lock.php','state.php','state.bak.php'] as $name) if (is_link($this->dir.'/'.$name)) rb_error(503, 'Archivo operativo no válido.');
        $this->lock = fopen($this->dir . '/lock.php', 'c+');
        if (!$this->lock || !flock($this->lock, LOCK_EX)) rb_error(503, 'No se pudo bloquear el almacenamiento.');
        if (fstat($this->lock)['size'] === 0) fwrite($this->lock, RB_GUARD);
        $file = $this->dir . '/state.php';
        $recovered = false;
        $this->data = $this->read($file);
        if ($this->data === null && is_file($file)) {
            $this->data = $this->read($this->dir . '/state.bak.php');
            if ($this->data === null) rb_error(503, 'Los datos requieren recuperación desde un respaldo.');
            $recovered = true;
        }
        if ($this->data === null) {
            $seed = json_decode(file_get_contents(dirname(__DIR__) . '/seed.json'), true);
            $this->data = ['schemaVersion'=>1,'users'=>[], 'guests'=>[], 'microphones'=>[], 'live'=>null,'rtc'=>['clients'=>[],'inboxes'=>['host'=>[]],'joins'=>[]], 'attempts'=>[], 'events'=>[], 'media'=>$seed['media'], 'programming'=>$seed['programming']];
        }
        $this->original = $recovered ? null : $this->data;
        $cfg = rb_config();
        $found = false;
        foreach ($this->data['users'] as &$user) {
            if ($user['username'] !== 'dev') continue;
            $found = true;
            if (($user['configHash'] ?? '') !== hash('sha256', $cfg['devHash'])) {
                $user['passwordHash'] = $cfg['devHash']; $user['configHash'] = hash('sha256', $cfg['devHash']); $user['sessionVersion']++;
            }
        }
        unset($user);
        if (!$found) $this->data['users'][] = ['username'=>'dev','passwordHash'=>$cfg['devHash'],'configHash'=>hash('sha256',$cfg['devHash']),'role'=>'desarrollador','protected'=>true,'sessionVersion'=>1,'createdAt'=>rb_iso()];
    }
    private function read(string $file): ?array {
        if (!is_file($file) || is_link($file)) return null;
        $raw = file_get_contents($file);
        if (substr($raw, 0, strlen(RB_GUARD)) !== RB_GUARD) return null;
        $data = json_decode(substr($raw, strlen(RB_GUARD)), true);
        return is_array($data) && ($data['schemaVersion'] ?? 0) === 1 && isset($data['users'], $data['media'], $data['programming']) ? $data : null;
    }
    public function close(): void {
        if (!$this->lock) return;
        if ($this->data !== $this->original) {
            $raw = RB_GUARD . json_encode($this->data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            $temp = $this->dir . '/write-' . rb_id() . '.php';
            if (file_put_contents($temp, $raw) !== strlen($raw)) rb_error(503, 'No se pudo guardar el estado.');
            chmod($temp, 0600);
            $file = $this->dir . '/state.php';
            if ($this->read($file) !== null && !copy($file, $this->dir . '/state.bak.php')) rb_error(503, 'No se pudo guardar el respaldo.');
            if (is_file($this->dir . '/state.bak.php')) chmod($this->dir . '/state.bak.php', 0600);
            if (!rename($temp, $file)) rb_error(503, 'No se pudo confirmar el estado.');
        }
        flock($this->lock, LOCK_UN); fclose($this->lock); $this->lock = null;
    }
    public function __destruct() { if ($this->lock) { flock($this->lock, LOCK_UN); fclose($this->lock); } }
}
function rb_json($value): void { header('Content-Type: application/json; charset=utf-8'); echo json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR); }
function rb_body(): array {
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') === 0) return $_POST;
    $raw = file_get_contents('php://input', false, null, 0, 1048577);
    if (strlen($raw) > 1048576) rb_error(413, 'Solicitud demasiado grande.');
    if ($raw === '') return [];
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) rb_error(400, 'Se requiere JSON.');
    $data = json_decode($raw, true);
    if (!is_array($data) || substr(ltrim($raw), 0, 1) !== '{') rb_error(400, 'Solicitud inválida.');
    return $data;
}
function rb_origin(): void {
    if (in_array($_SERVER['REQUEST_METHOD'], ['GET','HEAD','OPTIONS'], true)) return;
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && $origin !== rb_config()['origin']) rb_error(403, 'Origen de solicitud no autorizado.');
    if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') rb_error(403, 'Solicitud externa no autorizada.');
}
