const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'stackcp');
const version = require('../package.json').version;
const manifest = { version, files: {} };
function write(name, content) {
  if (!/^[a-z0-9/_.-]+$/i.test(name) || name.includes('..') || name.startsWith('private/')) throw Error('Ruta de artefacto inválida');
  const target=path.join(output,name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if(fs.existsSync(target)&&fs.lstatSync(target).isSymbolicLink())throw Error('Enlace no permitido');
  fs.writeFileSync(target,content);
  manifest.files[name]=crypto.createHash('sha256').update(content).digest('hex');
}
function copyTree(dir, prefix='') {
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.isSymbolicLink())throw Error('Enlace no permitido');
    const name=prefix+entry.name;
    if(entry.isDirectory())copyTree(path.join(dir,entry.name),name+'/');
    else write(name,fs.readFileSync(path.join(dir,entry.name)));
  }
}
copyTree(path.join(root,'hosting/stackcp'));
for(const folder of ['css','media'])copyTree(path.join(root,'public',folder),folder+'/');
function adapt(text) {
  return text.replaceAll('/api/', '/api.php?route=/')
    .replaceAll('/embed?','/embed.php?').replaceAll('"/embed"','"/embed.php"')
    .replaceAll('4.1.0-alpha.1',version)
    .replaceAll('Oyentes WAV:', 'Oyentes WebRTC:')
    .replaceAll('Oyentes conectados a la señal WAV:', 'Oyentes conectados al vivo:')
    .replaceAll('AutoDJ utiliza la señal WAV de continuidad. En Vercel cada conexion se renueva al alcanzar el tiempo configurado.', 'AutoDJ reproduce la biblioteca programada. Durante un vivo, el navegador del conductor debe mantener abierto el estudio.');
}
for(const file of fs.readdirSync(path.join(root,'public/js'))){
  if(file==='blob-client.js'||file==='blob-upload-entry.js')continue;
  let text=adapt(fs.readFileSync(path.join(root,'public/js',file),'utf8'));
  if(file==='app.js'){
    for(const name of ['inicio','administrativo','en-vivo','biblioteca','programacion','informes','reproductor','diagnostico'])text=text.replaceAll(`'/${name}'`,`'/index.php?section=${name}'`);
    text=text.replaceAll('PATH_SECTIONS[location.pathname]', 'PATH_SECTIONS[location.pathname + location.search]');
    text=text.replaceAll('location.pathname !== pathname','location.pathname + location.search !== pathname');
  }
  text=text.replace(/(\/api\.php\?route=\/[^\s'"`?]+)\?/g,'$1&');
  write('js/'+file,text);
}
const guard="<?php if (!defined('RB_APP')) { http_response_code(404); exit; } ?>\n";
for(const [source,dest] of [['index.html','panel.php'],['embed.html','player.php']]){
  let text=adapt(fs.readFileSync(path.join(root,'public',source),'utf8'));
  text=text.replace('<script src="/js/blob-client.js"></script>','');
  write('core/'+dest,guard+text);
}
function seed(file){const source=fs.readFileSync(path.join(root,file),'utf8');const start=source.indexOf('function seed() {');const end=source.indexOf('\nfunction ',start+1);if(start<0||end<0)throw Error('Semilla no encontrada');return vm.runInNewContext('('+source.slice(start,end).trim()+')()', {nowIso:()=> '2026-09-08T00:00:00Z'});}
const mediaSource=fs.readFileSync(path.join(root,'server/core/media-library.js'),'utf8');
function constant(name){const match=mediaSource.match(new RegExp('const '+name+' = Object.freeze\\(([\\s\\S]*?)\\);'));if(!match)throw Error('Catálogo no encontrado');return vm.runInNewContext('('+match[1]+')');}
const seeded={media:seed('server/core/media-library.js').items,programming:seed('server/core/programming.js'),categories:constant('CATEGORIES'),licenseTypes:constant('LICENSE_TYPES')};
write('seed.json',JSON.stringify(seeded,null,2)+'\n');
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`StackCP ${version}: ${Object.keys(manifest.files).length} archivos de aplicación. Datos privados excluidos.`);
