import { receiveWebhook, paymentResponse } from '@/lib/payments/runtime.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  return paymentResponse(receiveWebhook, request);
}
