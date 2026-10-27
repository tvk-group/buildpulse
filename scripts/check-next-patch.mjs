import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const next=require('next/package.json').version;
const [major,minor,patch]=next.split('.').map(Number);
if (!Number.isInteger(major)||!Number.isInteger(minor)||!Number.isInteger(patch)||
 major<16||(major===16&&(minor<4||(minor===4&&patch<1)))) {
 console.error('SECURITY_RELEASE_BLOCKED: installed Next.js '+next+' is below patched 16.4.1');
 process.exit(1);
}
console.log('Next.js patched version verified: '+next);
