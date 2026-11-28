/**
 * React hook for the EcoSort scanner A/B experiment.
 *
 * Returns the variant ("basic" | "enhanced") and a one-shot
 * function to track the disposal_confirmed conversion event.
 *
 * Exposure tracking (critical for experiments):
 *   getExperimentFlag('scanner_experiment') evaluates the flag AND
 *   records the $flag_exposure event in one call. This is the
 *   recommended approach from the official docs:
 *   https://docs.flagsmith.com/experimentation/run-an-experiment
 *
 * Event flushing:
 *   ensureFlagsmith() registers a visibilitychange listener that
 *   calls flushEvents() when the page is hidden, so buffered
 *   events are not lost on tab switch / navigate away / close.
 *
 * Docs:
 *   https://docs.flagsmith.com/clients/javascript
 *   https://docs.flagsmith.com/experimentation/run-an-experiment
 */
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { flagsmith, resolveIdentity, ensureFlagsmith } from '@/lib/flagsmith'

type Variant = 'basic' | 'enhanced'

interface ScannerExperiment {
  /** Which variant was assigned ("basic" = control, "enhanced" = variation). */
  variant: Variant
  /** True once Flagsmith has initialised and the flag has been evaluated. */
  isReady: boolean
  /** Call when user clicks "I disposed of it correctly ✓". Fires at most once. */
  trackDisposalConfirmed: () => void
}

export function useScannerExperiment(
  supabaseUserId: string | null,
): ScannerExperiment {
  const [variant, setVariant] = useState<Variant>('basic')
  const [isReady, setIsReady] = useState(false)
  const tracked = useRef(false)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const identity = resolveIdentity(supabaseUserId)
        await ensureFlagsmith(identity)

        if (cancelled) return

        // getExperimentFlag evaluates the flag AND records the
        // $flag_exposure event in one call (official docs recommend this).
        const flag = flagsmith.getExperimentFlag('scanner_experiment')
        const raw = flag?.value
        const val = typeof raw === 'string' ? raw : 'basic'
        setVariant(val === 'enhanced' ? 'enhanced' : 'basic')

        setIsReady(true)
      } catch (err) {
        console.error('[EcoSort] Flagsmith init failed, falling back to control:', err)
        setVariant('basic')
        setIsReady(true)
      }
    }

    run()
    return () => { cancelled = true }
  }, [supabaseUserId])

  const trackDisposalConfirmed = useCallback(() => {
    if (tracked.current) return          // guard: fire only once per scan result
    tracked.current = true

    try {
      // trackEvent sends the conversion metric to Flagsmith.
      // The event name must exactly match the metric name in the dashboard.
      flagsmith.trackEvent('disposal_confirmed')
    } catch (err) {
      console.error('[EcoSort] Failed to track disposal_confirmed:', err)
    }
  }, [])

  return { variant, isReady, trackDisposalConfirmed }
}
