<?php
if (!defined('RB_APP')) { http_response_code(404); exit; }
const RB_ROLES = ['desarrollador','administrador','locutor','periodista','invitado','anonimo','solo_lectura'];
function rb_public_user(array $user): array { return array_intersect_key($user, array_flip(['username','role','protected','createdAt'])); }
function rb_hash(string $password): string {
    if (strlen($password) < 12 || strlen($password) > 256) rb_error(400, 'La contraseña debe tener entre 12 y 256 caracteres.');
    return sodium_crypto_pwhash_scryptsalsa208sha256_str($password, SODIUM_CRYPTO_PWHASH_SCRYPTSALSA208SHA256_OPSLIMIT_INTERACTIVE, SODIUM_CRYPTO_PWHASH_SCRYPTSALSA208SHA256_MEMLIMIT_INTERACTIVE);
}
function rb_b64(string $raw): string { return rtrim(strtr(base64_encode($raw), '+/', '-_'), '='); }
function rb_token(array $user): string {
    $payload = rb_b64(json_encode(['u'=>$user['username'],'sv'=>$user['sessionVersion'],'iat'=>time(),'exp'=>time()+43200]));
    return $payload . '.' . rb_b64(hash_hmac('sha256', $payload, rb_config()['secret'], true));
}
function rb_cookie(string $token): void {
    setcookie('rb_session', $token, ['expires'=>$token === '' ? time()-3600 : time()+43200,'path'=>'/','secure'=>strpos(rb_config()['origin'], 'https://') === 0,'httponly'=>true,'samesite'=>'Strict']);
}
function rb_actor(array $state, array $roles = []): array {
    $token = $_COOKIE['rb_session'] ?? '';
    $parts = explode('.', $token);
    if (count($parts) !== 2 || strlen($token) > 4096 || !hash_equals(rb_b64(hash_hmac('sha256', $parts[0], rb_config()['secret'], true)), $parts[1])) rb_error(401, 'Inicia sesión para continuar.');
    $claims = json_decode(base64_decode(strtr($parts[0], '-_', '+/'), true), true);
    if (!is_array($claims) || !is_int($claims['exp'] ?? null) || !is_int($claims['iat'] ?? null) || $claims['exp'] <= time() || $claims['iat'] > time()+60 || $claims['exp']-$claims['iat'] > 43200) rb_error(401, 'La sesión venció.');
    foreach ($state['users'] as $user) {
        if ($user['username'] === ($claims['u'] ?? '') && $user['sessionVersion'] === ($claims['sv'] ?? 0)) {
            if ($roles && !in_array($user['role'], $roles, true)) rb_error(403, 'Tu rol no permite esta operación.');
            return rb_public_user($user);
        }
    }
    rb_error(401, 'La sesión fue revocada.');
}
function rb_limit(array &$s, string $scope, int $limit): string {
    $key = hash_hmac('sha256', $scope . ':' . ($_SERVER['REMOTE_ADDR'] ?? ''), rb_config()['secret']);
    $now = time();
    $s['attempts'] = array_filter($s['attempts'], function($entry) use ($now) { return $entry['until'] > $now; });
    if (count($s['attempts']) > 10000) rb_error(429, 'Espera antes de volver a intentar.');
    if (!isset($s['attempts'][$key])) $s['attempts'][$key] = ['count'=>0,'until'=>$now+900];
    if ($s['attempts'][$key]['count'] >= $limit) { header('Retry-After: 900'); rb_error(429, 'Demasiados intentos. Espera quince minutos.'); }
    return $key;
}
function rb_new_user(array &$s, array $actor, array $input): array {
    $name = rb_text($input['username'] ?? '', 32, true); $role = $input['role'] ?? '';
    if (!preg_match('/^[a-zA-Z0-9._-]{2,32}$/D', $name) || !in_array($role, RB_ROLES, true)) rb_error(400, 'Usuario o rol inválido.');
    foreach ($s['users'] as $user) if ($user['username'] === $name) rb_error(400, 'Ese usuario ya existe.');
    if ($actor['role'] !== 'desarrollador' && ($actor['role'] !== 'administrador' || array_search($role, RB_ROLES, true) <= 1)) rb_error(403, 'No puedes crear ese rol.');
    if (count($s['users']) >= 1000) rb_error(400, 'Se alcanzó el límite de usuarios.');
    $user = ['username'=>$name,'role'=>$role,'passwordHash'=>rb_hash($input['password'] ?? ''),'protected'=>false,'sessionVersion'=>1,'createdAt'=>rb_iso()];
    $s['users'][] = $user;
    return rb_public_user($user);
}
function rb_auth_route(string $route, string $method, array $b, array &$s) {
    if ($route === '/login' && $method === 'POST') {
        $key = rb_limit($s, 'login', 10);
        $password = $b['password'] ?? '';
        if (!is_string($password) || strlen($password)>256 || !is_string($b['username'] ?? null)) rb_error(400, 'Credenciales inválidas.');
        $found = null;
        foreach ($s['users'] as $user) if ($user['username'] === $b['username']) $found = $user;
        $valid = sodium_crypto_pwhash_scryptsalsa208sha256_str_verify($found['passwordHash'] ?? rb_config()['devHash'], $password);
        if (!$found || !$valid) { $s['attempts'][$key]['count']++; rb_error(401, 'Usuario o contraseña incorrectos.'); }
        unset($s['attempts'][$key]); rb_cookie(rb_token($found)); return ['ok'=>true,'user'=>rb_public_user($found)];
    }
    if ($route === '/logout' && $method === 'POST') { rb_cookie(''); return ['ok'=>true]; }
    if ($route === '/me' && $method === 'GET') return ['user'=>rb_actor($s)];
    if ($route === '/users') {
        $actor = rb_actor($s, ['desarrollador','administrador']);
        if ($method === 'GET') return ['users'=>array_map('rb_public_user',$s['users'])];
        if ($method === 'POST') return ['ok'=>true,'user'=>rb_new_user($s,$actor,$b)];
    }
    if (preg_match('#^/users/([^/]+)(/password)?$#D',$route,$m)) {
        $actor = rb_actor($s);
        foreach ($s['users'] as $i=>$user) {
            if ($user['username'] !== $m[1]) continue;
            if ($method === 'DELETE' && empty($m[2])) {
                if ($user['protected'] || $actor['role'] !== 'desarrollador' || $user['username'] === $actor['username']) rb_error(403,'No puedes eliminar ese usuario.');
                array_splice($s['users'],$i,1); return ['ok'=>true];
            }
            if ($method === 'POST' && !empty($m[2])) {
                $canAdmin = $actor['role']==='administrador' && array_search($user['role'],RB_ROLES,true)>1;
                if ($actor['username'] !== $user['username'] && $actor['role'] !== 'desarrollador' && !$canAdmin) rb_error(403,'No puedes cambiar esa contraseña.');
                $s['users'][$i]['passwordHash'] = rb_hash($b['newPassword'] ?? ''); $s['users'][$i]['sessionVersion']++;
                return ['ok'=>true,'reloginRequired'=>true];
            }
        }
        rb_error(404,'Usuario no encontrado.');
    }
    if ($route === '/guests/request' && $method === 'POST') {
        $key = rb_limit($s,'guests',10);
        foreach (['nombre','apellido'] as $name) {
            $b[$name] = rb_text($b[$name] ?? '',180,true);
            if (!preg_match("/^[\p{L}\p{M} .'-]{1,60}$/uD", $b[$name])) rb_error(400,'Nombre o apellido inválido.');
        }
        $name = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '.', iconv('UTF-8','ASCII//TRANSLIT',$b['nombre'].'.'.$b['apellido'])));
        $name = substr(trim($name,'.'),0,24) ?: 'invitado'; $base=$name; $n=1;
        $reserved = array_merge(array_column($s['users'],'username'),array_column($s['guests'],'username'));
        while (in_array($name,$reserved,true)) $name=$base . $n++;
        $request=['id'=>rb_id(),'nombre'=>$b['nombre'],'apellido'=>$b['apellido'],'username'=>$name,'estado'=>'pendiente','createdAt'=>rb_iso()];
        if (count($s['guests'])>=500) rb_error(400,'Hay demasiadas solicitudes pendientes.');
        $s['guests'][]=$request; $s['attempts'][$key]['count']++;
        $mic = $s['live'] ? rb_request_mic($s,['username'=>$name,'role'=>'invitado'], $request['nombre'].' '.$request['apellido'],$request['id']) : null;
        return ['ok'=>true,'request'=>$request,'microphoneRequest'=>$mic];
    }
    if ($route === '/guests' && $method==='GET') { rb_actor($s,['desarrollador','administrador']); return ['guests'=>$s['guests']]; }
    if (preg_match('#^/guests/([^/]+)/approve$#D',$route,$m) && $method==='POST') {
        $actor=rb_actor($s,['desarrollador','administrador']);
        foreach ($s['guests'] as &$g) if ($g['id']===$m[1]) {
            if ($g['estado']!=='pendiente') rb_error(400,'La solicitud ya fue procesada.');
            $password=rb_b64(random_bytes(18)); rb_new_user($s,$actor,['username'=>$g['username'],'role'=>'invitado','password'=>$password]);
            $g['estado']='aprobado'; $g['approvedBy']=$actor['username']; $g['approvedAt']=rb_iso();
            return ['ok'=>true,'request'=>$g,'credentials'=>['username'=>$g['username'],'temporaryPassword'=>$password]];
        }
        rb_error(404,'Solicitud no encontrada.');
    }
    return null;
}
