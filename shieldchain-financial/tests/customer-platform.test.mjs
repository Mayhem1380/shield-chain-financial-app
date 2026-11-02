import test from 'node:test';
import assert from 'node:assert/strict';
import { createCustomerPlatform } from '../lib/customer-platform/service.mjs';
import { ticketContent, safeMessage, staffCategories, transition, assertServiceEnabled } from '../lib/customer-platform/policy.mjs';
const session = (id='customer',role='CUSTOMER') => ({userId:id,user:{platformRole:role,mfaEnabled:true},mfaVerifiedAt:new Date()});
const intake = {category:'OTHER',subject:'Account question',description:'Please explain the available support process.',requestKey:'request-key-fixture-0001'};
function fixture(){
 let state={tickets:[],messages:[],notices:[],audits:[],controls:[]};let failAudit=false,n=0;
 const match=(r,w={})=>Object.entries(w).every(([k,v])=>v&&typeof v==='object'?(v.in?v.in.includes(r[k]):v.notIn?!v.notIn.includes(r[k]):false):r[k]===v);
 const project=(r,s)=>s?Object.fromEntries(Object.keys(s).map(k=>[k,r[k]])):r;
 const db={
  $queryRaw:async()=>[],
  supportTicket:{findFirst:async({where})=>state.tickets.find(r=>match(r,where))||null,findUnique:async({where})=>state.tickets.find(r=>match(r,where.userId_requestKey))||null,count:async({where})=>state.tickets.filter(r=>match(r,where)).length,
   findMany:async({where,select,take})=>state.tickets.filter(r=>match(r,where)).slice(0,take).map(r=>project(r,select)),
   create:async({data})=>{const r={id:`ticket_${++n}`,status:'OPEN',createdAt:new Date(),updatedAt:new Date(),...data};state.tickets.push(r);return r;},
   update:async({where,data})=>{const r=state.tickets.find(r=>r.id===where.id);Object.assign(r,data);return r;}},
  supportMessage:{findMany:async({where,take,select})=>state.messages.filter(r=>match(r,where)).slice(-take).reverse().map(r=>project(r,select)),create:async({data})=>{const r={id:`msg_${++n}`,createdAt:new Date(),internal:false,...data};state.messages.push(r);return r;}},
  customerNotification:{findMany:async({where,select})=>state.notices.filter(r=>match(r,where)).map(r=>project(r,select)),findFirst:async({where})=>state.notices.find(r=>match(r,where)),create:async({data})=>{const r={id:`notice_${++n}`,readAt:null,...data};state.notices.push(r);return r;},update:async({where,data})=>Object.assign(state.notices.find(r=>r.id===where.id),data)},
  auditEvent:{create:async({data})=>{if(failAudit)throw Error('audit-down');state.audits.push(data);return data;},findMany:async()=>state.audits},
  serviceControl:{findUnique:async({where})=>state.controls.find(r=>r.key===where.key),findMany:async()=>state.controls,upsert:async({where,create,update})=>{let r=state.controls.find(r=>r.key===where.key);if(r)Object.assign(r,update);else{r={...create};state.controls.push(r);}return r;}},
  user:{count:async()=>3},sfWalletAddress:{count:async()=>0},premiumSubscription:{count:async()=>0},challenge:{count:async()=>0},
  $transaction:async fn=>{const before=structuredClone(state);try{return await fn(db);}catch(e){state=before;throw e;}}
 };return {db,service:createCustomerPlatform({db}),get state(){return state;},failAudit:()=>{failAudit=true;}};
}
test('intake rejects customer role escalation and unsolicited secrets',()=>{
 assert.throws(()=>ticketContent('customer',{...intake,priority:'URGENT'}),/UNSUPPORTED/);
 for(const body of ['private key abc','password: abc123','sk_live_fixtureOnly','0x'+'1'.repeat(64)])assert.throws(()=>safeMessage(body),/SECRET/);
 assert.throws(()=>ticketContent('customer',{...intake,subject:'private key disclosure'}),/SECRET/);
});
test('schema and policy status/category adapter preserves closed terminal behavior',()=>{
 assert.equal(transition('SUPPORT',{status:'TRIAGED',category:'OTHER'},'WAITING_FOR_CUSTOMER'),'WAITING_FOR_CUSTOMER');
 assert.throws(()=>transition('CUSTOMER',{status:'OPEN',category:'OTHER'},'TRIAGED',true),/CUSTOMER_TRANSITION/);
 assert.throws(()=>transition('OWNER',{status:'CLOSED',category:'SECURITY'},'TRIAGED'),/TRANSITION/);
 assert.throws(()=>staffCategories('CUSTOMER'),/STAFF_REQUIRED/);
});
test('ticket intake persists record, first message, notification and content-free audit atomically',async()=>{
 const f=fixture();const r=await f.service.create(session(),intake);
 assert.match(r.reference,/^SF-/);assert.equal(f.state.messages[0].body,intake.description);assert.equal(f.state.notices[0].userId,'customer');
 assert(!JSON.stringify(f.state.audits).includes(intake.description));
});
test('replayed ticket creation is idempotent and changed payload conflicts',async()=>{
 const f=fixture();const a=await f.service.create(session(),intake),b=await f.service.create(session(),intake);
 assert.equal(a.id,b.id);assert.equal(f.state.tickets.length,1);assert.equal(f.state.messages.length,1);
 await assert.rejects(f.service.create(session(),{...intake,subject:'Changed subject'}),/IDEMPOTENCY_CONFLICT/);
});
test('audit outage rolls back message, notification and ticket creation',async()=>{
 const f=fixture();f.failAudit();await assert.rejects(f.service.create(session(),intake),/audit-down/);
 assert.equal(f.state.tickets.length,0);assert.equal(f.state.messages.length,0);assert.equal(f.state.notices.length,0);
});
test('another customer cannot list, read, reply to or close a foreign ticket',async()=>{
 const f=fixture();const r=await f.service.create(session(),intake),other=session('foreign');
 assert.deepEqual((await f.service.list(other)).tickets,[]);
 await assert.rejects(f.service.detail(other,r.id),/NOT_FOUND/);
 await assert.rejects(f.service.reply(other,{ticketId:r.id,body:'Foreign reply'}),/NOT_FOUND/);
 await assert.rejects(f.service.setStatus(other,{ticketId:r.id,status:'CLOSED'}),/NOT_FOUND/);
});
test('internal notes never reach customer reads or generate customer notifications',async()=>{
 const f=fixture(),r=await f.service.create(session(),intake);const before=f.state.notices.length;
 await f.service.reply(session('staff','SUPPORT'),{ticketId:r.id,body:'Internal review details',internal:true},true);
 assert.equal((await f.service.detail(session(),r.id)).messages.length,1);assert.equal(f.state.notices.length,before);
 assert.equal((await f.service.detail(session('staff','SUPPORT'),r.id,true)).messages.length,2);
});
test('financial and security queues exclude ordinary support staff',async()=>{
 const f=fixture(),r=await f.service.create(session(),{...intake,category:'PAYMENTS'});
 await assert.rejects(f.service.detail(session('staff','SUPPORT'),r.id,true),/NOT_FOUND/);
 await assert.rejects(f.service.detail(session('staff','SECURITY'),r.id,true),/NOT_FOUND/);
 assert.equal((await f.service.detail(session('staff','OPERATIONS'),r.id,true)).ticket.id,r.id);
 assert.equal((await f.service.commandCentre(session('staff','SUPPORT'))).tickets.length,0);
});
test('staff need recent MFA and customer cannot impersonate staff',async()=>{
 const f=fixture(),r=await f.service.create(session(),intake);
 await assert.rejects(f.service.detail(session(),r.id,true),/STAFF_REQUIRED/);
 await assert.rejects(f.service.commandCentre({...session('staff','OWNER'),mfaVerifiedAt:new Date(0)}),/RECENT_MFA_REQUIRED/);
});
test('public staff replies record first response and notify only ticket owner',async()=>{
 const f=fixture(),r=await f.service.create(session(),intake);
 await f.service.reply(session('staff','SUPPORT'),{ticketId:r.id,body:'Public staff response',internal:false},true);
 assert(f.state.tickets[0].firstResponseAt instanceof Date);assert.equal(f.state.notices.at(-1).userId,'customer');
});
test('customer follow-up advances waiting state; customer cannot submit internal notes',async()=>{
 const f=fixture(),r=await f.service.create(session(),intake);
 await f.service.setStatus(session('staff','SUPPORT'),{ticketId:r.id,status:'WAITING_FOR_CUSTOMER'},true);
 await f.service.reply(session(),{ticketId:r.id,body:'Here is more context'});assert.equal(f.state.tickets[0].status,'TRIAGED');
 await assert.rejects(f.service.reply(session(),{ticketId:r.id,body:'Not internal',internal:true}),/UNSUPPORTED/);
 await f.service.setStatus(session(),{ticketId:r.id,status:'CLOSED'});
 await assert.rejects(f.service.reply(session(),{ticketId:r.id,body:'After closure'}),/NOT_ACCEPTING/);
});
test('notification ownership and idempotent read acknowledgements',async()=>{
 const f=fixture();await f.service.create(session(),intake);const id=f.state.notices[0].id;
 assert.equal((await f.service.notifications(session('foreign'))).notifications.length,0);
 await assert.rejects(f.service.markRead(session('foreign'),{notificationId:id}),/NOT_FOUND/);
 await f.service.markRead(session(),{notificationId:id});const count=f.state.audits.length;
 await f.service.markRead(session(),{notificationId:id});assert.equal(f.state.audits.length,count);
});
test('open ticket quota is enforced without creating additional records',async()=>{
 const f=fixture();for(let i=0;i<20;i++)await f.service.create(session(),{...intake,requestKey:`request-fixture-number-${i}`});
 await assert.rejects(f.service.create(session(),{...intake,requestKey:'request-fixture-number-21'}),/LIMIT_REACHED/);assert.equal(f.state.tickets.length,20);
});
test('only owner can stop allowlisted services; no enable option exists',async()=>{
 const f=fixture();await assert.rejects(f.service.emergencyStop(session('staff','SUPPORT'),{key:'BILLING_CHECKOUT',reasonCode:'OWNER_REVIEW'}),/OWNER_REQUIRED/);
 await assert.rejects(f.service.emergencyStop(session('staff','OWNER'),{key:'BILLING_CHECKOUT',reasonCode:'OWNER_REVIEW',disabled:false}),/UNSUPPORTED/);
 await f.service.emergencyStop(session('staff','OWNER'),{key:'SUPPORT_WRITES',reasonCode:'OWNER_REVIEW'});
 await assert.rejects(f.service.create(session(),intake),/EMERGENCY_DISABLED/);
 assert.equal((await f.service.list(session())).tickets.length,0);
 await assert.rejects(assertServiceEnabled(f.db,'UNKNOWN'),/INVALID/);
});
test('service stops are audited atomically and do not imply financial activation',async()=>{
 const f=fixture();f.failAudit();await assert.rejects(f.service.emergencyStop(session('owner','OWNER'),{key:'WALLET_REFRESH',reasonCode:'SECURITY_INCIDENT'}),/audit-down/);assert.equal(f.state.controls.length,0);
 const g=fixture();assert.equal((await g.service.commandCentre(session('owner','OWNER'))).financialActivationAllowed,false);
});
