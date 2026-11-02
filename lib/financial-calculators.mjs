// Pure decimal scenario mathematics; never creates an offer, position, credit or payment.
const SCALE = 10n ** 18n;
export class CalculationError extends Error {
  constructor(code) { super(code); this.code = code; }
}
function decimal(value, { zero = false } = {}) {
  if (typeof value !== 'string' || value.length > 50 || !/^(0|[1-9]\d{0,23})(\.\d{1,18})?$/.test(value)) throw new CalculationError('INVALID_DECIMAL');
  const [whole, fraction = ''] = value.split('.');
  const result = BigInt(whole) * SCALE + BigInt(fraction.padEnd(18, '0'));
  if (!zero && result === 0n) throw new CalculationError('POSITIVE_VALUE_REQUIRED');
  return result;
}
function format(value) {
  const sign = value < 0n ? '-' : ''; const absolute = value < 0n ? -value : value;
  const fraction = (absolute % SCALE).toString().padStart(18, '0').replace(/0+$/, '');
  return sign + (absolute / SCALE).toString() + (fraction ? '.' + fraction : '');
}
function fields(input, expected) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !expected.includes(key)) || expected.some(key => !(key in input))) throw new CalculationError('INVALID_CALCULATION_INPUT');
}

export const LOCKED_EARN_MODEL = Object.freeze({
  status: 'PROPOSED_NOT_ACTIVE', basis: 'CURRENT_MARKET_VALUE_AT_EACH_CALCULATION',
  dayCount: 'ACT_365_FIXED', compounding: false, rounding: 'DOWN_AT_18_DECIMALS',
  rateApproved: false, depositsEnabled: false, payoutsEnabled: false,
});

// One interval at a supplied current price. A multi-interval schedule must reprice
// every interval. This function must never be used as an authorized payout ledger.
export function lockedEarnScenario(input) {
  fields(input, ['principalUnits', 'currentPriceAud', 'rewardPriceAud', 'annualRatePercent', 'days']);
  const principal = decimal(input.principalUnits), currentPrice = decimal(input.currentPriceAud);
  const rewardPrice = decimal(input.rewardPriceAud), rate = decimal(input.annualRatePercent, { zero: true });
  if (rate > 100n * SCALE) throw new CalculationError('RATE_OUT_OF_SCENARIO_RANGE');
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > 366) throw new CalculationError('INVALID_INTERVAL_DAYS');
  // Keep intermediate precision until each output; avoid binary floats and daily truncation.
  const valueNumerator = principal * currentPrice;
  const rewardNumerator = valueNumerator * rate * BigInt(input.days);
  const rewardDenominator = SCALE * SCALE * 100n * 365n;
  return {
    ...LOCKED_EARN_MODEL, priceStatus: 'USER_SUPPLIED_NOT_VERIFIED', currency: 'AUD',
    currentValueAud: format(valueNumerator / SCALE),
    indicativeRewardAud: format(rewardNumerator / rewardDenominator),
    indicativeRewardUnits: format(rewardNumerator * SCALE / (rewardDenominator * rewardPrice)),
    days: input.days,
    warning: 'Scenario only. Rates are not approved or promised. Rewards may be zero and capital may be lost. Revalue every interval; future prices, liquidity, fees and eligibility are unknown.',
  };
}

export function collateralLoanScenario(input) {
  fields(input, ['collateralUnits', 'currentPriceAud', 'debtAud', 'liquidationLtvPercent', 'stressDropPercent']);
  const units = decimal(input.collateralUnits), price = decimal(input.currentPriceAud);
  const debt = decimal(input.debtAud, { zero: true }), threshold = decimal(input.liquidationLtvPercent);
  const drop = decimal(input.stressDropPercent, { zero: true });
  if (threshold >= 100n * SCALE || drop > 100n * SCALE) throw new CalculationError('INVALID_RISK_PERCENTAGE');
  const value = units * price / SCALE;
  if (value === 0n) throw new CalculationError('COLLATERAL_VALUE_BELOW_PRECISION');
  const stressed = value * (100n * SCALE - drop) / (100n * SCALE);
  const breached = debt * 100n * SCALE >= value * threshold && debt > 0n;
  const stressedBreach = debt > 0n && (stressed === 0n || debt * 100n * SCALE >= stressed * threshold);
  return {
    status: 'RISK_SCENARIO_ONLY', currency: 'AUD', priceStatus: 'USER_SUPPLIED_NOT_VERIFIED',
    collateralValueAud: format(value), ltvPercent: format(debt * 100n * SCALE / value),
    liquidationPriceAud: format(debt * 100n * SCALE * SCALE / (units * threshold)),
    stressedCollateralValueAud: format(stressed),
    stressedLtvPercent: stressed === 0n ? (debt > 0n ? null : '0') : format(debt * 100n * SCALE / stressed),
    thresholdBreached: breached, stressedThresholdBreached: stressedBreach,
    shortfallAud: format(debt > stressed ? debt - stressed : 0n),
    lendingEnabled: false, liquidationEnabled: false,
    warning: 'Thresholds are assumptions, not loan terms. Excludes interest, fees, collateral haircuts, execution delay and slippage. Liquidation can occur before a displayed estimate; no credit or protection is offered.',
  };
}
