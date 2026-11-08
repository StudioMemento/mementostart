import {mkdirSync,cpSync,rmSync} from 'node:fs';
const root=new URL('../',import.meta.url);
rmSync(new URL('dist/',root),{recursive:true,force:true});mkdirSync(new URL('dist/',root),{recursive:true});
for(const file of ['index.html','assets','navigation'])cpSync(new URL(file,root),new URL('dist/'+file,root),{recursive:true});
console.log('Static preview built in dist/.');
