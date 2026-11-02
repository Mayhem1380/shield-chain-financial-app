import { createCheckout, paymentResponse, paymentDb } from '@/lib/payments/runtime.mjs';
import { assertServiceEnabled } from '@/lib/customer-platform/policy.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  return paymentResponse(async (checked: Request) => {
    await assertServiceEnabled(await paymentDb(), 'BILLING_CHECKOUT');
    return createCheckout(checked);
  }, request);
}
