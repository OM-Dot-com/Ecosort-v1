'use client'
import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { timeAgo } from '@/lib/utils'
import type { AppNotification } from '@/lib/types'
import { Bell, Users, Calendar, Trophy, Award, CheckCheck, Circle } from 'lucide-react'
import toast from 'react-hot-toast'

const typeIcons: Record<string, React.ElementType> = {
  general: Bell, group: Users, event: Calendar, points: Trophy,
  achievement: Award, reward: Trophy, learning: Award,
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setNotifications(data || [])
      setLoading(false)
    }
    fetchNotifications()
  }, [user, supabase])

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    if (!user) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    toast.success('All notifications marked as read')
  }

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications
  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <DashboardLayout>
      <div className="page-container max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title mb-0 flex items-center gap-2"><Bell className="h-7 w-7" /> Notifications</h2>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-secondary text-sm flex items-center gap-1">
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          {(['all', 'unread'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                filter === f ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-green-50 border border-green-100'
              }`}>
              {f === 'all' ? 'All' : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>

        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <EmptyState icon={<Bell className="h-12 w-12" />}
            title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            description="You'll see notifications about groups, events, points, and more here" />
        ) : (
          <div className="space-y-2">
            {filtered.map((notif) => {
              const Icon = typeIcons[notif.type] || Bell
              return (
                <div key={notif.id}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                  className={`card flex items-start gap-3 cursor-pointer transition-all hover:shadow-sm ${
                    notif.is_read ? 'opacity-70' : 'border-l-4 border-l-green-500'
                  }`}>
                  <div className={`p-2 rounded-xl flex-shrink-0 ${notif.is_read ? 'bg-gray-100' : 'bg-green-100'}`}>
                    <Icon className={`h-5 w-5 ${notif.is_read ? 'text-gray-500' : 'text-green-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${notif.is_read ? 'text-gray-600' : 'text-green-800'}`}>{notif.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(notif.created_at)}</p>
                  </div>
                  {!notif.is_read && <Circle className="h-3 w-3 fill-green-500 text-green-500 mt-1 flex-shrink-0" />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
