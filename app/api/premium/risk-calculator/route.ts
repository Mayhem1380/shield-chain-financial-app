import { requirePremiumAccess } from '@/lib/payments/premium-runtime.mjs';
import { readBillingBody, paymentResponse } from '@/lib/payments/runtime.mjs';
import { calculatePremiumRisk } from '@/lib/payments/premium-policy.mjs';
import { PaymentError } from '@/lib/payments/stripe.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  return paymentResponse(async () => {
    if (request.headers.get('origin') !== process.env.PAYMENTS_ORIGIN || request.headers.get('sec-fetch-site') === 'cross-site') throw new PaymentError('REQUEST_ORIGIN_REJECTED', 403);
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new PaymentError('JSON_REQUIRED', 415);
    await requirePremiumAccess(request);
    return calculatePremiumRisk(await readBillingBody(request));
  }, request);
}
