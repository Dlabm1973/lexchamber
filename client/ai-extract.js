import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import mammoth from 'mammoth/mammoth.browser.js';
pdfjs.GlobalWorkerOptions.workerSrc='/ai-pdf-worker.js';
export async function extractDocument(file){
 if(file.size>5*1024*1024)throw Error('Use documents smaller than 5 MB.');
 const name=file.name,ext=name.split('.').pop().toLowerCase();let text='';const warnings=[];
 if(ext==='pdf'){
  const loading=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useSystemFonts:true,disableAutoFetch:true});let pdf;
  try{pdf=await loading.promise;if(pdf.numPages>100)throw Error('Split PDFs longer than 100 pages into smaller documents.');for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){const page=await pdf.getPage(pageNo),content=await page.getTextContent(),parts=[];for(const item of content.items)if(typeof item.str==='string')parts.push(item.str+(item.hasEOL?'\n':' '));const body=parts.join('').trim();if(body.length<10)warnings.push('PDF page '+pageNo+' has little or no extractable text. Supply OCR text or remove this page before relying on it.');text+=`[p. ${pageNo}]\n${body||'[NO READABLE TEXT — OCR REQUIRED]'}\n\n`;page.cleanup();if(text.length>80000)throw Error('This document exceeds 80,000 characters. Split it; text has not been truncated.');}}
  finally{await loading.destroy();}
 }else if(ext==='docx'){
  const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});const paragraphs=result.value.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);text=paragraphs.map((x,i)=>`[para. ${i+1}]\n${x}`).join('\n\n');if(result.messages.length)warnings.push('Word extraction reported a warning. Check the full extracted text, including tables and notes.');warnings.push('Word locators are extracted paragraphs, not original page numbers. Headers, images, text boxes and tracked changes may not be represented.');
 }else if(['txt','md'].includes(ext)){
  const raw=await file.text();if(raw.includes('\u0000'))throw Error('This file does not appear to be readable text.');text=raw.split(/\n\s*\n/).filter(x=>x.trim()).map((x,i)=>`[para. ${i+1}]\n${x}`).join('\n\n');
 }else throw Error('Upload a text PDF, DOCX, TXT or Markdown file. Scanned images need OCR first.');
 if(text.length>80000)throw Error('This document exceeds 80,000 characters. Split it before uploading.');if(!text.trim())throw Error('No readable text was extracted. Supply a text document or OCR version.');
 return {name:name.slice(0,160),text,warnings};
}
