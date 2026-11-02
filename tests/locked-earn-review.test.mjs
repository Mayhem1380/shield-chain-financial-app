import test from 'node:test';
import assert from 'node:assert/strict';
import { createEarnReviewLedger, corroboratedClosingPrice, utcDay, EARN_REVIEW_GATES } from '../lib/locked-earn/review-ledger.mjs';
const boundary=Date.parse('2026-11-02T00:00:00.000Z');
function quotes(asset='ETH',price='100'){return ['SOURCE_A','SOURCE_B'].map(source=>({asset,currency:'AUD',priceAud:price,source,observedAt:'2026-11-02T00:00:00.000Z',evidenceHash:'a'.repeat(64)}));}
function fixture(options={}){
 let state={observations:[],audits:[]};let calls=0;
 const plan={id:'plan_fixture',userId:'owner_fixture',state:'REVIEW_ONLY',principalAsset:'ETH',rewardAsset:'BTC',principalUnits:'2',annualRatePercent:'36.5',startsOn:new Date('2026-11-01T00:00:00Z'),endsOn:new Date('2026-11-04T00:00:00Z'),oracleSourceA:'SOURCE_A',oracleSourceB:'SOURCE_B',maximumDeviationBps:100,reviewReference:'FIXTURE_ONLY_REVIEW',...options.plan};
 const find=({where})=>state.observations.find(r=>r.planId===where.planId_day.planId && r.day.getTime()===where.planId_day.day.getTime());
 const db={
  earnReviewPlan:{findUnique:async()=>plan,findFirst:async({where})=>where.id===plan.id&&where.userId===plan.userId?plan:null},
  earnDailyObservation:{findUnique:async args=>find(args),create:async({data})=>{const r={id:'observation_'+state.observations.length,...data};state.observations.push(r);return r;},findMany:async({where})=>state.observations.filter(r=>r.planId===where.planId)},
  auditEvent:{create:async({data})=>{if(options.failAudit)throw Error('audit-down');state.audits.push(data);}},$queryRaw:async()=>[],
  $transaction:async fn=>{const before=structuredClone(state);try{return await fn(db);}catch(e){state=before;throw e;}}
 };
 const loader=async({asset})=>{calls++;if(options.mutate)plan.principalUnits='3';return options.quotes?options.quotes(asset):quotes(asset,asset==='ETH'?'100':'10');};
 return {plan,db,service:createEarnReviewLedger({db,...(options.noLoader?{}:{loadClosingQuotes:loader}),now:()=>boundary+1000}),get state(){return state;},get calls(){return calls;}};
}
test('daily calendar validation rejects overflow dates, time strings and future days',async()=>{
 for(const day of ['2026-02-30','2026-13-01','2026-11-01T00:00:00Z','26-11-01'])assert.throws(()=>utcDay(day),/INVALID/);
 assert.equal(utcDay('2024-02-29'),Date.parse('2024-02-29T00:00:00Z'));
 await assert.rejects(fixture().service.observeDay('plan_fixture','2026-11-02'),/NOT_CLOSED/);
});
test('two distinct reviewed sources corroborate a bounded current closing price',()=>{
 const pair=quotes();pair[1].priceAud='101';const result=corroboratedClosingPrice({asset:'ETH',quotes:pair,sourceA:'SOURCE_A',sourceB:'SOURCE_B',boundary,maximumDeviationBps:100});
 assert.equal(result.priceAud,'100');assert.equal(result.evidence.length,2);
 pair[1].priceAud='101.000000000000000001';assert.throws(()=>corroboratedClosingPrice({asset:'ETH',quotes:pair,sourceA:'SOURCE_A',sourceB:'SOURCE_B',boundary,maximumDeviationBps:100}),/DISAGREE/);
});
test('stale, future, wrong-currency, wrong-asset and untraceable quotes are rejected',()=>{
 for(const change of [{observedAt:'2026-11-01T23:44:59Z'},{observedAt:'2026-11-02T00:00:01Z'},{currency:'USD'},{asset:'BTC'},{evidenceHash:''},{source:'SOURCE_A'}]){
  const pair=quotes();Object.assign(pair[1],change);
  assert.throws(()=>corroboratedClosingPrice({asset:'ETH',quotes:pair,sourceA:'SOURCE_A',sourceB:'SOURCE_B',boundary,maximumDeviationBps:100}));
 }
});
test('review observation atomically records exact daily current-value reward and evidence',async()=>{
 const f=fixture(),r=await f.service.observeDay('plan_fixture','2026-11-01');
 assert.equal(r.currentValueAud,'200');assert.equal(r.indicativeRewardAud,'0.2');assert.equal(r.indicativeRewardUnits,'0.02');assert.equal(r.status,'NON_PAYABLE_REVIEW');
 assert.equal(r.quoteEvidence.ETH.evidence.length,2);assert.equal(f.state.audits.length,1);assert.equal(f.calls,2);
 assert.deepEqual(Object.values(EARN_REVIEW_GATES),[false,false,false,false]);
});
test('same daily observation replays without another price fetch or duplicate accrual',async()=>{
 const f=fixture();const a=await f.service.observeDay('plan_fixture','2026-11-01'),b=await f.service.observeDay('plan_fixture','2026-11-01');
 assert.equal(a.id,b.id);assert.equal(f.calls,2);assert.equal(f.state.observations.length,1);assert.equal(f.state.audits.length,1);
});
test('changed plan configuration cannot reinterpret an existing recorded day',async()=>{
 const f=fixture();await f.service.observeDay('plan_fixture','2026-11-01');f.plan.annualRatePercent='10';
 await assert.rejects(f.service.observeDay('plan_fixture','2026-11-01'),/CONFIGURATION_CONFLICT/);
});
test('concurrent plan mutation is rejected before observation is written',async()=>{
 const f=fixture({mutate:true});await assert.rejects(f.service.observeDay('plan_fixture','2026-11-01'),/CONFIGURATION_CONFLICT/);assert.equal(f.state.observations.length,0);
});
test('audit failure rolls back the observation instead of creating unaudited reward evidence',async()=>{
 const f=fixture({failAudit:true});await assert.rejects(f.service.observeDay('plan_fixture','2026-11-01'),/audit-down/);assert.equal(f.state.observations.length,0);
});
test('absence of reviewed price adapter never falls back to current or fabricated market prices',async()=>{
 await assert.rejects(fixture({noLoader:true}).service.observeDay('plan_fixture','2026-11-01'),/NOT_CONFIGURED/);
 const f=fixture({quotes:()=>[]});await assert.rejects(f.service.observeDay('plan_fixture','2026-11-01'),/TWO_ORACLE_QUOTES/);assert.equal(f.state.observations.length,0);
});
test('only full UTC days inside the review interval are accepted',async()=>{
 const f=fixture({plan:{startsOn:new Date('2026-11-02T00:00:00Z')}});await assert.rejects(f.service.observeDay('plan_fixture','2026-11-01'),/OUTSIDE/);
 await assert.rejects(fixture({plan:{state:'LIVE'}}).service.observeDay('plan_fixture','2026-11-01'),/NOT_REVIEWABLE/);
 await assert.rejects(fixture({plan:{oracleSourceB:'SOURCE_A'}}).service.observeDay('plan_fixture','2026-11-01'),/REVIEW_REQUIRED/);
});
test('owned history excludes other customers and makes non-payable gates explicit',async()=>{
 const f=fixture();await f.service.observeDay('plan_fixture','2026-11-01');
 await assert.rejects(f.service.history('foreign','plan_fixture'),/NOT_FOUND/);
 const r=await f.service.history('owner_fixture','plan_fixture');assert.equal(r.observations.length,1);assert.equal(r.gates.payableAccrual,false);assert.match(r.warning,/No deposit/);
});
test('daily repricing changes observations without compounding principal',async()=>{
 const f=fixture({quotes:asset=>quotes(asset,asset==='ETH'?'50':'20')});const r=await f.service.observeDay('plan_fixture','2026-11-01');assert.equal(r.currentValueAud,'100');assert.equal(r.indicativeRewardAud,'0.1');assert.equal(r.indicativeRewardUnits,'0.005');assert.equal(f.plan.principalUnits,'2');
});
test('same principal and reward asset uses a single source pair',async()=>{
 const f=fixture({plan:{rewardAsset:'ETH'}});const r=await f.service.observeDay('plan_fixture','2026-11-01');assert.equal(f.calls,1);assert.equal(r.indicativeRewardUnits,'0.002');
});
