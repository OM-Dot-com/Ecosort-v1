'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import type { LearningContent } from '@/lib/types'
import { BookOpen, FileText, Video, HelpCircle, ArrowRight, Award } from 'lucide-react'

const categories = ['All', 'waste-segregation', 'recycling', 'composting', 'plastic', 'e-waste']
const categoryLabels: Record<string, string> = {
  'All': 'All', 'waste-segregation': 'Waste Segregation', 'recycling': 'Recycling',
  'composting': 'Composting', 'plastic': 'Plastic', 'e-waste': 'E-Waste',
}
const typeIcons = { article: BookOpen, guide: FileText, video: Video, quiz: HelpCircle }

export default function LearnPage() {
  const supabase = createClient()
  const [content, setContent] = useState<LearningContent[]>([])
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchContent = async () => {
      const { data } = await supabase.from('learning_content').select('*').eq('is_published', true).order('order_index')
      setContent(data || [])
      setLoading(false)
    }
    fetchContent()
  }, [supabase])

  const filtered = category === 'All' ? content : content.filter((c) => c.category === category)

  return (
    <DashboardLayout>
      <div className="page-container">
        <h2 className="section-title flex items-center gap-2"><BookOpen className="h-7 w-7" /> Recycling Guides</h2>

        {/* Category Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                category === cat ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-green-50 border border-green-100'
              }`}>{categoryLabels[cat]}</button>
          ))}
        </div>

        {loading ? <LoadingSpinner text="Loading content..." /> : filtered.length === 0 ? (
          <EmptyState icon={<BookOpen className="h-12 w-12" />} title="No content available" description="Check back soon for new learning materials" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => {
              const Icon = typeIcons[item.content_type] || BookOpen
              return (
                <Link key={item.id} href={`/dashboard/learn/${item.id}`}
                  className="card hover:shadow-md transition-all group animate-fade-in">
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-green-100 rounded-xl p-2.5">
                      <Icon className="h-5 w-5 text-green-700" />
                    </div>
                    <div className="flex gap-1">
                      <Badge variant={item.difficulty === 'beginner' ? 'success' : item.difficulty === 'intermediate' ? 'warning' : 'danger'}>
                        {item.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <h3 className="font-semibold text-green-800 mb-1 group-hover:text-green-700">{item.title}</h3>
                  {item.description && <p className="text-sm text-gray-600 line-clamp-2 mb-3">{item.description}</p>}
                  <div className="flex items-center justify-between">
                    <Badge variant="success"><Award className="h-3 w-3 inline mr-1" />{item.points_reward} pts</Badge>
                    <ArrowRight className="h-4 w-4 text-green-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
