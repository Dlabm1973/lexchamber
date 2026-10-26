import {parseCSV} from './accounting.js';
import {decimal,dateISO,outstanding} from './domain.js';
export const migrationTemplates={firms:['Firm','Attorney','email','phone','address'],matters:['Firm','title','practiceArea','dateOpened','notes'],balances:['sourceReference','Firm','matter','cutoverDate','dueDate','outstanding']};
const key=v=>String(v||'').trim().toLowerCase();
export async function migrationPreview(text,type,data){
 const headers=migrationTemplates[type];if(!headers)throw Error('Choose firms, matters or opening balances.');
 const parsed=parseCSV(text);if(parsed.rows.length>100)throw Error('Import up to 100 rows at a time. Split larger files.');
 if(new Set(parsed.headers.map(key)).size!==parsed.headers.length)throw Error('The file contains duplicate column headings.');
 const indices=headers.map(h=>parsed.headers.findIndex(x=>key(x)===key(h)));if(indices.some(i=>i<0))throw Error('Use the template headings: '+headers.join(', ')+'.');
 const seen=new Set();let totalCents=0;
 const rows=[];for(let index=0;index<parsed.rows.length;index++){
  const source=Object.fromEntries(headers.map((h,i)=>[h,String(parsed.rows[index][indices[i]]||'').trim()]));let error='',skip=false,payload={},action='';
  const name=key(source.Firm),matches=data.firms.filter(f=>key(f.name)===name),firm=matches.length===1?matches[0]:null;
  try{
   if(!name)throw Error('Firm name is required.');if(matches.length>1)throw Error('Several firms have this name. Resolve them before importing.');
   let duplicateKey=type+':'+name;
   if(type==='firms'){
    if(source.email&&!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(source.email))throw Error('Invalid firm email.');
    skip=!!firm;action='firm';payload={...source,partners:[],archived:false};
   }else{
    if(!firm)throw Error('Import this firm first.');
    if(type==='matters'){
     if(!source.title)throw Error('Matter title is required.');const date=dateISO(source.dateOpened);if(!date)throw Error('Use a valid opened date (DD/MM/YYYY or YYYY-MM-DD).');
     const matching=data.matters.filter(m=>m.clientId===firm.id&&key(m.title)===key(source.title));if(matching.length>1)throw Error('Several matters match this title. Resolve them first.');
     skip=matching.length===1;action='matter';payload={title:source.title,clientId:firm.id,practiceArea:source.practiceArea,dateOpened:date,notes:source.notes,status:'OPEN',archived:false};duplicateKey+=':'+key(source.title);
    }else{
     if(!source.sourceReference||source.sourceReference.length>200)throw Error('Enter an original invoice reference of at most 200 characters.');
     const matching=data.matters.filter(m=>m.clientId===firm.id&&key(m.title)===key(source.matter));if(matching.length!==1)throw Error('Import one matching matter first.');
     const cutover=dateISO(source.cutoverDate),due=dateISO(source.dueDate);if(!cutover||!due)throw Error('Use valid cutover and due dates.');
     const cents=decimal(source.outstanding);if(cents<=0)throw Error('Outstanding balance must be positive; use decimal points without R or thousands separators.');
     const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(firm.id+'|'+key(source.sourceReference))))].map(n=>n.toString(16).padStart(2,'0')).join('');
     const existing=data.invoices.find(i=>i.id==='LEGACY-'+hash);skip=!!existing;if(existing&&(existing.amountCents!==cents||existing.matterId!==matching[0].id||dateISO(existing.date)!==cutover||dateISO(existing.dueDate)!==due))throw Error('This reference was previously imported with different details. Review the existing balance.');
     // Do not duplicate an original invoice already in the destination practice.
     if(data.invoices.some(i=>i.clientId===firm.id&&key(i.id)===key(source.sourceReference)&&!String(i.id).startsWith('LEGACY-')))throw Error('An invoice with this reference already exists.');
     if(!skip)totalCents+=cents;action='openingBalance';payload={sourceId:hash,sourceReference:source.sourceReference,clientId:firm.id,matterId:matching[0].id,cutoverDate:cutover,dueDate:due,outstanding:(cents/100).toFixed(2)};duplicateKey+=':'+key(source.sourceReference);
    }
   }
   if(seen.has(duplicateKey))throw Error('Duplicate source row in this file.');seen.add(duplicateKey);
  }catch(e){error=e.message;}
  rows.push({row:index+2,source,action,payload,skip,error});
 }
 return {type,rows,totalCents,existingOutstanding:data.invoices.reduce((n,i)=>n+outstanding(i),0),errors:rows.filter(r=>r.error).length,ready:rows.filter(r=>!r.error&&!r.skip).length};
}
