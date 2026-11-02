import { customerResponse } from '@/lib/customer-platform/http.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { return customerResponse('command', request); }
