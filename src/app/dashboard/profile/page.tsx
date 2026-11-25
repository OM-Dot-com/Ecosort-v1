'use client'
import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { PointTransaction, Achievement, UserAchievement } from '@/lib/types'
import { User, Trophy, Calendar, Camera, Users, Edit, Save, X, TrendingUp, Award } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth()
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState('')
  const [saving, setSaving] = useState(false)
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setFullName(user.full_name || '')
    setCity(user.city || '')
    setBio(user.bio || '')
    setInterests((user.environmental_interests || []).join(', '))
    const fetchData = async () => {
      const [txRes, achRes, uaRes] = await Promise.all([
        supabase.from('point_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
        supabase.from('achievements').select('*').order('requirement_value'),
        supabase.from('user_achievements').select('*, achievements(*)').eq('user_id', user.id),
      ])
      setTransactions(txRes.data || [])
      setAchievements(achRes.data || [])
      setUserAchievements(uaRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [user, supabase])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: fullName.trim(), city: city.trim(), bio: bio.trim(),
        environmental_interests: interests.split(',').map((i) => i.trim()).filter(Boolean),
      }).eq('id', user.id)
      if (error) { toast.error(error.message); return }
      toast.success('Profile updated!')
      setEditing(false)
      refreshProfile()
    } catch { toast.error('Failed to update') }
    finally { setSaving(false) }
  }

  const earnedIds = new Set(userAchievements.map((ua) => ua.achievement_id))
  const stats = [
    { label: 'Points', value: user?.total_points || 0, icon: Trophy, color: 'text-green-700' },
    { label: 'Drives', value: user?.completed_drives || 0, icon: Calendar, color: 'text-blue-700' },
    { label: 'Scans', value: user?.waste_scans_count || 0, icon: Camera, color: 'text-orange-700' },
    { label: 'Groups', value: user?.groups_joined || 0, icon: Users, color: 'text-purple-700' },
  ]

  return (
    <DashboardLayout>
      <div className="page-container max-w-4xl">
        {/* Profile Header */}
        <div className="card mb-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <Avatar src={user?.avatar_url} name={user?.full_name || 'User'} size="lg" />
            <div className="flex-1">
              {editing ? (
                <div className="space-y-3">
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" placeholder="Full Name" />
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="input-field" placeholder="City" />
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input-field" rows={2} placeholder="Bio" />
                  <input type="text" value={interests} onChange={(e) => setInterests(e.target.value)} className="input-field" placeholder="Interests (comma separated)" />
                  <div className="flex gap-2">
                    <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-1"><Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}</button>
                    <button onClick={() => setEditing(false)} className="btn-secondary text-sm flex items-center gap-1"><X className="h-4 w-4" /> Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-green-800">{user?.full_name || 'User'}</h2>
                    <Badge variant={user?.role === 'admin' ? 'danger' : user?.role === 'organizer' ? 'info' : 'default'}>{user?.role}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  {user?.city && <p className="text-sm text-gray-500">{user.city}</p>}
                  {user?.bio && <p className="text-sm text-gray-600 mt-2">{user.bio}</p>}
                  {(user?.environmental_interests || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {user!.environmental_interests.map((i) => <Badge key={i} variant="success">{i}</Badge>)}
                    </div>
                  )}
                  <button onClick={() => setEditing(true)} className="btn-secondary text-sm mt-3 flex items-center gap-1"><Edit className="h-4 w-4" /> Edit Profile</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((s) => (
            <div key={s.label} className="card text-center animate-fade-in">
              <s.icon className={`h-6 w-6 mx-auto mb-1 ${s.color}`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Achievements */}
          <div className="card animate-fade-in">
            <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2"><Award className="h-5 w-5" /> Achievements</h3>
            {loading ? <LoadingSpinner size="sm" /> : (
              <div className="grid grid-cols-2 gap-3">
                {achievements.map((ach) => {
                  const earned = earnedIds.has(ach.id)
                  return (
                    <div key={ach.id} className={`p-3 rounded-xl text-center transition-all ${earned ? 'bg-gradient-to-br from-green-50 to-green-100 ring-1 ring-green-200' : 'bg-gray-50 opacity-50'}`}>
                      <span className="text-2xl">{ach.icon || '🏅'}</span>
                      <p className="text-xs font-semibold mt-1">{ach.name}</p>
                      <p className="text-[10px] text-gray-500">{ach.description}</p>
                      {earned && <Badge variant="success" className="mt-1 text-[10px]">Earned</Badge>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Points History */}
          <div className="card animate-fade-in">
            <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Points History</h3>
            {loading ? <LoadingSpinner size="sm" /> : transactions.length === 0 ? (
              <EmptyState icon={<Trophy className="h-10 w-10" />} title="No transactions yet" />
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-green-50">
                    <div className={`text-sm font-bold ${tx.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.points > 0 ? '+' : ''}{tx.points}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{tx.description || tx.transaction_type}</p>
                      <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                    </div>
                    <Badge>{tx.transaction_type}</Badge>
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
