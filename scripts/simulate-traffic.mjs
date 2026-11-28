/**
 * ============================================================
 *  ALL TRAFFIC IN THIS SCRIPT IS SIMULATED.
 *
 *  This script is for the WeMakeDevs × Flagsmith Hackathon 2026
 *  demonstration ONLY. It is NOT part of the EcoSort application.
 *
 *  Every simulated user has an IDENTICAL 40 % probability of
 *  confirming disposal, regardless of which variant ("basic" or
 *  "enhanced") Flagsmith assigns. Any difference in conversion
 *  rates between the two groups is therefore random chance, not
 *  a real treatment effect.
 * ============================================================
 *
 *  Usage:
 *    node --env-file=.env.local scripts/simulate-traffic.mjs [N]
 *
 *  N = number of simulated users (default 200).
 */

import flagsmith from '@flagsmith/flagsmith';
import { randomUUID } from 'node:crypto';

// ── Config ──────────────────────────────────────────────────
const CONVERSION_PROBABILITY = 0.4;      // identical for both variants
const DELAY_MS               = 300;      // pause between users
const ENV_KEY = process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_KEY;

if (!ENV_KEY) {
  console.error(
    '\n❌  NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_KEY is not set.\n' +
    '    Run with:  node --env-file=.env.local scripts/simulate-traffic.mjs [N]\n'
  );
  process.exit(1);
}

const N = Math.max(1, parseInt(process.argv[2], 10) || 200);

// ── Helpers ─────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Main ────────────────────────────────────────────────────
const stats = {
  basic:    { users: 0, confirmed: 0 },
  enhanced: { users: 0, confirmed: 0 },
};

console.log(`\n🚀  Simulating ${N} users against scanner_experiment …\n`);

await flagsmith.init({
  environmentID:   ENV_KEY,
  enableEvents:    true,
  enableAnalytics: false,
  cacheFlags:      false,
  fetch:           globalThis.fetch,
  enableLogs:      true,           // SDK debug logging — shows event dispatch
});

for (let i = 1; i <= N; i++) {
  const identity = 'sim-' + randomUUID();

  // 1. Identify with a trait so simulated users are distinguishable
  await flagsmith.identify(identity, { simulated: 'true' });

  // 2. getExperimentFlag evaluates the flag AND records $flag_exposure
  //    in one call (official docs: https://docs.flagsmith.com/experimentation/run-an-experiment)
  const flag    = flagsmith.getExperimentFlag('scanner_experiment');
  const raw     = flag?.value;
  const variant = raw === 'enhanced' ? 'enhanced' : 'basic';

  // 3. 40 % chance of confirming disposal — same for both variants
  const confirmed = Math.random() < CONVERSION_PROBABILITY;
  if (confirmed) {
    flagsmith.trackEvent('disposal_confirmed');
  }

  // Book-keeping
  stats[variant].users++;
  if (confirmed) stats[variant].confirmed++;

  // 5. Flush and pause
  await flagsmith.flushEvents();
  await sleep(DELAY_MS);

  // Progress log every 10 users (and on the last one)
  if (i % 10 === 0 || i === N) {
    console.log(`  [${i}/${N}]  identity=${identity}  variant=${variant}  confirmed=${confirmed}`);
  }
}

// Final flush + cooldown so the Flagsmith API receives everything
console.log('\n⏳  Waiting 3 s for final event delivery …');
await flagsmith.flushEvents();
await sleep(3000);

// ── Summary ─────────────────────────────────────────────────
const table = Object.entries(stats).map(([variant, s]) => ({
  Variant:      variant,
  Users:        s.users,
  Confirmed:    s.confirmed,
  'Rate (%)':   s.users ? ((s.confirmed / s.users) * 100).toFixed(1) : '—',
}));

console.log('\n📊  Results (ALL SIMULATED — identical 40 % conversion probability):\n');
console.table(table);
console.log('');
