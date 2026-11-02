import { authResponse } from '@/lib/auth/http.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  return authResponse('logout', request);
}
