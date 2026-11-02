import { authResponse } from '@/lib/auth/http.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  return authResponse('sessions', request);
}
