import {readFile,mkdir,copyFile,rm} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {join,dirname} from 'node:path';import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url)),output=join(root,'dist');
const provenance=JSON.parse(await readFile(join(root,'docs/images/cover-provenance.json'),'utf8'));
const cover=await readFile(join(root,'docs/images/project-cover.png'));
if(createHash('sha256').update(cover).digest('hex')!=='12f23706a1fbbe1abf9026cfacf42146f893752cb474e2cbdd11162c9cd27d60')throw Error('Approved rover cover differs from the reviewed asset.');
if(!provenance)throw Error('Missing cover provenance.');
const files=['index.html',...['app','geometry','navigation','protocol','scenarios','results','worker'].map(name=>`src/${name}.mjs`),'src/styles.css','docs/results/scenario-runs.csv'];
await rm(output,{recursive:true,force:true});for(const file of files){await mkdir(dirname(join(output,file)),{recursive:true});await copyFile(join(root,file),join(output,file));}process.stdout.write(`Built ${files.length} public lab files. Firmware and device interfaces remain separate.\n`);
