'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MobileNav } from './MobileNav'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      setUnreadCount(count || 0)
    }
    fetchUnread()
  }, [user, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50/30">
        <LoadingSpinner size="lg" text="Loading EcoSort..." />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-green-50/30">
      <Sidebar user={user} onSignOut={signOut} />
      <div className="lg:pl-64">
        <TopBar user={user} unreadCount={unreadCount} />
        <main className="pb-20 lg:pb-6">{children}</main>
      </div>
      <MobileNav user={user} />
    </div>
  )
}
