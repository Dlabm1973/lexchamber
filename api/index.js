import worker from '../dist/server/index.js';
export default {fetch(request){return worker.fetch(request,{...process.env,AUTH_PROVIDER:'clerk',CLERK_PUBLISHABLE_KEY:process.env.CLERK_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY});}};
