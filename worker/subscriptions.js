import {createClerkClient} from '@clerk/backend';
const owners=env=>(env.OWNER_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
export function entitlement(who,env,now=Date.now()){
 if(owners(env).includes(who.email?.toLowerCase())||env.AUTH_PROVIDER!=='clerk')return {plan:'owner',status:'active',owner:true,pro:true,access:true};
 let overrides={};try{overrides=JSON.parse(env.SUBSCRIPTION_OVERRIDES||'{}');}catch{}
 const s=overrides[who.email?.toLowerCase()]||who.subscription||{},plan=['starter','pro'].includes(s.plan)?s.plan:null;
 const end=s.status==='trialing'?s.trialEndsAt:s.paidThrough,expires=Date.parse(end||'');
 const access=!!plan&&['trialing','active'].includes(s.status)&&Number.isFinite(expires)&&expires>now;
 return {plan:plan||'unassigned',status:access?s.status:s.status==='trialing'?'trial_expired':s.status==='active'?'expired':'inactive',owner:false,pro:access&&plan==='pro',access,trialEndsAt:s.trialEndsAt||null,paidThrough:s.paidThrough||null,billingCycle:s.billingCycle||null};
}
export function sanitiseInvoiceSnapshots(rows,privateKeys){return (rows||[]).map(row=>{if(!row.issuedSnapshot)return row;try{const snapshot=JSON.parse(row.issuedSnapshot);if(snapshot.settings){snapshot.settings={...snapshot.settings};for(const key of privateKeys)delete snapshot.settings[key];}return {...row,issuedSnapshot:JSON.stringify(snapshot)};}catch{return {...row,issuedSnapshot:''};}});}
export function restrictData(result,tier){if(tier.pro||!result.data)return result;const data={...result.data};data.Invoices=sanitiseInvoiceSnapshots(data.Invoices,['financialPosition']);for(const key of ['Transactions','BankAccounts','BankStatements','Sheet5','Audit'])data[key]=[];data.Documents=(data.Documents||[]).filter(x=>x.kind==='invoice');data.settings={...data.settings};delete data.settings.financialPosition;data.accountingReady=false;return {...result,data};}
export function proAction(action,p={}){return ['transaction','bankAccount','bankStatement','bankImport'].includes(action)||(action==='document'&&p.kind!=='invoice')||(action==='settings'&&Object.hasOwn(p.values||{},'financialPosition'));}
export async function manageSubscription(env,actor,input){
 if(!['starter','pro'].includes(input.plan)||!['trialing','active','paused'].includes(input.status)||!['monthly','annual'].includes(input.billingCycle))throw Error('Choose a valid plan, status and billing cycle.');
 if(typeof input.email!=='string'||!input.email.includes('@'))throw Error('Enter the account email.');
 const client=createClerkClient({publishableKey:env.CLERK_PUBLISHABLE_KEY,secretKey:env.CLERK_SECRET_KEY});
 const {data:users}=await client.users.getUserList({emailAddress:[input.email.trim().toLowerCase()],limit:10});
 const matches=users.filter(u=>u.emailAddresses.some(e=>e.id===u.primaryEmailAddressId&&e.emailAddress.toLowerCase()===input.email.trim().toLowerCase()&&e.verification?.status==='verified'));
 if(matches.length!==1)throw Error('Exactly one account with that verified primary email is required.');
 const user=matches[0],old=user.privateMetadata?.lexchamberSubscription||{},now=new Date();
 if(owners(env).includes(input.email.trim().toLowerCase()))throw Error('Owner access is permanent and does not require a paid plan.');
 let trialEndsAt=old.trialEndsAt||null,paidThrough=old.paidThrough||null;
 if(input.status==='trialing'){
  if(old.trialEndsAt&&Date.parse(old.trialEndsAt)<=now.getTime())throw Error('This account has already used its trial. Activate a paid plan instead.');
  trialEndsAt=old.trialEndsAt||new Date(now.getTime()+30*86400000).toISOString();
 }
 if(input.status==='active'){
  const end=Date.parse(input.paidThrough||'');if(!Number.isFinite(end)||end<=now.getTime())throw Error('Enter a future paid-through date after confirming payment.');paidThrough=new Date(end).toISOString();
 }
 const record={plan:input.plan,status:input.status,billingCycle:input.billingCycle,trialStartedAt:old.trialStartedAt||(input.status==='trialing'?now.toISOString():null),trialEndsAt,paidThrough,updatedAt:now.toISOString(),updatedBy:actor};
 await client.users.updateUserMetadata(user.id,{privateMetadata:{lexchamberSubscription:record}});
 return {email:input.email,subscription:record};
}

export function onboardingSubscription(old,plan,billingCycle,now=new Date()){if(old?.trialEndsAt||old?.status==='active'||old?.status==='paused')return {...old,...(old.status==='trialing'?{plan,billingCycle}:{})};return {plan,billingCycle,status:'trialing',trialStartedAt:now.toISOString(),trialEndsAt:new Date(now.getTime()+30*86400000).toISOString()};}
