'use client'
import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { Profile, Group } from '@/lib/types'
import { Trophy, Medal, Crown, Users } from 'lucide-react'

export default function LeaderboardPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [tab, setTab] = useState<'individual' | 'groups'>('individual')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [pRes, gRes] = await Promise.all([
        supabase.from('profiles').select('*').order('total_points', { ascending: false }).limit(50),
        supabase.from('groups').select('*, organizer:profiles!organizer_id(full_name)').order('member_count', { ascending: false }).limit(30),
      ])
      setProfiles(pRes.data || [])
      setGroups(gRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [supabase])

  const podiumColors = ['border-yellow-400 bg-yellow-50', 'border-gray-400 bg-gray-50', 'border-orange-400 bg-orange-50']
  const podiumIcons = [<Crown key="1" className="h-5 w-5 text-yellow-500" />, <Medal key="2" className="h-5 w-5 text-gray-400" />, <Medal key="3" className="h-5 w-5 text-orange-400" />]

  return (
    <DashboardLayout>
      <div className="page-container">
        <h2 className="section-title flex items-center gap-2"><Trophy className="h-7 w-7" /> Leaderboard</h2>

        <div className="flex gap-2 mb-6">
          {[{ key: 'individual' as const, label: 'Individual', icon: Trophy }, { key: 'groups' as const, label: 'Groups', icon: Users }].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                tab === t.key ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-green-50 border border-green-100'
              }`}><t.icon className="h-4 w-4" /> {t.label}</button>
          ))}
        </div>

        {loading ? <LoadingSpinner text="Loading leaderboard..." /> : tab === 'individual' ? (
          <>
            {/* Top 3 Podium */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {profiles.slice(0, 3).map((p, i) => (
                <div key={p.id} className={`card border-2 ${podiumColors[i]} text-center animate-fade-in`}>
                  <div className="flex justify-center mb-2">{podiumIcons[i]}</div>
                  <Avatar src={p.avatar_url} name={p.full_name || 'User'} size="lg" className="mx-auto mb-2" />
                  <p className="font-semibold text-sm truncate">{p.full_name}</p>
                  <p className="text-xs text-gray-500">{p.city || 'Earth'}</p>
                  <p className="text-lg font-bold text-green-700 mt-1">{p.total_points} pts</p>
                  <p className="text-xs text-gray-500">{p.completed_drives} drives</p>
                </div>
              ))}
            </div>

            {/* Full List */}
            <div className="card">
              <div className="space-y-1">
                {profiles.map((p, i) => (
                  <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    p.id === user?.id ? 'bg-green-100 ring-1 ring-green-300' : i % 2 === 0 ? 'bg-gray-50/50' : ''
                  }`}>
                    <span className={`text-sm font-bold w-8 text-center ${
                      i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-500'
                    }`}>#{i + 1}</span>
                    <Avatar src={p.avatar_url} name={p.full_name || 'User'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.full_name}{p.id === user?.id ? ' (You)' : ''}</p>
                      <p className="text-xs text-gray-500">{p.city || 'Earth'} · {p.completed_drives} drives</p>
                    </div>
                    <span className="text-sm font-bold text-green-700">{p.total_points}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="card">
            <div className="space-y-1">
              {groups.map((g, i) => (
                <div key={g.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-green-50">
                  <span className={`text-sm font-bold w-8 text-center ${
                    i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-500'
                  }`}>#{i + 1}</span>
                  <div className="bg-green-100 rounded-xl p-2"><Users className="h-5 w-5 text-green-700" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{g.name}</p>
                    <p className="text-xs text-gray-500">by {g.organizer?.full_name}</p>
                  </div>
                  <Badge variant="success">{g.member_count} members</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
