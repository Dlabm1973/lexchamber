import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ACCOUNTS_EMAIL,emailDraft,deliveryMessage,whatsappNumber,canSharePDF,sharePDF} from '../public/delivery.js';
import worker from '../worker/index.js';
const headers={'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.com',origin:'https://test.site','Content-Type':'application/json'};
const env={ALLOWED_EMAILS:'owner@example.com',BREVO_API_KEY:'isolated-test-key'};
const payload={to:'attorney@example.com',subject:'Invoice 123',message:'On behalf of Advocate DJ Badenhorst',filename:'Invoice_123.pdf',base64:btoa('%PDF-1.7\ntest')};
const request=v=>new Request('https://test.site/api/send-email',{method:'POST',headers,body:JSON.stringify(v)});
test('invoice and statement drafts contain accounts sender, PDF attachment and UTF-8 message',async()=>{for(const kind of ['invoice','statement']){const message=deliveryMessage({kind,contact:'André',id:'123',matter:'Test',amount:'R100',due:'26/10/2026'}),text=await emailDraft({...payload,message}).text();assert.match(text,new RegExp('From: LexChamber Accounts <'+ACCOUNTS_EMAIL+'>'));assert.match(text,/X-Unsent: 1/);assert.match(text,/Content-Disposition: attachment; filename="Invoice_123.pdf"/);assert.ok(text.includes(payload.base64));assert.match(message,/on behalf of Advocate DJ Badenhorst/);}assert.throws(()=>emailDraft({...payload,to:'a@example.com\r\nBcc: b@example.com'}));});
test('South African and international WhatsApp numbers normalise correctly',()=>{assert.equal(whatsappNumber('065 818 1886'),'27658181886');assert.equal(whatsappNumber('0027 65 818 1886'),'27658181886');assert.throws(()=>whatsappNumber('123'));});
test('email requires approved identity, same origin, configured key and valid PDF',async()=>{assert.equal((await worker.fetch(new Request('https://test.site/api/send-email'),env)).status,401);assert.equal((await worker.fetch(new Request('https://test.site/api/send-email',{method:'POST',headers:{...headers,origin:'https://other.site'}}),env)).status,403);assert.equal((await worker.fetch(request(payload),{...env,BREVO_API_KEY:''})).status,503);assert.equal((await worker.fetch(request({...payload,base64:btoa('not a PDF')}),env)).status,400);});
test('provider submission fixes sender and reply-to, includes attachment, and does not claim inbox delivery',async()=>{const old=globalThis.fetch;let captured;globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.brevo.com/v3/smtp/email');captured=JSON.parse(options.body);return Response.json({messageId:'test-message-id'},{status:201});};try{const r=await worker.fetch(request({...payload,sender:'attacker@example.com'}),env);assert.equal(r.status,200);assert.equal((await r.json()).messageId,'test-message-id');assert.equal(captured.sender.email,ACCOUNTS_EMAIL);assert.equal(captured.replyTo.email,ACCOUNTS_EMAIL);assert.deepEqual(captured.bcc,[{email:ACCOUNTS_EMAIL,name:'LexChamber Accounts'}]);assert.equal(captured.attachment[0].content,payload.base64);globalThis.fetch=async()=>Response.json({message:'provider error'},{status:401});assert.equal((await worker.fetch(request(payload),env)).status,502);}finally{globalThis.fetch=old;}});

test('mobile sharing passes the prepared PDF file synchronously with the message and no remote link',async()=>{
 const file=new File(['%PDF-1.7\nprivate invoice bytes'],'Invoice_2412.pdf',{type:'application/pdf'});let shared;
 const nav={canShare:({files})=>files[0]===file,share:input=>{shared=input;return Promise.resolve();}};
 const result=sharePDF(file,{title:'Invoice 2412',text:'On behalf of Advocate DJ Badenhorst'},nav);
 assert.equal(shared.files[0],file);assert.equal(shared.files[0].type,'application/pdf');assert.equal(await shared.files[0].text(),'%PDF-1.7\nprivate invoice bytes');assert.equal(shared.text,'On behalf of Advocate DJ Badenhorst');assert.equal('url' in shared,false);await result;
});
test('unsupported file sharing never degrades silently into a text-only share',()=>{
 let calls=0;const nav={canShare:()=>false,share:()=>{calls++;}};
 assert.equal(canSharePDF(new File(['PDF'],'invoice.pdf'),nav),false);
 assert.throws(()=>sharePDF(new File(['PDF'],'invoice.pdf'),{title:'Invoice',text:'Message'},nav),/Download the PDF/);assert.equal(calls,0);
 assert.equal(canSharePDF(null,nav),false);assert.equal(canSharePDF({},{}),false);assert.equal(canSharePDF({},{share(){},canShare(){throw Error('Policy blocked');}}),false);
});
test('cancelling native PDF sharing does not send or open an alternative route',async()=>{
 let calls=0;const error=new DOMException('Cancelled','AbortError'),nav={canShare:()=>true,share:()=>{calls++;return Promise.reject(error);}};
 await assert.rejects(sharePDF(new File(['PDF'],'invoice.pdf'),{title:'Invoice',text:'Message'},nav),e=>e===error);assert.equal(calls,1);
});
