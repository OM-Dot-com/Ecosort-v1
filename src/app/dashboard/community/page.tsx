'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import type { Group } from '@/lib/types'
import { Users, Plus, Search, MapPin, Lock, Globe, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CommunityPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const router = useRouter()
  const [tab, setTab] = useState<'discover' | 'my' | 'create'>('discover')
  const [groups, setGroups] = useState<Group[]>([])
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)

  // Create group form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [locationName, setLocationName] = useState('')
  const [maxMembers, setMaxMembers] = useState(50)
  const [isPublic, setIsPublic] = useState(true)
  const [goals, setGoals] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchGroups = async () => {
      const [allGroups, memberGroups] = await Promise.all([
        supabase.from('groups').select('*, organizer:profiles!organizer_id(id, full_name, avatar_url)').order('member_count', { ascending: false }),
        supabase.from('group_members').select('group_id, groups(*, organizer:profiles!organizer_id(id, full_name, avatar_url))').eq('user_id', user.id),
      ])
      setGroups(allGroups.data || [])
      setMyGroups((memberGroups.data || []).map((m: Record<string, unknown>) => m.groups as Group).filter(Boolean))
      setLoading(false)
    }
    fetchGroups()
  }, [user, supabase])

  const handleJoin = async (group: Group) => {
    if (!user) return
    setJoining(group.id)
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: group.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success(group.is_public ? 'Joined group!' : 'Join request sent!')
      if (group.is_public) {
        setMyGroups((prev) => [...prev, group])
        setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, member_count: g.member_count + 1 } : g))
      }
    } catch { toast.error('Failed to join') }
    finally { setJoining(null) }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Group name is required'); return }
    if (!user) return
    setCreating(true)
    try {
      const { data: group, error } = await supabase.from('groups').insert({
        name: name.trim(), description, location_name: locationName, max_members: maxMembers,
        is_public: isPublic, environmental_goals: goals.split(',').map((g) => g.trim()).filter(Boolean),
        organizer_id: user.id,
      }).select().single()
      if (error) { toast.error(error.message); return }
      // Add creator as organizer member
      await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, role: 'organizer' })
      await supabase.from('profiles').update({ groups_joined: (user.groups_joined || 0) + 1 }).eq('id', user.id)
      toast.success('Group created!')
      router.push(`/dashboard/community/${group.id}`)
    } catch { toast.error('Failed to create group') }
    finally { setCreating(false) }
  }

  const filtered = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
  const isMember = (gid: string) => myGroups.some((g) => g.id === gid)

  const tabs = [
    { key: 'discover' as const, label: 'Discover Groups', icon: Search },
    { key: 'my' as const, label: 'My Groups', icon: Users },
    { key: 'create' as const, label: 'Create Group', icon: Plus },
  ]

  return (
    <DashboardLayout>
      <div className="page-container">
        <h2 className="section-title flex items-center gap-2"><Users className="h-7 w-7" /> Eco Community</h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                tab === t.key ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-green-50 border border-green-100'
              }`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'discover' && (
          <>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input type="text" placeholder="Search groups..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-11" />
            </div>
            {loading ? <LoadingSpinner text="Loading groups..." /> : filtered.length === 0 ? (
              <EmptyState icon={<Users className="h-12 w-12" />} title="No groups found" description="Be the first to create a group!" action={{ label: 'Create Group', onClick: () => setTab('create') }} />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((group) => (
                  <div key={group.id} className="card hover:shadow-md transition-shadow animate-fade-in">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-green-800">{group.name}</h3>
                        {group.location_name && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{group.location_name}</p>
                        )}
                      </div>
                      {group.is_public ? <Globe className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4 text-orange-500" />}
                    </div>
                    {group.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{group.description}</p>}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(group.environmental_goals || []).slice(0, 3).map((g) => (
                        <Badge key={g} variant="success">{g}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar src={group.organizer?.avatar_url} name={group.organizer?.full_name || 'Organizer'} size="sm" />
                        <div>
                          <p className="text-xs text-gray-500">{group.member_count}/{group.max_members} members</p>
                        </div>
                      </div>
                      {isMember(group.id) ? (
                        <Link href={`/dashboard/community/${group.id}`} className="btn-secondary text-xs py-1.5 px-3">View</Link>
                      ) : (
                        <button onClick={() => handleJoin(group)} disabled={joining === group.id}
                          className="btn-primary text-xs py-1.5 px-3">
                          {joining === group.id ? '...' : group.is_public ? 'Join' : 'Request'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'my' && (
          loading ? <LoadingSpinner /> : myGroups.length === 0 ? (
            <EmptyState icon={<Users className="h-12 w-12" />} title="You haven't joined any groups" description="Discover and join groups near you"
              action={{ label: 'Discover Groups', onClick: () => setTab('discover') }} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myGroups.map((group) => (
                <Link key={group.id} href={`/dashboard/community/${group.id}`}
                  className="card hover:shadow-md transition-shadow animate-fade-in">
                  <h3 className="font-semibold text-green-800 mb-1">{group.name}</h3>
                  {group.location_name && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{group.location_name}</p>}
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{group.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-gray-500">{group.member_count} members</p>
                    <ArrowRight className="h-4 w-4 text-green-600" />
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {tab === 'create' && (
          <div className="card max-w-2xl animate-fade-in">
            <h3 className="text-lg font-semibold text-green-800 mb-4">Create New Group</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" required placeholder="e.g., Green Warriors Mumbai" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field" rows={3} placeholder="What is your group about?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)} className="input-field" placeholder="City or area name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Members</label>
                  <input type="number" value={maxMembers} onChange={(e) => setMaxMembers(Number(e.target.value))} className="input-field" min={2} max={500} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                  <div className="flex gap-3 mt-2">
                    <button type="button" onClick={() => setIsPublic(true)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${isPublic ? 'bg-green-100 text-green-700 ring-1 ring-green-300' : 'bg-gray-100 text-gray-600'}`}>
                      <Globe className="h-3 w-3" /> Public
                    </button>
                    <button type="button" onClick={() => setIsPublic(false)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${!isPublic ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-300' : 'bg-gray-100 text-gray-600'}`}>
                      <Lock className="h-3 w-3" /> Private
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Environmental Goals (comma separated)</label>
                <input type="text" value={goals} onChange={(e) => setGoals(e.target.value)} className="input-field" placeholder="e.g., Beach cleanup, Zero waste, Tree planting" />
              </div>
              <button type="submit" disabled={creating} className="btn-primary w-full">
                {creating ? 'Creating...' : 'Create Group'}
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
