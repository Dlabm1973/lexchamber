// Local Sites preview only. Never loads production secrets or financial records.
import {createServer} from 'node:http';
import worker from '../dist/server/index.js';
const option=process.argv.indexOf('--port');
const port=Number(process.env.PORT||(option>=0?process.argv[option+1]:3000));
createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const request=new Request('http://localhost:'+port+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});const response=await worker.fetch(request,{AUTH_PROVIDER:'clerk'});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Preview unavailable.');}}).listen(port,'0.0.0.0');
