/**
 * React hook for the EcoSort scanner A/B experiment.
 *
 * Returns the variant ("basic" | "enhanced") and a one-shot
 * function to track the disposal_confirmed conversion event.
 *
 * Exposure tracking (critical for experiments):
 *   getValue() does NOT auto-record a $flag_exposure event.
 *   We explicitly call trackExposureEvent('scanner_experiment')
 *   after evaluating the flag so that Flagsmith can join the
 *   exposure with the disposal_confirmed conversion metric.
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

        // 1. Evaluate the flag — returns "basic" or "enhanced"
        const raw = flagsmith.getValue('scanner_experiment')
        const val = typeof raw === 'string' ? raw : 'basic'
        setVariant(val === 'enhanced' ? 'enhanced' : 'basic')

        // 2. Record the $flag_exposure event explicitly.
        //    getValue() does NOT do this automatically.
        //    trackExposureEvent() is safe to call even if the experiment
        //    is not yet running — it will be a no-op in that case.
        //    The SDK deduplicates exposures per identity+flag per flush.
        flagsmith.trackExposureEvent('scanner_experiment')

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
