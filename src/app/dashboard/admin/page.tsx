'use client'
import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { formatDate } from '@/lib/utils'
import type { Profile, CleaningEvent, CleanupEvidence, Report, PointConfig } from '@/lib/types'
import { Shield, Users, CalendarCheck, FileCheck, AlertTriangle, Settings, Lock, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [tab, setTab] = useState<'users' | 'events' | 'evidence' | 'reports' | 'settings'>('users')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [events, setEvents] = useState<CleaningEvent[]>([])
  const [evidence, setEvidence] = useState<CleanupEvidence[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [pointConfig, setPointConfig] = useState<PointConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ users: 0, groups: 0, events: 0, scans: 0 })

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    const fetchData = async () => {
      const [pRes, eRes, evRes, rRes, pcRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('cleaning_events').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('cleanup_evidence').select('*, profiles(full_name, email), cleaning_events(title)').eq('status', 'pending'),
        supabase.from('reports').select('*').eq('status', 'pending'),
        supabase.from('point_config').select('*').order('action_type'),
      ])
      setProfiles(pRes.data || [])
      setEvents(eRes.data || [])
      setEvidence(evRes.data || [])
      setReports(rRes.data || [])
      setPointConfig(pcRes.data || [])

      const [uCount, gCount, evCount, sCount] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('groups').select('*', { count: 'exact', head: true }),
        supabase.from('cleaning_events').select('*', { count: 'exact', head: true }),
        supabase.from('waste_scans').select('*', { count: 'exact', head: true }),
      ])
      setStats({ users: uCount.count || 0, groups: gCount.count || 0, events: evCount.count || 0, scans: sCount.count || 0 })
      setLoading(false)
    }
    fetchData()
  }, [user, supabase])

  const updateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin?action=updateRole`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole }),
      })
      if (!res.ok) { toast.error('Failed'); return }
      toast.success('Role updated')
      setProfiles((prev) => prev.map((p) => p.id === userId ? { ...p, role: newRole as Profile['role'] } : p))
    } catch { toast.error('Failed') }
  }

  const reviewEvidence = async (evidenceId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin?action=reviewEvidence`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceId, status }),
      })
      if (!res.ok) { toast.error('Failed'); return }
      toast.success(status === 'approved' ? 'Approved & points awarded' : 'Rejected')
      setEvidence((prev) => prev.filter((e) => e.id !== evidenceId))
    } catch { toast.error('Failed') }
  }

  const updateConfig = async () => {
    try {
      const res = await fetch(`/api/admin?action=updatePointConfig`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: pointConfig }),
      })
      if (!res.ok) { toast.error('Failed'); return }
      toast.success('Configuration saved')
    } catch { toast.error('Failed') }
  }

  if (!user || user.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="card text-center py-16">
            <Lock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">Access Denied</h2>
            <p className="text-gray-500">You need admin privileges to access this page.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        <h2 className="section-title flex items-center gap-2"><Shield className="h-7 w-7" /> Admin Panel</h2>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Users', value: stats.users, icon: Users },
            { label: 'Groups', value: stats.groups, icon: Users },
            { label: 'Events', value: stats.events, icon: CalendarCheck },
            { label: 'Scans', value: stats.scans, icon: BarChart3 },
          ].map((s) => (
            <div key={s.label} className="card text-center animate-fade-in">
              <s.icon className="h-6 w-6 mx-auto mb-1 text-green-600" />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: 'users' as const, label: 'Users', icon: Users },
            { key: 'events' as const, label: 'Events', icon: CalendarCheck },
            { key: 'evidence' as const, label: `Evidence (${evidence.length})`, icon: FileCheck },
            { key: 'reports' as const, label: `Reports (${reports.length})`, icon: AlertTriangle },
            { key: 'settings' as const, label: 'Settings', icon: Settings },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                tab === t.key ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-green-50 border border-green-100'
              }`}><t.icon className="h-4 w-4" /> {t.label}</button>
          ))}
        </div>

        {loading ? <LoadingSpinner /> : (
          <>
            {tab === 'users' && (
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-green-100">
                    <th className="text-left py-3 px-2">User</th>
                    <th className="text-left py-3 px-2">Email</th>
                    <th className="text-left py-3 px-2">Points</th>
                    <th className="text-left py-3 px-2">Role</th>
                    <th className="text-left py-3 px-2">Joined</th>
                  </tr></thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-green-50/50">
                        <td className="py-2 px-2 flex items-center gap-2"><Avatar src={p.avatar_url} name={p.full_name || 'User'} size="sm" />{p.full_name}</td>
                        <td className="py-2 px-2 text-gray-500">{p.email}</td>
                        <td className="py-2 px-2 font-medium">{p.total_points}</td>
                        <td className="py-2 px-2">
                          <select value={p.role} onChange={(e) => updateRole(p.id, e.target.value)} className="text-xs border rounded-lg px-2 py-1">
                            <option value="user">User</option>
                            <option value="organizer">Organizer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-2 px-2 text-gray-500">{formatDate(p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'events' && (
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-green-100">
                    <th className="text-left py-3 px-2">Title</th>
                    <th className="text-left py-3 px-2">Date</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2">Participants</th>
                  </tr></thead>
                  <tbody>
                    {events.map((e) => (
                      <tr key={e.id} className="border-b border-gray-50">
                        <td className="py-2 px-2 font-medium">{e.title}</td>
                        <td className="py-2 px-2 text-gray-500">{formatDate(e.event_date)}</td>
                        <td className="py-2 px-2"><Badge variant={e.status === 'upcoming' ? 'info' : e.status === 'completed' ? 'success' : 'default'}>{e.status}</Badge></td>
                        <td className="py-2 px-2">{e.participant_count}/{e.max_participants}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'evidence' && (
              evidence.length === 0 ? <EmptyState icon={<FileCheck className="h-12 w-12" />} title="No pending evidence" /> : (
                <div className="space-y-4">
                  {evidence.map((ev) => (
                    <div key={ev.id} className="card animate-fade-in">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{ev.profiles?.full_name}</p>
                          <p className="text-sm text-gray-500">Event: {ev.cleaning_events?.title}</p>
                          {ev.description && <p className="text-sm text-gray-600 mt-1">{ev.description}</p>}
                          <div className="flex gap-2 mt-2">
                            {ev.before_image_url && <a href={ev.before_image_url} target="_blank" className="text-xs text-blue-600 underline">Before Image</a>}
                            {ev.after_image_url && <a href={ev.after_image_url} target="_blank" className="text-xs text-blue-600 underline">After Image</a>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => reviewEvidence(ev.id, 'approved')} className="btn-primary text-xs py-1.5">Approve</button>
                          <button onClick={() => reviewEvidence(ev.id, 'rejected')} className="btn-danger text-xs py-1.5">Reject</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === 'reports' && (
              reports.length === 0 ? <EmptyState icon={<AlertTriangle className="h-12 w-12" />} title="No pending reports" /> : (
                <div className="space-y-3">
                  {reports.map((r) => (
                    <div key={r.id} className="card">
                      <Badge variant="warning">{r.reported_type}</Badge>
                      <p className="font-medium mt-2">{r.reason}</p>
                      {r.description && <p className="text-sm text-gray-600 mt-1">{r.description}</p>}
                      <p className="text-xs text-gray-500 mt-2">{formatDate(r.created_at)}</p>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === 'settings' && (
              <div className="card">
                <h3 className="font-semibold text-green-800 mb-4">Point Configuration</h3>
                <div className="space-y-3">
                  {pointConfig.map((pc, i) => (
                    <div key={pc.id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{pc.action_type}</p>
                        <p className="text-xs text-gray-500">{pc.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">Points:</label>
                        <input type="number" value={pc.points} onChange={(e) => {
                          const updated = [...pointConfig]
                          updated[i] = { ...pc, points: Number(e.target.value) }
                          setPointConfig(updated)
                        }} className="input-field w-20 text-sm py-1" />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">Daily limit:</label>
                        <input type="number" value={pc.daily_limit ?? ''} onChange={(e) => {
                          const updated = [...pointConfig]
                          updated[i] = { ...pc, daily_limit: e.target.value ? Number(e.target.value) : null }
                          setPointConfig(updated)
                        }} className="input-field w-20 text-sm py-1" placeholder="∞" />
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={updateConfig} className="btn-primary mt-4">Save Configuration</button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
