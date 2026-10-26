import {sanitiseInvoiceSnapshots} from './subscriptions.js';
import {createClerkClient} from '@clerk/backend';
export const verifiedEmail=user=>{const primary=user.emailAddresses?.find(e=>e.id===user.primaryEmailAddressId);return primary?.verification?.status==='verified'?primary.emailAddress.toLowerCase():null;};
const clientFor=env=>createClerkClient({publishableKey:env.CLERK_PUBLISHABLE_KEY,secretKey:env.CLERK_SECRET_KEY});
// Both ends of the relationship must agree. A pointer alone never grants access.
export async function practiceIdentity(who,env,client=clientFor(env)){
 if(!who.membership)return {...who,role:'advocate',practiceUserId:who.userId,practiceEmail:who.email};
 const m=who.membership;if(m.role!=='secretary'||!m.practiceUserId||m.practiceUserId===who.userId)return {...who,accessRevoked:true};
 let principal;try{principal=await client.users.getUser(m.practiceUserId);}catch{return {...who,accessRevoked:true};}
 const email=verifiedEmail(principal),meta=principal.privateMetadata||{},member=(meta.lexchamberTeam||[]).find(x=>x.userId===who.userId&&x.email===who.email?.toLowerCase()&&x.role==='secretary'&&x.active===true);
 if(!email||meta.lexchamberMembership||!member||!meta.lexchamberBackend?.url)return {...who,accessRevoked:true};
 return {...who,role:'secretary',practiceUserId:principal.id,practiceEmail:email,backend:meta.lexchamberBackend,subscription:meta.lexchamberSubscription,team:undefined};
}
export function secretaryAction(action,p={}){return ['firm','matter','payment','draft'].includes(action)&&!(p.archived===true||String(p.archived).toLowerCase()==='true');}
export function secretaryData(result){if(!result.data)return result;const data={...result.data,settings:{...result.data.settings}};data.Invoices=sanitiseInvoiceSnapshots(data.Invoices,['financialPosition','driveFolderId']);for(const k of ['Transactions','BankAccounts','BankStatements','Sheet5','Audit','migrationPreview'])data[k]=[];for(const k of ['financialPosition','driveFolderId'])delete data.settings[k];delete data.migrationVersion;data.accountingReady=false;data.Documents=(data.Documents||[]).filter(x=>x.kind==='invoice');return {...result,data};}
export async function manageTeam(env,who,input,client=clientFor(env)){
 if(who.role==='secretary'||who.membership)throw Error('Only the advocate can manage practice access.');
 const principal=await client.users.getUser(who.userId),meta=principal.privateMetadata||{};
 if(meta.lexchamberMembership||!meta.lexchamberBackend?.url)throw Error('Connect your own practice before adding a secretary.');
 let team=Array.isArray(meta.lexchamberTeam)?meta.lexchamberTeam:[];
 if(input.action==='remove'){
  if(typeof input.userId!=='string'||!team.some(x=>x.userId===input.userId))throw Error('Select an existing secretary.');
  team=team.filter(x=>x.userId!==input.userId);
  // Revoke the authoritative grant first. A stale pointer is harmless and fails closed.
  await client.users.updateUserMetadata(who.userId,{privateMetadata:{lexchamberTeam:team}});return {team:publicTeam(team)};
 }
 if(input.action!=='add'||typeof input.email!=='string'||!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(input.email.trim()))throw Error('Enter the secretary’s registered email address.');
 const email=input.email.trim().toLowerCase();if(email===who.email?.toLowerCase())throw Error('Use the secretary’s separate account. Your advocate access stays unchanged.');
 if(team.filter(x=>x.active).length>=5&&!team.some(x=>x.email===email))throw Error('Up to five secretaries can be linked to a practice.');
 const {data:users}=await client.users.getUserList({emailAddress:[email],limit:10});const matches=users.filter(u=>verifiedEmail(u)===email);
 if(matches.length!==1)throw Error('The secretary must first register and verify this as their primary email. No backend setup is needed.');
 const member=matches[0],memberMeta=member.privateMetadata||{};
 if(memberMeta.lexchamberBackend||memberMeta.lexchamberTeam?.length)throw Error('This account already has a practice. Use a separate secretary account.');
 if(memberMeta.lexchamberMembership?.practiceUserId&&memberMeta.lexchamberMembership.practiceUserId!==who.userId)throw Error('This account is linked to another practice. Contact support to change practices.');
 team=team.filter(x=>x.userId!==member.id&&x.email!==email);team.push({userId:member.id,email,role:'secretary',active:true,addedAt:new Date().toISOString()});
 // Write the pointer first; it is unusable until the advocate’s matching grant exists.
 await client.users.updateUserMetadata(member.id,{privateMetadata:{lexchamberMembership:{role:'secretary',practiceUserId:who.userId}}});
 await client.users.updateUserMetadata(who.userId,{privateMetadata:{lexchamberTeam:team}});return {team:publicTeam(team)};
}
export const publicTeam=team=>(Array.isArray(team)?team:[]).filter(x=>x.active).map(({userId,email,role,addedAt})=>({userId,email,role,addedAt}));
