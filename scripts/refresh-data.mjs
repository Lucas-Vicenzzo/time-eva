// Prepare a candidate in isolation. Publication is a separate, validated step.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {refreshHistory} from './fetch-history.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const destination=process.argv[2]&&path.resolve(process.argv[2]);
if(!destination||destination===root)throw new Error('Provide a separate staging directory: node scripts/refresh-data.mjs /path/to/candidate');
await fs.mkdir(destination,{recursive:true});
if((await fs.readdir(destination)).length)throw new Error('Staging directory must be empty');
await fs.mkdir(path.join(destination,'src/data'),{recursive:true});
for(const name of ['earthdata-demo.json','climate-history.json'])await fs.copyFile(path.join(root,'src/data',name),path.join(destination,'src/data',name));
try{await fs.cp(path.join(root,'data/processed'),path.join(destination,'data/processed'),{recursive:true});}
catch(error){if(error.code!=='ENOENT')throw error;}
await refreshHistory({output:path.join(destination,'src/data/climate-history.json')});
execFileSync(process.env.PYTHON||'python3',[path.join(root,'scripts/update-earthdata.py'),'--destination',destination],{stdio:'inherit'});
console.log('Candidate prepared. Run validation and build before publishing.');
