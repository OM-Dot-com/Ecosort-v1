'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { formatDate, timeAgo } from '@/lib/utils'
import type { WasteScan, CleaningEvent, UserAchievement, Profile } from '@/lib/types'
import {
  Trophy, CalendarCheck, Users, Camera, BookOpen, ArrowRight,
  Recycle, MapPin, Award, Sparkles,
} from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [recentScans, setRecentScans] = useState<WasteScan[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<CleaningEvent[]>([])
  const [achievements, setAchievements] = useState<UserAchievement[]>([])
  const [leaderboard, setLeaderboard] = useState<Partial<Profile>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      const [scans, events, badges, leaders] = await Promise.all([
        supabase.from('waste_scans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('event_registrations').select('*, cleaning_events(*)').eq('user_id', user.id).eq('status', 'registered').limit(5),
        supabase.from('user_achievements').select('*, achievements(*)').eq('user_id', user.id).order('earned_at', { ascending: false }).limit(6),
        supabase.from('profiles').select('id, full_name, avatar_url, total_points, city').order('total_points', { ascending: false }).limit(5),
      ])
      setRecentScans(scans.data || [])
      setUpcomingEvents((events.data || []).map((r: Record<string, unknown>) => r.cleaning_events as CleaningEvent).filter(Boolean))
      setAchievements(badges.data || [])
      setLeaderboard(leaders.data || [])
      setLoading(false)
    }
    fetchData()
  }, [user, supabase])

  const stats = [
    { label: 'Total Points', value: user?.total_points || 0, icon: Trophy, color: 'bg-green-100 text-green-700' },
    { label: 'Drives Completed', value: user?.completed_drives || 0, icon: CalendarCheck, color: 'bg-blue-100 text-blue-700' },
    { label: 'Groups Joined', value: user?.groups_joined || 0, icon: Users, color: 'bg-purple-100 text-purple-700' },
    { label: 'Waste Scans', value: user?.waste_scans_count || 0, icon: Camera, color: 'bg-orange-100 text-orange-700' },
  ]

  const quickActions = [
    { label: 'Scan Waste', icon: Camera, href: '/dashboard/scanner', color: 'from-green-500 to-green-700' },
    { label: 'Find Groups', icon: Users, href: '/dashboard/community', color: 'from-blue-500 to-blue-700' },
    { label: 'Join Drive', icon: CalendarCheck, href: '/dashboard/drives', color: 'from-purple-500 to-purple-700' },
    { label: 'Learn Recycling', icon: BookOpen, href: '/dashboard/learn', color: 'from-orange-500 to-orange-700' },
  ]

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Welcome */}
        <div className="card bg-gradient-to-r from-green-700 to-green-800 text-white mb-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Welcome back, {user?.full_name?.split(' ')[0] || 'Eco Warrior'}! 🌿</h2>
              <p className="text-green-200">Every small action counts. Keep making a difference!</p>
            </div>
            <Sparkles className="h-12 w-12 text-green-300 hidden sm:block" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <div key={stat.label} className="card animate-fade-in">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}
              className={`bg-gradient-to-br ${action.color} text-white rounded-2xl p-5 hover:scale-[1.02] transition-transform shadow-sm`}>
              <action.icon className="h-8 w-8 mb-3 opacity-90" />
              <p className="font-semibold">{action.label}</p>
              <ArrowRight className="h-4 w-4 mt-2 opacity-70" />
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Scans */}
          <div className="card animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-green-800">Recent Scans</h3>
              <Link href="/dashboard/scanner" className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {loading ? <LoadingSpinner size="sm" /> : recentScans.length === 0 ? (
              <EmptyState icon={<Recycle className="h-10 w-10" />} title="No scans yet" description="Scan your first waste item with AI" />
            ) : (
              <div className="space-y-3">
                {recentScans.map((scan) => (
                  <div key={scan.id} className="flex items-center gap-3 p-3 rounded-xl bg-green-50/50">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: scan.bin_color || '#22c55e' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{scan.waste_name}</p>
                      <p className="text-xs text-gray-500">{timeAgo(scan.created_at)}</p>
                    </div>
                    <Badge variant={scan.recyclable ? 'success' : 'warning'}>{scan.waste_category}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="card animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-green-800">Upcoming Events</h3>
              <Link href="/dashboard/drives" className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {loading ? <LoadingSpinner size="sm" /> : upcomingEvents.length === 0 ? (
              <EmptyState icon={<CalendarCheck className="h-10 w-10" />} title="No upcoming events" description="Browse and register for cleaning drives" />
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <Link key={event.id} href={`/dashboard/drives/${event.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-green-50/50 hover:bg-green-100/50 transition-colors">
                    <CalendarCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{event.location_name} · {formatDate(event.event_date)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Achievements */}
          <div className="card animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-green-800">Achievements</h3>
              <Link href="/dashboard/profile" className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {loading ? <LoadingSpinner size="sm" /> : achievements.length === 0 ? (
              <EmptyState icon={<Award className="h-10 w-10" />} title="No achievements yet" description="Complete activities to earn badges" />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {achievements.map((ua) => (
                  <div key={ua.id} className="flex flex-col items-center p-3 rounded-xl bg-gradient-to-br from-green-50 to-green-100">
                    <span className="text-2xl mb-1">{ua.achievements?.icon || '🏅'}</span>
                    <p className="text-xs font-medium text-center text-green-800">{ua.achievements?.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="card animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-green-800">Top Eco Warriors</h3>
              <Link href="/dashboard/leaderboard" className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {loading ? <LoadingSpinner size="sm" /> : (
              <div className="space-y-3">
                {leaderboard.map((profile, i) => (
                  <div key={profile.id} className={`flex items-center gap-3 p-3 rounded-xl ${
                    profile.id === user?.id ? 'bg-green-100 ring-1 ring-green-300' : 'bg-gray-50'
                  }`}>
                    <span className={`text-sm font-bold w-6 text-center ${
                      i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-500'
                    }`}>#{i + 1}</span>
                    <Avatar src={profile.avatar_url} name={profile.full_name || 'User'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{profile.full_name}</p>
                    </div>
                    <span className="text-sm font-bold text-green-700">{profile.total_points} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
