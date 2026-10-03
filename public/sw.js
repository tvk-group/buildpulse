const CACHE="buildpulse-shell-v6";
const SHELL=["/","/archive","/local","/world","/technology","/markets","/people","/sports","/arts","/social","/blog","/marketplace","/subscriptions","/about","/methodology"];
const PRIVATE=["/api/","/account","/admin","/advertiser","/auth","/contribute","/preferences","/review","/workforce","/marketplace/sell"];

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.allSettled(SHELL.map(async path=>{
      try{
        const response=await fetch(path,{cache:"reload"});
        if(response.ok)await cache.put(path,response);
      }catch{}
    }));
  })());
});

self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener("message",event=>{
  if(event.data?.type==="SKIP_WAITING")self.skipWaiting();
});

self.addEventListener("push",event=>{let data={};try{data=event.data?.json()??{}}catch{data={body:event.data?.text()??""}}const title=String(data.title||"BuildPulse"),options={body:String(data.body||""),icon:"/icons/icon-192.png",badge:"/icons/icon-192.png",data:{href:String(data.href||"/account")},tag:String(data.tag||"buildpulse")};event.waitUntil(self.registration.showNotification(title,options))});
self.addEventListener("notificationclick",event=>{event.notification.close();const href=event.notification.data?.href||"/account";event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{for(const c of list){if("focus"in c){c.navigate(href);return c.focus()}}return clients.openWindow(href)}))});

self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=="GET"||url.origin!==location.origin||PRIVATE.some(prefix=>url.pathname.startsWith(prefix)))return;
  const cacheable=event.request.mode==="navigate"||["style","script","image","font"].includes(event.request.destination);
  if(!cacheable)return;
  event.respondWith(
    fetch(event.request).then(response=>{
      const cc=response.headers.get("cache-control")||"";if(response.ok&&response.type==="basic"&&!/no-store|private/i.test(cc)&&!response.headers.has("set-cookie")){
        const copy=response.clone();
        event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));
      }
      return response;
    }).catch(async()=>{
      const hit=await caches.match(event.request);
      if(hit)return hit;
      if(event.request.mode==="navigate")return (await caches.match("/"))||Response.error();
      return Response.error();
    })
  );
});
