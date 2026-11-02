import { createHash } from 'node:crypto';
import { lockedEarnScenario, parseFixed18, formatFixed18 } from '../financial-calculators.mjs';
import { PlatformError, identifier } from '../customer-platform/policy.mjs';
const DAY = 86400000;
export const EARN_REVIEW_GATES = Object.freeze({ deposits: false, payableAccrual: false, payouts: false, liveProduct: false });
export function utcDay(value) {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) throw new PlatformError('INVALID_OBSERVATION_DAY');
  const time = Date.parse(value + 'T00:00:00.000Z');
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0,10) !== value) throw new PlatformError('INVALID_OBSERVATION_DAY');
  return time;
}
function planConfiguration(plan) {
  if (plan.state !== 'REVIEW_ONLY' || !/^[A-Z0-9]{2,16}$/.test(plan.principalAsset) || !/^[A-Z0-9]{2,16}$/.test(plan.rewardAsset)) throw new PlatformError('EARN_PLAN_NOT_REVIEWABLE', 409);
  if (![plan.oracleSourceA,plan.oracleSourceB].every(v=>typeof v==='string' && /^[A-Z0-9_-]{2,40}$/.test(v)) || plan.oracleSourceA === plan.oracleSourceB || typeof plan.reviewReference !== 'string' || !/^[A-Za-z0-9_:-]{4,120}$/.test(plan.reviewReference)) throw new PlatformError('ORACLE_REVIEW_REQUIRED', 503);
  if (!Number.isInteger(plan.maximumDeviationBps) || plan.maximumDeviationBps < 0 || plan.maximumDeviationBps > 1000) throw new PlatformError('ORACLE_DEVIATION_INVALID');
  // Validate amounts/rates without accruing or approving them.
  lockedEarnScenario({principalUnits:plan.principalUnits,currentPriceAud:'1',rewardPriceAud:'1',annualRatePercent:plan.annualRatePercent,days:1});
  const startsOn=new Date(plan.startsOn).toISOString(), endsOn=new Date(plan.endsOn).toISOString();
  if (!startsOn.endsWith('T00:00:00.000Z') || !endsOn.endsWith('T00:00:00.000Z') || endsOn <= startsOn) throw new PlatformError('INVALID_PLAN_INTERVAL');
  return { planId:plan.id,userId:plan.userId,principalAsset:plan.principalAsset,rewardAsset:plan.rewardAsset,principalUnits:plan.principalUnits,annualRatePercent:plan.annualRatePercent,startsOn,endsOn,oracleSourceA:plan.oracleSourceA,oracleSourceB:plan.oracleSourceB,maximumDeviationBps:plan.maximumDeviationBps,reviewReference:plan.reviewReference };
}
const hash = config => createHash('sha256').update(JSON.stringify(config)).digest('hex');

// Adapter output only: never accept these quotes or sources from a customer API.
export function corroboratedClosingPrice({ asset, quotes, sourceA, sourceB, boundary, maximumDeviationBps }) {
  if (!Number.isFinite(boundary) || !Number.isInteger(maximumDeviationBps) || maximumDeviationBps < 0 || maximumDeviationBps > 1000) throw new PlatformError('ORACLE_POLICY_INVALID');
  if (!Array.isArray(quotes) || quotes.length !== 2) throw new PlatformError('TWO_ORACLE_QUOTES_REQUIRED', 502);
  const expected=[sourceA,sourceB];
  if (sourceA===sourceB || new Set(quotes.map(q=>q?.source)).size!==2 || !quotes.every(q=>expected.includes(q?.source))) throw new PlatformError('ORACLE_SOURCES_INVALID', 502);
  const parsed=quotes.map(q=>{
    const observed=typeof q.observedAt==='string' && /Z$/.test(q.observedAt) ? Date.parse(q.observedAt) : NaN;
    if (q.asset!==asset || q.currency!=='AUD' || !Number.isFinite(observed) || observed>boundary || boundary-observed>15*60000 || !/^[a-f0-9]{64}$/.test(q.evidenceHash || '')) throw new PlatformError('ORACLE_EVIDENCE_INVALID',502);
    return { price:parseFixed18(q.priceAud), quote:q };
  });
  const low=parsed[0].price<parsed[1].price?parsed[0].price:parsed[1].price, high=parsed[0].price>parsed[1].price?parsed[0].price:parsed[1].price;
  if ((high-low)*10000n > low*BigInt(maximumDeviationBps)) throw new PlatformError('ORACLE_PRICES_DISAGREE',502);
  return {priceAud:formatFixed18(low),evidence:parsed.map(({quote:q})=>({asset:q.asset,currency:'AUD',priceAud:q.priceAud,source:q.source,observedAt:q.observedAt,evidenceHash:q.evidenceHash})).sort((a,b)=>a.source.localeCompare(b.source))};
}

export function createEarnReviewLedger({db,loadClosingQuotes,now=()=>Date.now()}) {
  return {
    async plans(userId) {
      return { plans: await db.earnReviewPlan.findMany({where:{userId},orderBy:{createdAt:'desc'},take:100,select:{id:true,principalAsset:true,rewardAsset:true,state:true,startsOn:true,endsOn:true}}),limit:100,gates:EARN_REVIEW_GATES };
    },
    async history(userId,planId) {
      const plan=await db.earnReviewPlan.findFirst({where:{id:identifier(planId),userId},select:{id:true,principalAsset:true,rewardAsset:true,principalUnits:true,annualRatePercent:true,state:true,startsOn:true,endsOn:true}});
      if(!plan)throw new PlatformError('EARN_REVIEW_PLAN_NOT_FOUND',404);
      const observations=await db.earnDailyObservation.findMany({where:{planId:plan.id},orderBy:{day:'desc'},take:366,select:{id:true,day:true,currentValueAud:true,principalPriceAud:true,rewardPriceAud:true,indicativeRewardAud:true,indicativeRewardUnits:true,status:true,modelVersion:true,createdAt:true}});
      await db.auditEvent.create({data:{actorUserId:userId,action:'locked-earn.review.viewed',resource:'earn-review',resourceId:plan.id}});
      return {plan,observations,limit:366,gates:EARN_REVIEW_GATES,warning:'Engineering observations only. No deposit, approved rate, payable reward, guaranteed return or withdrawable balance is created.'};
    },
    async observeDay(planId,day) {
      const start=utcDay(day),boundary=start+DAY;
      const clock=now();
      if(!Number.isFinite(clock) || boundary>clock)throw new PlatformError('OBSERVATION_DAY_NOT_CLOSED',409);
      const plan=await db.earnReviewPlan.findUnique({where:{id:identifier(planId)}});
      if(!plan)throw new PlatformError('EARN_REVIEW_PLAN_NOT_FOUND',404);
      const config=planConfiguration(plan),configurationHash=hash(config);
      if(start<Date.parse(config.startsOn) || boundary>Date.parse(config.endsOn))throw new PlatformError('DAY_OUTSIDE_PLAN_INTERVAL',409);
      const dayDate=new Date(start),key={planId_day:{planId:plan.id,day:dayDate}};
      const prior=await db.earnDailyObservation.findUnique({where:key});
      if(prior){if(prior.configurationHash!==configurationHash)throw new PlatformError('OBSERVATION_CONFIGURATION_CONFLICT',409);return prior;}
      if(typeof loadClosingQuotes!=='function')throw new PlatformError('REVIEWED_PRICE_ADAPTER_NOT_CONFIGURED',503);
      const prices={};
      for(const asset of new Set([config.principalAsset,config.rewardAsset])) {
        const quotes=await loadClosingQuotes({asset,currency:'AUD',boundary:new Date(boundary).toISOString(),sourceIds:[config.oracleSourceA,config.oracleSourceB]});
        prices[asset]=corroboratedClosingPrice({asset,quotes,sourceA:config.oracleSourceA,sourceB:config.oracleSourceB,boundary,maximumDeviationBps:config.maximumDeviationBps});
      }
      const result=lockedEarnScenario({principalUnits:config.principalUnits,currentPriceAud:prices[config.principalAsset].priceAud,rewardPriceAud:prices[config.rewardAsset].priceAud,annualRatePercent:config.annualRatePercent,days:1});
      return db.$transaction(async tx=>{
        await tx.$queryRaw`SELECT 1::int AS locked FROM pg_advisory_xact_lock(hashtext(${`earn-review:${plan.id}`}))`;
        const current=await tx.earnReviewPlan.findUnique({where:{id:plan.id}});
        if(!current || hash(planConfiguration(current))!==configurationHash)throw new PlatformError('OBSERVATION_CONFIGURATION_CONFLICT',409);
        const existing=await tx.earnDailyObservation.findUnique({where:key});
        if(existing){if(existing.configurationHash!==configurationHash)throw new PlatformError('OBSERVATION_CONFIGURATION_CONFLICT',409);return existing;}
        const observation=await tx.earnDailyObservation.create({data:{planId:plan.id,day:dayDate,configurationHash,principalPriceAud:prices[config.principalAsset].priceAud,rewardPriceAud:prices[config.rewardAsset].priceAud,currentValueAud:result.currentValueAud,indicativeRewardAud:result.indicativeRewardAud,indicativeRewardUnits:result.indicativeRewardUnits,quoteEvidence:prices,modelVersion:'current-value-daily-review-v1',status:'NON_PAYABLE_REVIEW'}});
        await tx.auditEvent.create({data:{actorUserId:plan.userId,action:'locked-earn.daily.review-recorded',resource:'earn-review',resourceId:observation.id,metadata:{day,modelVersion:'current-value-daily-review-v1'}}});
        return observation;
      });
    },
  };
}
