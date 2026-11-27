/**
 * ScanResultCard — renders the AI scan result with Flagsmith A/B variants.
 *
 * Version A ("basic"):
 *   waste name · category · confidence · bin · recyclable status
 *   "View Disposal Guide →"  |  "I disposed of it correctly ✓"
 *   NO inline disposal instructions.
 *
 * Version B ("enhanced"):
 *   Same as A PLUS inline disposal instructions (2–3 lines).
 *   "View Full Disposal Guide →"  |  "I disposed of it correctly ✓"
 *
 * Both variants show environmental impact and low-confidence warning.
 */
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useScannerExperiment } from '@/hooks/useScannerExperiment'
import { Badge } from '@/components/ui/Badge'
import type { WasteScan } from '@/lib/types'
import {
  AlertTriangle, CheckCircle, XCircle, BookOpen, Check,
} from 'lucide-react'

interface ScanResultCardProps {
  result: WasteScan
  pointsAwarded: number
  onScanAnother: () => void
}

function getCategoryVariant(cat: string) {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'purple'> = {
    'Wet Waste': 'success', 'Dry Waste': 'info', 'Recyclable': 'warning',
    'Non-Recyclable': 'danger', 'Hazardous': 'danger', 'E-Waste': 'purple',
  }
  return map[cat] || 'default'
}

export default function ScanResultCard({
  result, pointsAwarded, onScanAnother,
}: ScanResultCardProps) {
  const { user } = useAuth()
  const { variant, isReady, trackDisposalConfirmed } = useScannerExperiment(user?.id ?? null)
  const [confirmed, setConfirmed] = useState(false)

  const handleConfirm = () => {
    if (confirmed) return
    trackDisposalConfirmed()
    setConfirmed(true)
  }

  return (
    <div className="card animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-green-800">Scan Results</h3>
        {pointsAwarded > 0 && (
          <Badge variant="success">+{pointsAwarded} pts</Badge>
        )}
      </div>

      {/* Low confidence warning — shown in both variants */}
      {result.needs_verification && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Low Confidence</p>
            <p className="text-xs text-yellow-700">AI confidence is low. Please verify this classification.</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Waste Name & Category */}
        <div>
          <p className="text-2xl font-bold text-gray-800">{result.waste_name}</p>
          <Badge variant={getCategoryVariant(result.waste_category)} className="mt-1">
            {result.waste_category}
          </Badge>
        </div>

        {/* Confidence Score */}
        {result.confidence_score !== null && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Confidence</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full transition-all"
                style={{
                  width: `${(result.confidence_score) * 100}%`,
                  backgroundColor: result.confidence_score > 0.7 ? '#16a34a' : result.confidence_score > 0.4 ? '#eab308' : '#ef4444',
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{Math.round(result.confidence_score * 100)}%</p>
          </div>
        )}

        {/* Recommended Bin */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
          <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: result.bin_color || '#6b7280' }} />
          <div>
            <p className="text-xs text-gray-500">Recommended Bin</p>
            <p className="text-sm font-medium">{result.recommended_bin}</p>
          </div>
        </div>

        {/* Recyclable Status */}
        <div className="flex items-center gap-2">
          {result.recyclable ? (
            <><CheckCircle className="h-5 w-5 text-green-600" /><span className="text-sm font-medium text-green-700">Recyclable</span></>
          ) : (
            <><XCircle className="h-5 w-5 text-red-500" /><span className="text-sm font-medium text-red-600">Not Recyclable</span></>
          )}
        </div>

        {/* ── VARIANT B ("enhanced"): inline disposal instructions ── */}
        {isReady && variant === 'enhanced' && result.disposal_instructions && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-green-700 font-semibold mb-1">♻️ Disposal Instructions</p>
            <p className="text-sm text-green-800 leading-relaxed">{result.disposal_instructions}</p>
          </div>
        )}

        {/* Environmental Impact — shown in both variants */}
        {result.environmental_impact && (
          <div>
            <p className="text-xs text-gray-500 mb-1 font-medium">Environmental Impact</p>
            <p className="text-sm text-gray-700 leading-relaxed">{result.environmental_impact}</p>
          </div>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="mt-5 space-y-2">
        {/* Disposal guide link */}
        <Link href="/dashboard/learn" className="btn-secondary w-full flex items-center justify-center gap-2">
          <BookOpen className="h-4 w-4" />
          {variant === 'enhanced' ? 'View Full Disposal Guide →' : 'View Disposal Guide →'}
        </Link>

        {/* Disposal confirmed — tracks the disposal_confirmed metric */}
        <button
          onClick={handleConfirm}
          disabled={confirmed}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            confirmed
              ? 'bg-green-100 text-green-700 cursor-default'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <Check className="h-4 w-4" />
          {confirmed ? 'Disposal Confirmed ✓' : 'I disposed of it correctly ✓'}
        </button>

        {/* Scan another */}
        <button onClick={onScanAnother} className="btn-secondary w-full">
          Scan Another
        </button>
      </div>

      {/* Experiment debug badge (dev only) */}
      {process.env.NODE_ENV === 'development' && isReady && (
        <p className="text-[10px] text-gray-400 text-center mt-3">
          Experiment variant: <span className="font-mono">{variant}</span>
        </p>
      )}
    </div>
  )
}
