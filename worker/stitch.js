const BASE='https://express.stitch.money';
const tokens=new Map();
export class StitchError extends Error{constructor(message,status=400){super(message);this.status=status;}}
export function checkoutURL(value,env){const url=new URL(value);if(url.origin!==BASE||!url.pathname.startsWith('/subscribe/'))throw new StitchError('Invalid checkout response.',502);url.searchParams.delete('redirect_url');if(env.STITCH_REDIRECT_VERIFIED==='true')url.searchParams.set('redirect_url','https://www.lexchamber.co.za/billing/return');return url.href;}
export function stitchMode(env){return env.STITCH_MODE==='live'?'live':'test';}
export function billingPrice(cycle){if(!['monthly','annual'].includes(cycle))throw new StitchError('Choose monthly or annual billing.');return cycle==='monthly'?79900:814980;}
export function nextPeriod(date,cycle){const d=new Date(date);if(!Number.isFinite(+d))throw new StitchError('Invalid payment date.');const day=d.getUTCDate();d.setUTCDate(1);if(cycle==='annual')d.setUTCFullYear(d.getUTCFullYear()+1);else d.setUTCMonth(d.getUTCMonth()+1);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString();}
export function stitchReady(env){return !!(env.BILLING_DB&&env.STITCH_CLIENT_ID&&env.STITCH_CLIENT_SECRET&&env.STITCH_WEBHOOK_SECRET&&env.STITCH_ENABLED==='true');}
function configuration(env){if(!stitchReady(env))throw new StitchError('Subscription payments are awaiting configuration. Please contact support@lexchamber.co.za.',503);if((stitchMode(env)==='test')!==env.STITCH_CLIENT_ID.startsWith('test-'))throw new StitchError('Payment environment configuration does not match.',503);}
export async function stitchAPI(env,path,{method='GET',body,scope='client_recurringpaymentconsentrequest'}={},transport=fetch){
 const cacheKey=env.STITCH_CLIENT_ID+':'+scope;let cached=tokens.get(cacheKey);
 if(!cached||cached.secret!==env.STITCH_CLIENT_SECRET||cached.expires<Date.now()){
  const r=await transport(BASE+'/api/v1/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:env.STITCH_CLIENT_ID,clientSecret:env.STITCH_CLIENT_SECRET,scope}),signal:AbortSignal.timeout(15000)});
  const v=await r.json();if(!r.ok||!v.success||!v.data?.accessToken)throw new StitchError('Stitch authentication failed. Ask support to check the credentials and recurring-payment permission.',503);
  cached={secret:env.STITCH_CLIENT_SECRET,token:v.data.accessToken,expires:Date.now()+14*60000};tokens.set(cacheKey,cached);
 }
 const r=await transport(BASE+path,{method,headers:{Authorization:'Bearer '+cached.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 const v=await r.json();if(!r.ok||!v.success){if(r.status===401)tokens.delete(cacheKey);throw new StitchError(r.status===403?'Stitch recurring payments are not enabled for this account. Contact Stitch support.':'Stitch could not confirm this request. Check the existing subscription before retrying.',502);}return v.data;
}
export async function billingRecord(env,id){return env.BILLING_DB?env.BILLING_DB.prepare('SELECT * FROM stitch_subscriptions WHERE user_id = ?').bind(id).first():null;}
export async function paidSubscription(env,id){const r=await billingRecord(env,id);return r?.mode==='live'&&r.paid_through?{plan:'pro',status:'active',billingCycle:r.cycle,paidThrough:r.paid_through}:null;}
function testAllowed(env,email){return (env.STITCH_TEST_EMAILS||env.OWNER_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).includes(email.toLowerCase());}
export async function billingAction(request,env,who,transport=fetch){
 const path=new URL(request.url).pathname;const id=who.userId;
 if(who.role==='secretary')throw new StitchError('Only the advocate can manage subscriptions.',403);
 if(request.method==='GET'){const r=await billingRecord(env,id);return {ok:true,enabled:stitchReady(env)&&(stitchMode(env)==='live'||testAllowed(env,who.email)),mode:stitchMode(env),prices:{monthly:79900,annual:814980},subscription:r?{status:r.state,billingCycle:r.cycle,paidThrough:r.paid_through,cancelledAt:r.cancelled_at,checkoutUrl:r.state==='pending'&&r.checkout_url?checkoutURL(r.checkout_url,env):null}:null};}
 if(request.method!=='POST')throw new StitchError('Method not allowed.',405);
 if(request.headers.get('origin')!==new URL(request.url).origin)throw new StitchError('Use the subscription page.',403);
 configuration(env);if(stitchMode(env)==='test'&&!testAllowed(env,who.email))throw new StitchError('Test checkout is restricted to approved testers.',403);
 const old=await billingRecord(env,id);
 if(path==='/api/billing/cancel'){
  if(!old?.subscription_id)throw new StitchError('No subscription is available to cancel.');
  if(old.mode!==stitchMode(env))throw new StitchError('The subscription belongs to another payment environment.',409);
  if(old.state!=='cancelled'){
   const v=await stitchAPI(env,'/api/v1/subscriptions/'+encodeURIComponent(old.subscription_id)+'/cancel',{method:'POST'},transport);
   if(v?.status!=='CANCELLED')throw new StitchError('Cancellation was not confirmed by Stitch.',502);
   await env.BILLING_DB.prepare("UPDATE stitch_subscriptions SET state='cancelled',cancelled_at=? WHERE user_id=?").bind(new Date().toISOString(),id).run();
  }return {ok:true,message:'Subscription cancelled. Any confirmed paid access remains available until its paid-through date.'};
 }
 if(path!=='/api/billing/checkout')throw new StitchError('Not found.',404);
 const text=await request.text();if(text.length>1000)throw new StitchError('Request too large.',413);const input=JSON.parse(text),amount=billingPrice(input.billingCycle);
 if(input.acceptRecurring!==true)throw new StitchError('Confirm the recurring amount before continuing.');
 const name=String(input.payerFullName||'').trim();if(!name||name.length>20)throw new StitchError('Enter the cardholder name, up to 20 characters as required by Stitch.');
 if(old){if(old.mode!==stitchMode(env))throw new StitchError('An existing subscription requires support review before switching environments.',409);if(old.state==='pending'&&old.checkout_url&&old.cycle===input.billingCycle)return {ok:true,url:checkoutURL(old.checkout_url,env)};throw new StitchError('An existing subscription or unconfirmed request is recorded. Contact support before creating another subscription.',409);}
 const now=new Date(),next=new Date(nextPeriod(now,input.billingCycle));
 // Anchor on day 28 at the latest so monthly recurrences cannot skip short months.
 if(next.getUTCDate()>28)next.setUTCDate(28);
 const reference='LC-'+crypto.randomUUID();
 await env.BILLING_DB.prepare('INSERT INTO stitch_subscriptions(user_id,reference,cycle,amount,mode,state,created_at) VALUES(?,?,?,?,?,?,?)').bind(id,reference,input.billingCycle,amount,stitchMode(env),'creating',now.toISOString()).run();
 const recurrence=input.billingCycle==='annual'?{frequency:'YEARLY',interval:1,byMonth:next.getUTCMonth()+1,byMonthDay:next.getUTCDate()}:{frequency:'MONTHLY',interval:1,byMonthDay:next.getUTCDate()};
 try{
  const v=await stitchAPI(env,'/api/v1/subscriptions',{method:'POST',body:{amount,initialAmount:amount,merchantReference:reference,startDate:next.toISOString(),payerFullName:name,email:who.email,payerId:id,recurrence}},transport);
  const target=new URL(v.url);if(target.origin!==BASE||!target.pathname.startsWith('/subscribe/')||!v.id)throw new StitchError('Invalid checkout response.',502);
  const checkout=checkoutURL(target.href,env);
  await env.BILLING_DB.prepare("UPDATE stitch_subscriptions SET subscription_id=?,checkout_url=?,state='pending' WHERE user_id=?").bind(v.id,checkout,id).run();
  return {ok:true,url:checkout};
 }catch(e){await env.BILLING_DB.prepare("UPDATE stitch_subscriptions SET state='unconfirmed' WHERE user_id=? AND state='creating'").bind(id).run();throw e;}
}
export async function verifyStitch(raw,headers,secret,now=Date.now()){
 const id=headers.get('svix-id'),timestamp=headers.get('svix-timestamp'),signatures=headers.get('svix-signature');
 if(!id||!/^\d+$/.test(timestamp||'')||Math.abs(now/1000-Number(timestamp))>300||!signatures||!secret?.startsWith('whsec_'))return false;
 try{const key=await crypto.subtle.importKey('raw',Uint8Array.from(atob(secret.slice(6)),x=>x.charCodeAt(0)),{name:'HMAC',hash:'SHA-256'},false,['verify']);for(const signature of signatures.split(' ')){const [version,value]=signature.split(',');if(version==='v1'&&value&&await crypto.subtle.verify('HMAC',key,Uint8Array.from(atob(value),x=>x.charCodeAt(0)),new TextEncoder().encode(id+'.'+timestamp+'.'+raw)))return true;}}catch{}return false;
}
export async function stitchWebhook(request,env,transport=fetch){
 const reply=(v,status)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='POST')return reply({ok:false},405);
 if(!stitchReady(env))return reply({ok:false},503);
 if(Number(request.headers.get('content-length')||0)>24000)return reply({ok:false},413);
 const raw=await request.text();if(raw.length>24000)return reply({ok:false},413);
 if(!await verifyStitch(raw,request.headers,env.STITCH_WEBHOOK_SECRET))return reply({ok:false},401);
 try{
  const event=JSON.parse(raw);if(event.type!=='SUBSCRIPTION')return reply({ok:true},200);
  if(event.status!=='PAID'||!event.subscriptionId||!event.id)return reply({ok:false},400);
  const row=await env.BILLING_DB.prepare('SELECT * FROM stitch_subscriptions WHERE subscription_id=?').bind(event.subscriptionId).first();
  if(!row||row.mode!==stitchMode(env))return reply({ok:false},409);
  if(event.amount!==row.amount)return reply({ok:false},409);
  const existing=await env.BILLING_DB.prepare('SELECT payment_id FROM stitch_payments WHERE payment_id=? OR message_id=?').bind(event.id,request.headers.get('svix-id')).first();if(existing)return reply({ok:true},200);
  const result=await stitchAPI(env,'/api/v1/payment/'+encodeURIComponent(event.id),{scope:'client_paymentrequest'},transport),payment=result.payment;
  if(!payment||payment.id!==event.id||!['PAID','SETTLED'].includes(payment.status)||payment.amount!==row.amount||payment.merchantReference!==row.reference||!payment.paidAt||Date.parse(payment.paidAt)>Date.now()+300000||Date.parse(payment.paidAt)<Date.parse(row.created_at)-300000)return reply({ok:false},409);
  const through=nextPeriod(payment.paidAt,row.cycle);
  await env.BILLING_DB.batch([
   env.BILLING_DB.prepare('INSERT OR IGNORE INTO stitch_payments(payment_id,message_id,subscription_id,amount,paid_at,paid_through) VALUES(?,?,?,?,?,?)').bind(payment.id,request.headers.get('svix-id'),row.subscription_id,row.amount,payment.paidAt,through),
   env.BILLING_DB.prepare("UPDATE stitch_subscriptions SET paid_through=MAX(COALESCE(paid_through,''),?),state=CASE WHEN state='cancelled' THEN state ELSE 'paid' END WHERE subscription_id=?").bind(through,row.subscription_id)
  ]);return reply({ok:true},200);
 }catch{return reply({ok:false},503);}
}
