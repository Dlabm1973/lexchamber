import {dateISO,decimal,newestInvoices} from './domain.js';
export const FEES_REPORT_COLUMNS=['Invoice number','Client','Matter / ID','Total fees','Payment received','Outstanding'];
export function validateReportRange(from,to){if(!/^\d{4}-\d{2}-\d{2}$/.test(from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(to||'')||dateISO(from)!==from||dateISO(to)!==to)throw Error('Choose valid From and To dates.');if(from>to)throw Error('The From date must be on or before the To date.');return {from,to};}
const add=(a,b)=>{const n=a+b;if(!Number.isSafeInteger(n))throw Error('Report total exceeds the supported amount.');return n;};
export function feesReport(data,from,to){
 validateReportRange(from,to);const rows=[],excluded={invalidDates:0,invalidAmounts:0},totals={fees:0,payments:0,outstanding:0,credits:0},unknown={payments:0,outstanding:0};
 for(const invoice of newestInvoices(data.invoices||[])){
  const status=String(invoice.status||'UNPAID').toUpperCase();
  if(['DRAFT','ISSUING','CANCELLED'].includes(status)||String(invoice.reference||'').startsWith('[OPENING] '))continue;
  const date=dateISO(invoice.date);if(!date){excluded.invalidDates++;continue;}if(date<from||date>to)continue;
  let fees,paid,credits;try{fees=decimal(invoice.amount);if(fees<0)throw Error();credits=Number(invoice.creditCents||0);if(!Number.isSafeInteger(credits)||credits<0||credits>fees)throw Error();}catch{excluded.invalidAmounts++;continue;}
  // The invoice's cumulative allocation includes recorded historical balances.
  // Never replace a missing historical payment amount with a guessed receipt.
  if(invoice.paidAmount!==''&&invoice.paidAmount!=null){try{paid=decimal(invoice.paidAmount);if(paid<0||paid+credits>fees)paid=null;}catch{paid=null;}}
  else if(status==='PAID'||status==='PARTIAL')paid=null;
  else{const payments=(data.payments||[]).filter(p=>String(p.invoiceId)===String(invoice.id)&&p.reversed!=='TRUE'&&p.reversed!==true);paid=0;for(const p of payments){const n=Number(p.allocatedCents);if(!Number.isSafeInteger(n)||n<0){paid=null;break;}paid=add(paid,n);}if(paid!==null&&paid+credits>fees)paid=null;}
  // Preserve explicitly PAID historical balances while flagging unverified receipts.
  const balance=paid===null?(status==='PAID'?0:null):Math.max(0,fees-paid-credits);
  const firm=(data.firms||[]).find(f=>String(f.id)===String(invoice.clientId)),matter=(data.matters||[]).find(m=>String(m.id)===String(invoice.matterId));
  rows.push({id:String(invoice.id||'Missing ID'),date,client:invoice.clientName||firm?.name||'Client not recorded',matter:invoice.matterName||matter?.title||'',matterId:invoice.matterId||matter?.id||'',fees,payments:paid,outstanding:balance,credits,unverified:paid===null||balance===null});
  totals.fees=add(totals.fees,fees);totals.credits=add(totals.credits,credits);if(paid===null)unknown.payments++;else totals.payments=add(totals.payments,paid);if(balance===null)unknown.outstanding++;else totals.outstanding=add(totals.outstanding,balance);
 }
 return {from,to,rows,totals,unknown,excluded};
}
export function feesReportNotes(report){const notes=['Invoices are selected by invoice date, inclusive of both dates. Payments and outstanding balances show the current recorded position, not a historical balance at the end date.','Total fees shows the invoice total, including VAT and billed disbursements where applicable. Payment received means amounts allocated to these invoices; unallocated overpayments are excluded.','Drafts, invoices awaiting PDF issue, cancelled invoices and migrated opening balances are excluded.'];if(report.totals.credits)notes.push('Credit notes reduce outstanding balances and are shown separately in the totals; they are not payments.');if(report.unknown.payments||report.unknown.outstanding)notes.push('Review required: '+report.unknown.payments+' invoice(s) have unverified payment amounts and '+report.unknown.outstanding+' have an unknown outstanding balance. Totals include known amounts only. Explicit historical PAID status is preserved without inventing a receipt.');if(report.excluded.invalidDates||report.excluded.invalidAmounts)notes.push('Excluded for review: '+report.excluded.invalidDates+' issued invoice(s) have invalid dates (range cannot be determined); '+report.excluded.invalidAmounts+' invoice(s) in the range have invalid monetary values.');if(report.readAt)notes.push('Spreadsheet figures last read: '+new Date(report.readAt).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'})+' SAST.');if(report.pendingSaves)notes.push(report.pendingSaves+' background change(s) are awaiting sync or refresh. This report uses only the last confirmed spreadsheet snapshot; unconfirmed changes are excluded.');return notes;}
