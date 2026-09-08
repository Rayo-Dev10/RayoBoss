const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
require('../server/load-env')();
const target=path.resolve(__dirname,'../data/stackcp-deploy/config.php');
if(fs.existsSync(target)){console.log('Se conserva la configuración protegida existente.');process.exit(0);}
const password=process.env.RAYOBOSS_DEV_PASSWORD;
const secret=process.env.RAYOBOSS_SECRET;
if(typeof password!=='string'||password.length<12||typeof secret!=='string'||secret.length<32)throw Error('Configura los secretos locales antes de desplegar.');
fs.mkdirSync(path.dirname(target),{recursive:true});
const args=process.platform==='win32'?['-d','extension=sodium']:[];
execFileSync('php',[...args,path.join(__dirname,'provision-stackcp.php'),target],{input:JSON.stringify({password,secret,origin:'https://radio.rayogestion.com'}),stdio:['pipe','pipe','pipe']});
console.log('Configuración protegida preparada en data/stackcp-deploy; no se incluye en Git ni en el artefacto.');
