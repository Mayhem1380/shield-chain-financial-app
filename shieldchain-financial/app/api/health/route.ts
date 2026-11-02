import { NextResponse } from 'next/server';

// This endpoint reports scaffold state only. It deliberately does not imply that
// the application is production-ready or that any financial capability is live.
export function GET() {
  return NextResponse.json(
    {
      status: 'scaffold',
      ready: false,
      service: 'shieldchain-financial-web',
      mode: 'demo-scaffold',
      dependencies: {
        database: 'not-configured',
        authentication: 'not-configured',
        emailDelivery: 'not-configured',
        identityVerification: 'not-configured',
      },
      capabilities: {
        liveTrading: false,
        livePayments: false,
        liveWallets: false,
        liveWithdrawals: false,
      },
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
