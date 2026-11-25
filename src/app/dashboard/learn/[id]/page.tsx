'use client'
import React, { useState, useEffect, Suspense } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import type { LearningContent } from '@/lib/types'
import { BookOpen, CheckCircle, Award, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

function LearnDetailContent() {
  const { id } = useParams()
  const { user, refreshProfile } = useAuth()
  const supabase = createClient()
  const [content, setContent] = useState<LearningContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    if (!id || !user) return
    const fetchData = async () => {
      const { data } = await supabase.from('learning_content').select('*').eq('id', id).single()
      setContent(data)
      // Check if already completed today
      const today = new Date().toISOString().split('T')[0]
      const { data: attempt } = await supabase
        .from('quiz_attempts')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', id as string)
        .gte('created_at', today)
        .limit(1)
      setCompleted((attempt || []).length > 0)
      setLoading(false)
    }
    fetchData()
  }, [id, user, supabase])

  const handleComplete = async () => {
    if (!user || !id) return
    setCompleting(true)
    try {
      const res = await fetch('/api/learn/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: id, score: 100, max_score: 100 }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success(`Completed! +${data.points_awarded} points`)
      setCompleted(true)
      refreshProfile()
    } catch { toast.error('Failed') }
    finally { setCompleting(false) }
  }

  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-green-800 mt-6 mb-3">{line.slice(2)}</h1>
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-semibold text-green-700 mt-5 mb-2">{line.slice(3)}</h2>
      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-semibold text-green-600 mt-4 mb-2">{line.slice(4)}</h3>
      if (line.startsWith('- ')) return <li key={i} className="ml-4 text-gray-700 list-disc">{line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').split('<strong>').map((part, j) => part.includes('</strong>') ? <strong key={j}>{part.replace('</strong>', '')}</strong> : part)}</li>
      if (line.match(/^\d+\. /)) return <li key={i} className="ml-4 text-gray-700 list-decimal">{line.replace(/^\d+\. /, '')}</li>
      if (line.trim() === '') return <br key={i} />
      return <p key={i} className="text-gray-700 leading-relaxed">{line}</p>
    })
  }

  if (loading) return <DashboardLayout><div className="page-container"><LoadingSpinner /></div></DashboardLayout>
  if (!content) return <DashboardLayout><div className="page-container"><EmptyState title="Content not found" icon={<BookOpen className="h-12 w-12" />} /></div></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="page-container max-w-3xl">
        <Link href="/dashboard/learn" className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to guides
        </Link>

        <div className="card animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="success">{content.category}</Badge>
            <Badge variant={content.difficulty === 'beginner' ? 'success' : 'warning'}>{content.difficulty}</Badge>
            <Badge><Award className="h-3 w-3 inline mr-1" />{content.points_reward} pts</Badge>
          </div>

          <h1 className="text-2xl font-bold text-green-800 mb-2">{content.title}</h1>
          {content.description && <p className="text-gray-600 mb-6">{content.description}</p>}

          <div className="prose prose-green max-w-none mb-6">
            {content.content ? renderContent(content.content) : <p className="text-gray-500">No content available.</p>}
          </div>

          {/* Completion */}
          <div className="border-t border-green-100 pt-4 mt-6">
            {completed ? (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl p-4">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Completed today! Points have been awarded.</span>
              </div>
            ) : (
              <button onClick={handleComplete} disabled={completing} className="btn-primary w-full flex items-center justify-center gap-2">
                {completing ? 'Completing...' : <><Award className="h-5 w-5" /> Complete & Earn {content.points_reward} Points</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function LearnDetailPage() {
  return (
    <Suspense fallback={<DashboardLayout><div className="page-container"><LoadingSpinner /></div></DashboardLayout>}>
      <LearnDetailContent />
    </Suspense>
  )
}
