// Short-lived, practice-isolated memory only. Google Sheets remains authoritative.
export class PracticeReadCache{
 constructor({ttl=20000,maxEntries=12,maxBytes=12000000,now=()=>Date.now()}={}){Object.assign(this,{ttl,maxEntries,maxBytes,now});this.entries=new Map();}
 invalidate(key){this.entries.delete(key);}
 async read(key,loader,{fresh=false}={}){const now=this.now(),old=this.entries.get(key);if(old?.promise)return old.promise;if(!fresh&&old?.value&&old.expires>now)return {...old.value,sync:{...old.value.sync,cached:true}};
 for(const [k,e] of this.entries)if(!e.promise&&e.expires<=now)this.entries.delete(k);
 while(this.entries.size>=this.maxEntries)this.entries.delete(this.entries.keys().next().value);
 const slot={};this.entries.set(key,slot);slot.promise=(async()=>{const start=this.now();try{const result=await loader();const value={...result,sync:{cached:false,readAt:result.lastRefresh||new Date(start).toISOString(),durationMs:this.now()-start,ttlSeconds:this.ttl/1000}};const bytes=JSON.stringify(value).length*2;if(result.ok&&bytes<=this.maxBytes&&this.entries.get(key)===slot){let used=[...this.entries.values()].reduce((n,e)=>n+(e.bytes||0),0);for(const [other,entry] of this.entries){if(used+bytes<=this.maxBytes)break;if(other!==key&&!entry.promise){used-=entry.bytes||0;this.entries.delete(other);}}slot.bytes=bytes;slot.value=value;slot.expires=this.now()+this.ttl;delete slot.promise;}else if(this.entries.get(key)===slot)this.entries.delete(key);return value;}catch(e){if(this.entries.get(key)===slot)this.entries.delete(key);throw e;}})();return slot.promise;
 }
}
export async function practiceCacheKey(env,principal){const value=JSON.stringify([principal,env.APPS_SCRIPT_URL||'',env.APPS_SCRIPT_SECRET||'']);return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export const practiceReads=new PracticeReadCache();
