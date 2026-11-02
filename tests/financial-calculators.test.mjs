import test from 'node:test';
import assert from 'node:assert/strict';
import { lockedEarnScenario, collateralLoanScenario, LOCKED_EARN_MODEL } from '../lib/financial-calculators.mjs';
const earn = { principalUnits: '2', currentPriceAud: '100', rewardPriceAud: '10', annualRatePercent: '5', days: 365 };
const loan = { collateralUnits: '2', currentPriceAud: '100', debtAud: '100', liquidationLtvPercent: '80', stressDropPercent: '25' };
test('Locked Earn uses current market value and separately priced reward units', () => {
  const result = lockedEarnScenario(earn);
  assert.equal(result.currentValueAud, '200'); assert.equal(result.indicativeRewardAud, '10'); assert.equal(result.indicativeRewardUnits, '1');
});
test('repricing principal and reward independently changes the proposed reward', () => {
  assert.equal(lockedEarnScenario({ ...earn, currentPriceAud: '50' }).indicativeRewardAud, '5');
  assert.equal(lockedEarnScenario({ ...earn, rewardPriceAud: '20' }).indicativeRewardUnits, '0.5');
});
test('interval rewards use ACT/365 simple interest without silently compounding', () => {
  assert.equal(lockedEarnScenario({ ...earn, days: 1 }).indicativeRewardAud, '0.027397260273972602');
  assert.equal(lockedEarnScenario({ ...earn, days: 366 }).indicativeRewardAud, '10.027397260273972602');
});
test('zero assumed reward rate produces no reward without changing safety gates', () => {
  const result = lockedEarnScenario({ ...earn, annualRatePercent: '0' });
  assert.equal(result.indicativeRewardUnits, '0'); assert.equal(result.depositsEnabled, false); assert.equal(result.payoutsEnabled, false);
  assert.equal(result.rateApproved, false); assert.equal(result.priceStatus, 'USER_SUPPLIED_NOT_VERIFIED'); assert(Object.isFrozen(LOCKED_EARN_MODEL));
});
test('decimal input keeps precision beyond JavaScript safe integers', () => {
  assert.equal(lockedEarnScenario({ ...earn, principalUnits: '9007199254740993', currentPriceAud: '1' }).currentValueAud, '9007199254740993');
  assert.equal(lockedEarnScenario({ ...earn, principalUnits: '0.000000000000000001' }).currentValueAud, '0.0000000000000001');
});
test('malformed, negative, non-finite and oversized decimal input is rejected', () => {
  for (const value of [-1, 1, null, 'NaN', 'Infinity', '-1', '1e3', ' 1', '01', '.1', '1.1234567890123456789', '1'.repeat(60)]) assert.throws(() => lockedEarnScenario({ ...earn, currentPriceAud: value }));
});
test('interval boundaries, zero divisors and unsupported fields fail closed', () => {
  for (const days of [0, 367, 1.5, '365', NaN]) assert.throws(() => lockedEarnScenario({ ...earn, days }));
  for (const field of ['principalUnits', 'currentPriceAud', 'rewardPriceAud']) assert.throws(() => lockedEarnScenario({ ...earn, [field]: '0' }));
  assert.throws(() => lockedEarnScenario({ ...earn, annualRatePercent: '101' }));
  assert.throws(() => lockedEarnScenario({ ...earn, activate: true })); assert.throws(() => lockedEarnScenario(null));
});
test('collateral risk exposes LTV, threshold price and stress loss', () => {
  const result = collateralLoanScenario(loan);
  assert.equal(result.ltvPercent, '50'); assert.equal(result.liquidationPriceAud, '62.5');
  assert.equal(result.stressedCollateralValueAud, '150'); assert.equal(result.thresholdBreached, false); assert.equal(result.stressedThresholdBreached, false);
});
test('exact threshold breaches are conservative and price declines trigger risk', () => {
  assert.equal(collateralLoanScenario({ ...loan, debtAud: '160' }).thresholdBreached, true);
  assert.equal(collateralLoanScenario({ ...loan, stressDropPercent: '50' }).stressedThresholdBreached, true);
});
test('total collateral loss exposes unbounded LTV and positive shortfall', () => {
  const result = collateralLoanScenario({ ...loan, stressDropPercent: '100' });
  assert.equal(result.stressedLtvPercent, null); assert.equal(result.shortfallAud, '100'); assert.equal(result.stressedThresholdBreached, true);
});
test('zero debt has no liquidation risk even at total loss', () => {
  const result = collateralLoanScenario({ ...loan, debtAud: '0', stressDropPercent: '100' });
  assert.equal(result.stressedLtvPercent, '0'); assert.equal(result.stressedThresholdBreached, false); assert.equal(result.liquidationPriceAud, '0');
  assert.equal(result.lendingEnabled, false); assert.equal(result.liquidationEnabled, false);
});
test('invalid collateral assumptions and subprecision values fail explicitly', () => {
  for (const threshold of ['0', '100', '101', '-1']) assert.throws(() => collateralLoanScenario({ ...loan, liquidationLtvPercent: threshold }));
  assert.throws(() => collateralLoanScenario({ ...loan, stressDropPercent: '101' }));
  assert.throws(() => collateralLoanScenario({ ...loan, collateralUnits: '0.000000000000000001', currentPriceAud: '0.000000000000000001' }));
});
