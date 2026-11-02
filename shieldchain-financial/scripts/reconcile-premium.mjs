import { reconcilePremiumBatch } from '../lib/payments/premium-runtime.mjs';
import { disconnectPaymentDb } from '../lib/payments/runtime.mjs';

if (process.argv[2] !== '--run') {
  console.error('Requires --run and injected provider/database configuration. Reconciles subscription access and invoice records.');
  process.exitCode = 1;
} else {
  try { console.log(JSON.stringify(await reconcilePremiumBatch())); }
  catch { console.error('Premium subscription reconciliation failed. Check infrastructure and provider configuration.'); process.exitCode = 1; }
  finally { await disconnectPaymentDb(); }
}
