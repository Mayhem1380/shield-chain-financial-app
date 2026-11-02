import { customerResponse } from '@/lib/customer-platform/http.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { return customerResponse('list', request); }
export async function POST(request: Request) { return customerResponse('create', request); }
