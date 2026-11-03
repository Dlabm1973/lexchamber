// Refresh short-lived Clerk tokens without altering a queued request's identity or body.
export async function practiceFetch(url,options={},auth=globalThis.Clerk,transport=globalThis.fetch){
 const send=async fresh=>{const headers=new Headers(options.headers);if(auth?.session){const token=await auth.session.getToken(fresh?{skipCache:true}:undefined);if(token)headers.set('Authorization','Bearer '+token);}return transport(url,{...options,headers});};
 const response=await send(false);if(response.status===401&&auth?.session)return send(true);return response;
}
