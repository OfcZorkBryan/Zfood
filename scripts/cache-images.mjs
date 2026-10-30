import {mkdir,writeFile,stat} from 'node:fs/promises';
import {products} from '../src/catalog.js';
await mkdir('public/media',{recursive:true});
const queue=[...products];let failures=0;
await Promise.all(Array.from({length:4},async()=>{
  for(let p=queue.shift();p;p=queue.shift()){
    const path=`public/media/${p.id}.jpg`;
    if(await stat(path).catch(()=>false))continue;
    try{
      const response=await fetch(`https://images.unsplash.com/${p.image}?auto=format&fit=crop&w=900&q=82`,{signal:AbortSignal.timeout(25000)});
      if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw new Error(`HTTP ${response.status}`);
      await writeFile(path,new Uint8Array(await response.arrayBuffer()));console.log(`Imagem ${p.id} salva`);
    }catch(error){failures++;console.error(`Imagem ${p.id}: ${error.message}`);}
  }
}));
if(failures)process.exitCode=1;
