import { sfWalletResponse } from '@/lib/sf-wallet/http.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { return sfWalletResponse('export', request); }
