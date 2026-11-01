import { createBillingPortal } from '@/lib/payments/premium-runtime.mjs';
import { paymentResponse } from '@/lib/payments/runtime.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  return paymentResponse(createBillingPortal, request);
}
