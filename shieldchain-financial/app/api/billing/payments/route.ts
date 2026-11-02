import { listPayments, paymentResponse } from '@/lib/payments/runtime.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  return paymentResponse(listPayments, request);
}
