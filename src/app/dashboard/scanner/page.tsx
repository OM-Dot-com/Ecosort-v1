'use client'
import React, { useState, useEffect, useRef } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { timeAgo } from '@/lib/utils'
import type { WasteScan } from '@/lib/types'
import {
  Camera, Upload, Recycle, AlertTriangle, CheckCircle, XCircle,
  History, X, Sparkles, Image as ImageIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ScannerPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<WasteScan | null>(null)
  const [pointsAwarded, setPointsAwarded] = useState(0)
  const [history, setHistory] = useState<WasteScan[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('waste_scans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      setHistory(data || [])
      setLoadingHistory(false)
    }
    fetchHistory()
  }, [user, supabase])

  const handleImageSelect = (file: File) => {
    setSelectedImage(file)
    setPreview(URL.createObjectURL(file))
    setResult(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageSelect(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleImageSelect(file)
  }

  const clearImage = () => {
    setSelectedImage(null)
    setPreview(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleScan = async () => {
    if (!selectedImage) return
    setScanning(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('image', selectedImage)
      const response = await fetch('/api/scan', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Scan failed')
        return
      }
      setResult(data.scan)
      setPointsAwarded(data.pointsAwarded)
      toast.success(`Scan complete! +${data.pointsAwarded} points`)
      // Refresh history
      setHistory((prev) => [data.scan, ...prev])
    } catch {
      toast.error('Failed to scan image. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  const getCategoryVariant = (cat: string) => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'purple'> = {
      'Wet Waste': 'success', 'Dry Waste': 'info', 'Recyclable': 'warning',
      'Non-Recyclable': 'danger', 'Hazardous': 'danger', 'E-Waste': 'purple',
    }
    return map[cat] || 'default'
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        <h2 className="section-title flex items-center gap-2">
          <Camera className="h-7 w-7" /> AI Waste Scanner
        </h2>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Scanner Section */}
          <div className="space-y-4">
            {/* Upload Area */}
            {!preview ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="card border-2 border-dashed border-green-300 hover:border-green-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center py-12">
                  <div className="bg-green-100 rounded-full p-4 mb-4">
                    <Upload className="h-10 w-10 text-green-600" />
                  </div>
                  <p className="text-lg font-semibold text-green-800 mb-1">Upload Waste Image</p>
                  <p className="text-sm text-gray-500 mb-4">Drag & drop or click to select</p>
                  <div className="flex gap-3">
                    <button className="btn-secondary text-sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
                      <ImageIcon className="h-4 w-4 inline mr-1" /> Choose File
                    </button>
                    <button className="btn-primary text-sm" onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click() }}>
                      <Camera className="h-4 w-4 inline mr-1" /> Take Photo
                    </button>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
              </div>
            ) : (
              <div className="card">
                <div className="relative">
                  <img src={preview} alt="Selected waste" className="w-full h-64 object-cover rounded-xl" />
                  <button onClick={clearImage}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <button onClick={handleScan} disabled={scanning} className="btn-primary w-full mt-4">
                  {scanning ? (
                    <span className="flex items-center justify-center gap-2">
                      <Recycle className="h-5 w-5 animate-spin-slow" /> Analyzing with AI...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="h-5 w-5" /> Scan with AI
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Scanning Animation */}
            {scanning && (
              <div className="card text-center py-8 animate-fade-in">
                <Recycle className="h-16 w-16 text-green-500 animate-spin-slow mx-auto mb-4" />
                <p className="text-lg font-semibold text-green-800">Analyzing waste...</p>
                <p className="text-sm text-gray-500 mt-1">Our AI is identifying the waste type</p>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div>
            {result && (
              <div className="card animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-green-800">Scan Results</h3>
                  {pointsAwarded > 0 && (
                    <Badge variant="success">+{pointsAwarded} pts</Badge>
                  )}
                </div>

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

                  {/* Bin */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: result.bin_color || '#6b7280' }} />
                    <div>
                      <p className="text-xs text-gray-500">Recommended Bin</p>
                      <p className="text-sm font-medium">{result.recommended_bin}</p>
                    </div>
                  </div>

                  {/* Recyclable */}
                  <div className="flex items-center gap-2">
                    {result.recyclable ? (
                      <><CheckCircle className="h-5 w-5 text-green-600" /><span className="text-sm font-medium text-green-700">Recyclable</span></>
                    ) : (
                      <><XCircle className="h-5 w-5 text-red-500" /><span className="text-sm font-medium text-red-600">Not Recyclable</span></>
                    )}
                  </div>

                  {/* Instructions */}
                  {result.disposal_instructions && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1 font-medium">Disposal Instructions</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{result.disposal_instructions}</p>
                    </div>
                  )}

                  {/* Environmental Impact */}
                  {result.environmental_impact && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1 font-medium">Environmental Impact</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{result.environmental_impact}</p>
                    </div>
                  )}
                </div>

                <button onClick={clearImage} className="btn-secondary w-full mt-4">
                  Scan Another
                </button>
              </div>
            )}

            {/* Scan History */}
            <div className={`card ${result ? 'mt-6' : ''}`}>
              <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                <History className="h-5 w-5" /> Scan History
              </h3>
              {loadingHistory ? <LoadingSpinner size="sm" /> : history.length === 0 ? (
                <EmptyState icon={<Camera className="h-10 w-10" />} title="No scans yet" description="Upload an image to get started" />
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {history.map((scan) => (
                    <div key={scan.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 transition-colors">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: scan.bin_color || '#22c55e' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{scan.waste_name}</p>
                        <p className="text-xs text-gray-500">{timeAgo(scan.created_at)}</p>
                      </div>
                      <Badge variant={getCategoryVariant(scan.waste_category)}>{scan.waste_category}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
