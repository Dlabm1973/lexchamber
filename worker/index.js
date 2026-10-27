import {practiceReads,practiceCacheKey} from './read-cache.js';
import {practiceIdentity,secretaryAction,secretaryData,manageTeam,publicTeam} from './team.js';
import {createClerkClient} from '@clerk/backend';
import {entitlement,restrictData,proAction,manageSubscription,onboardingSubscription} from './subscriptions.js';
import {identity,clerkEnabled,clerkReady,clerkDomain,withAuthCookies} from './auth.js';
import {assets} from './assets.js';
const security={'X-Robots-Tag':'noindex, nofollow, noarchive','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-src 'self' blob:; connect-src 'self'; object-src 'self' blob:; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com"};
const json=(v,status=200)=>Response.json(v,{status,headers:security});
async function backend(env,action,payload,actor,performedBy){if(!env.APPS_SCRIPT_URL||!env.APPS_SCRIPT_SECRET)return{ok:false,code:'NOT_CONFIGURED',message:'Secure Google Sheets connection is awaiting configuration. No records have been loaded or saved.'};if(!/^https:\/\/script.google.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(env.APPS_SCRIPT_URL))throw Error('Invalid backend configuration.');const message=JSON.stringify({action,payload,actor,performedBy:performedBy||actor,timestamp:Date.now(),nonce:crypto.randomUUID()});const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.APPS_SCRIPT_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(message));const signature=Array.from(new Uint8Array(sig),n=>n.toString(16).padStart(2,'0')).join('');const r=await fetch(env.APPS_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({message,signature}),redirect:'follow',signal:AbortSignal.timeout(55000)});if(!r.ok)throw Error('Google Sheets backend is unavailable. Save outcome is unconfirmed; retry with the same operation.');const v=await r.json();if(typeof v.ok!=='boolean')throw Error('Backend returned an invalid acknowledgement.');return v;}
export async function handle(request,env,setAuthHeaders,authenticate=identity,resolvePractice=practiceIdentity){const url=new URL(request.url);let responseSecurity={...security};
try{const domain=clerkDomain(env.CLERK_PUBLISHABLE_KEY);if(domain){responseSecurity['Content-Security-Policy']=security['Content-Security-Policy'].replace("script-src 'self'",`script-src 'self' https://${domain} https://challenges.cloudflare.com`).replace("style-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com").replace("img-src 'self' data:",`img-src 'self' data: https://${domain} https://img.clerk.com`).replace("frame-src 'self' blob:",`frame-src 'self' blob: https://${domain} https://challenges.cloudflare.com`).replace("connect-src 'self'",`connect-src 'self' https://${domain} https://clerk-telemetry.com`).replace("object-src 'self' blob:","font-src 'self' data: https://fonts.gstatic.com; worker-src 'self' blob:; object-src 'self' blob:");}
const assetResponse=path=>{const asset=assets[path];return asset?new Response(asset.encoding==='base64'?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body,{headers:{...responseSecurity,'Content-Type':asset.type}}):new Response('Not found',{status:404,headers:responseSecurity});};
if(request.method==='GET'){
if(url.pathname==='/robots.txt')return new Response('User-agent: *\nDisallow: /\n',{headers:{...security,'Content-Type':'text/plain; charset=utf-8'}});
if(url.pathname==='/'||url.pathname==='/landing.html')return assetResponse('/landing.html');
if(['/onboarding.js','/workspace.js','/backend-guide.js','/backend-guide.html','/Backend_Setup.txt','/qaga-logo.png','/landing.css','/landing-hero.jpg','/landing-work.jpg','/landing-library.jpg','/photography.html','/landing.js','/favicon.svg','/clerk-client.js','/auth-page.js'].includes(url.pathname))return assetResponse(url.pathname);
if(url.pathname==='/auth/config')return json({provider:clerkEnabled(env)?'clerk':'chatgpt',ready:clerkReady(env)&&!!domain,publishableKey:clerkEnabled(env)?env.CLERK_PUBLISHABLE_KEY||null:null,domain:clerkEnabled(env)?domain:null,legacySignInUrl:'/signin-with-chatgpt?return_to=%2Fapp'});
if(/^\/sign-(?:in|up)(?:\/|$)/.test(url.pathname))return assetResponse('/auth.html');
}
let who=await authenticate(request,env);setAuthHeaders(who.responseHeaders);if(who.configurationError)return json({ok:false,message:'Secure sign-in is not configured.'},503);if(who.redirect)return Response.redirect(who.redirect,307);const email=who.email,user=who.userId;
if(!user||!email){if(url.pathname.startsWith('/api/'))return json({ok:false,code:'AUTH_REQUIRED',message:clerkEnabled(env)?'Sign in with your approved Clerk account.':'Sign in with your approved ChatGPT account.'},401);return Response.redirect(url.origin+(clerkEnabled(env)?'/sign-in':'/signin-with-chatgpt?return_to=%2Fapp'),302);}
if(clerkEnabled(env)){who=await resolvePractice(who,env);if(who.accessRevoked)return json({ok:false,code:'ACCESS_REVOKED',message:'Secretary access has been revoked or is not active. Ask the advocate to link your verified account.'},403);}
// Preserve the original practice's connection when its verified approved user signs in.
const legacyApproved=(env.ALLOWED_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
if(clerkEnabled(env)&&who.role!=='secretary'&&!who.backend?.url&&legacyApproved.includes(email.toLowerCase())&&env.APPS_SCRIPT_URL&&env.APPS_SCRIPT_SECRET){
 const client=createClerkClient({secretKey:env.CLERK_SECRET_KEY,publishableKey:env.CLERK_PUBLISHABLE_KEY});
 const current=await client.users.getUser(user),meta=current.privateMetadata||{};
 const savedBackend=meta.lexchamberBackend||{url:env.APPS_SCRIPT_URL,secret:env.APPS_SCRIPT_SECRET};
 const savedSubscription=meta.lexchamberSubscription||onboardingSubscription(null,'pro','monthly');
 if(!meta.lexchamberBackend||!meta.lexchamberSubscription)await client.users.updateUserMetadata(user,{privateMetadata:{lexchamberBackend:savedBackend,lexchamberSubscription:savedSubscription}});
 who={...who,backend:savedBackend,subscription:savedSubscription};
}
if(url.pathname==='/api/onboarding'){
 if(request.method==='GET')return json({ok:true,email,connected:!!who.backend?.url,subscription:entitlement({...who,email:who.practiceEmail||email},env),role:who.role||'advocate'});
 if(request.method!=='POST'||request.headers.get('origin')!==url.origin)return json({ok:false,message:'Use the setup form.'},403);
 if(who.role==='secretary')return json({ok:false,message:'Only the advocate can change the practice backend.'},403);
 try{const text=await request.text();if(text.length>5000)throw Error('Request too large.');const v=JSON.parse(text);
 if(!['starter','pro'].includes(v.plan)||!['monthly','annual'].includes(v.billingCycle)||!/^https:\/\/script.google.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(v.url||'')||typeof v.secret!=='string'||v.secret.length<32)throw Error('Choose a plan and enter your deployed Apps Script URL and a shared secret of at least 32 characters.');
 const result=await backend({...env,APPS_SCRIPT_URL:v.url,APPS_SCRIPT_SECRET:v.secret},'read',{},email);if(!result.ok)throw Error(result.message||'Your backend could not be verified.');
 const client=createClerkClient({secretKey:env.CLERK_SECRET_KEY,publishableKey:env.CLERK_PUBLISHABLE_KEY});const current=await client.users.getUser(user),old=current.privateMetadata?.lexchamberSubscription;
 const subscription=onboardingSubscription(old,v.plan,v.billingCycle);
 await client.users.updateUserMetadata(user,{privateMetadata:{lexchamberBackend:{url:v.url,secret:v.secret},lexchamberSubscription:subscription}});return json({ok:true});
 }catch(e){return json({ok:false,message:e.message||'Setup could not be completed.'},400);}
}
if(who.backend?.url&&who.backend?.secret)env={...env,APPS_SCRIPT_URL:who.backend.url,APPS_SCRIPT_SECRET:who.backend.secret,ALLOWED_EMAILS:email};
const setupAssets=['/onboarding.html','/onboarding.js','/workspace.js'];
if(url.pathname==='/app'||url.pathname==='/app/'||setupAssets.includes(url.pathname)){if(!who.backend?.url&&!(env.ALLOWED_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).includes(email.toLowerCase()))return assetResponse(url.pathname.endsWith('.js')?url.pathname:'/onboarding.html');}
const approved=(env.ALLOWED_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);if(!approved.length){return json({ok:false,code:'ACCESS_NOT_CONFIGURED',message:'Approved-user access must be configured before financial records can be opened.'},503);}else if(!approved.includes(email.toLowerCase()))return json({ok:false,message:'Your account has been created, but access to this practice has not been approved. Contact info@lexchamber.co.za.'},403);
if(url.pathname==='/onboarding.html'||url.pathname==='/onboarding.js')return assetResponse(url.pathname);
const tier={...entitlement({...who,email:who.practiceEmail||email},env),role:who.role||'advocate'};if(tier.role==='secretary'){tier.owner=false;tier.pro=false;}
const actor=who.practiceEmail||email;
if(url.pathname==='/api/team'){
 if(tier.role==='secretary')return json({ok:false,message:'Only the advocate can manage practice access.'},403);
 if(!tier.access)return json({ok:false,message:'An active trial or paid plan is required.'},402);
 if(request.method==='GET')return json({ok:true,team:publicTeam(who.team)});
 if(request.method!=='POST'||request.headers.get('origin')!==url.origin)return json({ok:false,message:'Use the team form.'},403);
 try{const text=await request.text();if(text.length>2000)throw Error('Request too large.');return json({ok:true,...await manageTeam(env,who,JSON.parse(text))});}catch(e){return json({ok:false,message:e.message||'Team access could not be updated.'},400);}
}
if(url.pathname==='/api/subscription'){
 if(request.method==='GET')return json({ok:true,...tier});
 if(request.method!=='POST')return json({ok:false,message:'Method not allowed.'},405);
 if(!tier.owner||request.headers.get('origin')!==url.origin)return json({ok:false,message:'Owner access is required.'},403);
 if(!env.CLERK_SECRET_KEY)return json({ok:false,message:'Clerk is not configured.'},503);
 try{const body=await request.text();if(body.length>3000)return json({ok:false,message:'Request too large.'},413);return json({ok:true,...await manageSubscription(env,email,JSON.parse(body))});}catch(e){return json({ok:false,message:e.message||'Subscription could not be saved.'},400);}
}
if((url.pathname==='/app'||url.pathname==='/app/')&&!tier.access)return assetResponse('/onboarding.html');
if(url.pathname.startsWith('/api/')&&!tier.access)return json({ok:false,code:'SUBSCRIPTION_REQUIRED',message:'Your trial or subscription is not active. Contact info@lexchamber.co.za to activate a plan. Your backend data remains yours.'},402);
if(url.pathname==='/api/status')return json({ok:true,workspaceKey:await practiceCacheKey(env,who.practiceUserId||user),accountId:user,subscription:tier,emailConfigured:!!env.BREVO_API_KEY,senderEmail:'accounts@lexchamber.co.za',connected:!!(env.APPS_SCRIPT_URL&&env.APPS_SCRIPT_SECRET&&approved.length),email,spreadsheetId:null});
if(url.pathname==='/api/send-email'){
if(request.method!=='POST')return json({ok:false,message:'Method not allowed.'},405);
if(request.headers.get('origin')!==url.origin)return json({ok:false,message:'Use LexChamber to send documents.'},403);
if(!env.BREVO_API_KEY)return json({ok:false,message:'Direct email is not configured. Download the email draft with its PDF attachment, or configure the Brevo API key.'},503);
if(Number(request.headers.get('content-length')||0)>7500000)return json({ok:false,message:'Attachment exceeds 5 MB.'},413);
const text=await request.text();if(text.length>7500000)return json({ok:false,message:'Attachment exceeds 5 MB.'},413);
let v;try{v=JSON.parse(text);}catch{return json({ok:false,message:'Invalid email request.'},400);}
if(typeof v.to!=='string'||!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(v.to)||typeof v.subject!=='string'||!v.subject.trim()||v.subject.length>300||/[\r\n]/.test(v.subject)||typeof v.message!=='string'||!v.message.trim()||v.message.length>20000||typeof v.filename!=='string'||!/^[-a-zA-Z0-9_.]+\.pdf$/i.test(v.filename)||typeof v.base64!=='string'||v.base64.length>7000000||!/^JVBERi0[A-Za-z0-9+/]*={0,2}$/.test(v.base64))return json({ok:false,message:'Review the recipient, message and PDF attachment.'},400);
const r=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'Content-Type':'application/json','api-key':env.BREVO_API_KEY},body:JSON.stringify({sender:{name:'LexChamber Accounts',email:'accounts@lexchamber.co.za'},replyTo:{name:'LexChamber Accounts',email:'accounts@lexchamber.co.za'},to:[{email:v.to}],subject:v.subject,textContent:v.message,attachment:[{name:v.filename,content:v.base64}]}),signal:AbortSignal.timeout(25000)});
if(!r.ok)return json({ok:false,message:'Brevo did not accept the email. Check the API key, verified accounts sender and sending allowance.'},502);
const result=await r.json();if(!result.messageId)return json({ok:false,message:'Email submission is unconfirmed. Check the Brevo sent log before retrying.'},502);
return json({ok:true,messageId:result.messageId});
}
if(url.pathname==='/api/data'){if(request.method!=='GET')return json({ok:false,message:'Method not allowed.'},405);const key=await practiceCacheKey(env,who.practiceUserId||user),records=restrictData(await practiceReads.read(key,()=>backend(env,'read',{},actor,email),{fresh:url.searchParams.get('fresh')==='1'}),tier);return json({...((tier.role==='secretary')?secretaryData(records):records),subscription:tier});}
if(url.pathname==='/api/write'){if(request.method!=='POST'||request.headers.get('origin')!==url.origin)return json({ok:false,message:'Use the practice app to submit changes.'},403);if(Number(request.headers.get('content-length')||0)>8000000)return json({ok:false,message:'Attachment exceeds 5 MB.'},413);const text=await request.text();if(text.length>8000000)return json({ok:false,message:'Attachment exceeds 5 MB.'},413);const v=JSON.parse(text);if(!/^[0-9a-f-]{36}$/i.test(v.operationId||'')||!['draft','issue','amend','bankAccount','bankStatement','bankImport','firm','matter','payment','reversePayment','transaction','settings','cancel','creditNote','migrateIds','initialise','document','openingBalance'].includes(v.action))return json({ok:false,message:'Invalid operation.'},400);if(tier.role==='secretary'&&!secretaryAction(v.action,v.payload))return json({ok:false,code:'ROLE_RESTRICTED',message:'Secretary access allows firms, matters, draft invoices and payment recording. Ask the advocate to approve this change.'},403);if(!tier.pro&&proAction(v.action,v.payload))return json({ok:false,code:'PRO_REQUIRED',message:'This feature requires Pro.'},403);const key=await practiceCacheKey(env,who.practiceUserId||user);if(v.workspaceKey&&v.workspaceKey!==key)return json({ok:false,code:'WORKSPACE_CHANGED',message:'The practice connection changed. Reopen the correct workspace before retrying.'},409);practiceReads.invalidate(key);try{return json(await backend(env,v.action,{...v.payload,operationId:v.operationId},actor,email));}finally{practiceReads.invalidate(key);}}
if(url.pathname==='/api/file'){const id=url.searchParams.get('id');if(!/^[\w-]+$/.test(id||''))return json({ok:false,message:'Invalid file reference.'},400);if(!tier.pro||tier.role==='secretary'){const records=await backend(env,'read',{},actor,email);if(!records.ok||!(records.data?.Invoices||[]).some(i=>i.pdfFileId===id))return json({ok:false,message:'This file is not available on Starter.'},403);}const r=await backend(env,'file',{id},actor,email);if(!r.ok)return json(r,403);const bytes=Uint8Array.from(atob(r.base64),c=>c.charCodeAt(0));return new Response(bytes,{headers:{...security,'Content-Type':r.mimeType||'application/pdf','Content-Disposition':`inline; filename="${r.name.replace(/[^a-zA-Z0-9_.-]/g,'_')}"`}});}
if(request.method!=='GET')return json({ok:false,message:'Method not allowed.'},405);const asset=assets[url.pathname==='/app'||url.pathname==='/app/'?'/index.html':url.pathname];if(!asset)return new Response('Not found',{status:404,headers:security});return new Response(asset.encoding==='base64'?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body,{headers:{...responseSecurity,'Content-Type':asset.type}});
}catch{return json({ok:false,code:'UNCONFIRMED',message:'The connection failed. No success is confirmed. Refresh and retry the same pending operation.'},503);}}
export default{async fetch(request,env){let authHeaders;const response=await handle(request,env,h=>{authHeaders=h;});return withAuthCookies(response,authHeaders);}};
