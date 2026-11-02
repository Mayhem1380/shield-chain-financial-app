import { reconcilePaymentBatch, disconnectPaymentDb } from '../lib/payments/runtime.mjs';

if (process.argv[2] !== '--run') {
  console.error('Requires --run and securely injected provider/database configuration. Reads Stripe and updates payment records.');
  process.exitCode = 1;
} else {
  try {
    console.log(JSON.stringify(await reconcilePaymentBatch()));
  } catch {
    console.error('Payment reconciliation failed. Check credentials, approvals, schema and database availability.');
    process.exitCode = 1;
  } finally { await disconnectPaymentDb(); }
}
