/**
 * Flagsmith client singleton for EcoSort A/B experiment.
 *
 * Docs:
 *   https://docs.flagsmith.com/clients/javascript
 *   https://docs.flagsmith.com/experimentation/run-an-experiment
 *
 * Key points from official docs:
 *   - enableEvents: true  → required for experiment event pipeline
 *   - getValue() does NOT auto-record a $flag_exposure event
 *   - trackExposureEvent('flag_name') → explicitly records exposure
 *   - trackEvent('metric_name')       → records a conversion event
 *   - flushEvents()                   → force-sends buffered events
 */
import flagsmith from '@flagsmith/flagsmith'

const FLAGSMITH_ENV_KEY =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_KEY ?? ''
    : ''

/** Persistent anonymous identity stored in localStorage. */
function getOrCreateAnonId(): string {
  const KEY = 'ecosort_anon_id'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}

/**
 * Returns a stable identity string:
 *   - logged-in → Supabase user UUID
 *   - anonymous → persistent random UUID from localStorage
 *
 * Never sends PII (email, name) to Flagsmith.
 */
export function resolveIdentity(supabaseUserId: string | null): string {
  return supabaseUserId ?? getOrCreateAnonId()
}

let initPromise: Promise<void> | null = null
let flushListenerAdded = false

/**
 * Initialise Flagsmith once per page load, then identify the user.
 * Also registers a visibilitychange listener to flush buffered events
 * when the page is hidden (tab switch, navigate away, close).
 *
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function ensureFlagsmith(identity: string): Promise<void> {
  if (!FLAGSMITH_ENV_KEY) {
    console.warn('[EcoSort] NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_KEY is not set — Flagsmith disabled.')
    return
  }

  if (!initPromise) {
    initPromise = flagsmith.init({
      environmentID: FLAGSMITH_ENV_KEY,
      enableAnalytics: true,
      enableEvents: true,  // Required for experiment event tracking
      cacheFlags: true,
    })
  }

  await initPromise
  await flagsmith.identify(identity)

  // Flush buffered events when the user navigates away or hides the tab.
  // Using 'visibilitychange' instead of 'beforeunload' because modern
  // browsers reliably fire it and allow sendBeacon / keepalive fetches.
  if (!flushListenerAdded && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flagsmith.flushEvents()
      }
    })
    flushListenerAdded = true
  }
}

export { flagsmith }
