import {createClerkClient} from '@clerk/backend';
export const clerkEnabled=env=>env.AUTH_PROVIDER==='clerk';
export const clerkReady=env=>!!(env.CLERK_PUBLISHABLE_KEY&&env.CLERK_SECRET_KEY);
export function clerkDomain(key){try{if(!/^pk_(live|test)_/.test(key||''))return null;const domain=atob(key.split('_')[2]).replace(/\$$/,'');return /^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(domain)?domain:null;}catch{return null;}}
export async function identity(request,env){
if(!clerkEnabled(env))return{userId:request.headers.get('oai-authenticated-user-id'),email:request.headers.get('oai-authenticated-user-email')};
if(!clerkReady(env))return {configurationError:true};
const client=createClerkClient({publishableKey:env.CLERK_PUBLISHABLE_KEY,secretKey:env.CLERK_SECRET_KEY});
const state=await client.authenticateRequest(request,{authorizedParties:[new URL(request.url).origin],acceptsToken:'session_token'});
if(!state.isAuthenticated){const location=state.headers.get('location');if(location)return {redirect:location,responseHeaders:state.headers};return {responseHeaders:state.headers};}
const auth=state.toAuth();if(!auth.userId)return {};
const user=await client.users.getUser(auth.userId),primary=user.emailAddresses.find(e=>e.id===user.primaryEmailAddressId);
return {responseHeaders:state.headers,backend:user.privateMetadata?.lexchamberBackend,subscription:user.privateMetadata?.lexchamberSubscription,membership:user.privateMetadata?.lexchamberMembership,team:user.privateMetadata?.lexchamberTeam,userId:user.id,email:primary?.verification?.status==='verified'?primary.emailAddress:null};
}

export function withAuthCookies(response,authHeaders){if(!authHeaders)return response;const next=new Response(response.body,response);const cookies=authHeaders.getSetCookie?authHeaders.getSetCookie():[];for(const cookie of cookies)next.headers.append('Set-Cookie',cookie);return next;}
