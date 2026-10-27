import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {fileURLToPath} from 'node:url';
const execute=promisify(execFile),directory=await mkdtemp(join(tmpdir(),'rover-native-'));
try{
 for(const source of ['controller_test.cpp','sketch_output_test.cpp']){
  const binary=join(directory,source.replace('.cpp',''));
  await execute(process.env.CXX??'c++',['-std=c++11','-Wall','-Wextra','-Werror','-pedantic','-fsanitize=address,undefined','-I',fileURLToPath(new URL('../firmware/tests/arduino-mock',import.meta.url)),fileURLToPath(new URL(`../firmware/tests/${source}`,import.meta.url)),'-o',binary],{timeout:60000,maxBuffer:1024*1024});
  const result=await execute(binary,[],{timeout:10000,maxBuffer:1024*1024});process.stdout.write(result.stdout);
 }
}finally{await rm(directory,{recursive:true,force:true});}
