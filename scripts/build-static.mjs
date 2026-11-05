import {mkdirSync,cpSync,rmSync} from 'node:fs';
rmSync('dist',{recursive:true,force:true});mkdirSync('dist');
for(const name of ['index.html','assets','navigation','qa'])cpSync(name,'dist/'+name,{recursive:true});
console.log('Static build: dist/');
