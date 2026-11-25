'use client'
import React, { useState, useEffect, Suspense } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/utils'
import type { Group, GroupMember, GroupMessage, GroupJoinRequest } from '@/lib/types'
import { Users, MessageCircle, Send, MapPin, Globe, Lock, Crown, LogOut, Check, X, Megaphone } from 'lucide-react'
import toast from 'react-hot-toast'

function GroupDetailContent() {
  const { id } = useParams()
  const { user } = useAuth()
  const supabase = createClient()
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [requests, setRequests] = useState<GroupJoinRequest[]>([])
  const [isMember, setIsMember] = useState(false)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [tab, setTab] = useState<'discussion' | 'members' | 'requests'>('discussion')
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!user || !id) return
    const fetchData = async () => {
      const [groupRes, membersRes, messagesRes] = await Promise.all([
        supabase.from('groups').select('*, organizer:profiles!organizer_id(*)').eq('id', id).single(),
        supabase.from('group_members').select('*, profiles(*)').eq('group_id', id),
        supabase.from('group_messages').select('*, profiles(*)').eq('group_id', id).order('created_at', { ascending: true }).limit(100),
      ])
      setGroup(groupRes.data)
      setMembers(membersRes.data || [])
      setMessages(messagesRes.data || [])
      const memberRecord = (membersRes.data || []).find((m: GroupMember) => m.user_id === user.id)
      setIsMember(!!memberRecord)
      setIsOrganizer(groupRes.data?.organizer_id === user.id)
      if (groupRes.data?.organizer_id === user.id) {
        const reqRes = await supabase.from('group_join_requests').select('*, profiles(*)').eq('group_id', id).eq('status', 'pending')
        setRequests(reqRes.data || [])
      }
      setLoading(false)
    }
    fetchData()
  }, [id, user, supabase])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || !id) return
    setSending(true)
    try {
      const res = await fetch('/api/groups/message', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: id, content: newMessage.trim() }),
      })
      if (!res.ok) { const d = await res.json(); toast.error(d.error); return }
      const data = await res.json()
      setMessages((prev) => [...prev, { ...data.message, profiles: user }])
      setNewMessage('')
    } catch { toast.error('Failed to send') }
    finally { setSending(false) }
  }

  const handleRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/groups/requests', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, action }),
      })
      if (!res.ok) { toast.error('Failed'); return }
      toast.success(action === 'approve' ? 'Approved!' : 'Rejected')
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
    } catch { toast.error('Failed') }
  }

  const handleLeave = async () => {
    if (!user || !id || isOrganizer) { toast.error('Organizers cannot leave their own group'); return }
    try {
      const res = await fetch('/api/groups/leave', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: id }),
      })
      if (!res.ok) { toast.error('Failed to leave'); return }
      toast.success('Left group')
      setIsMember(false)
    } catch { toast.error('Failed') }
  }

  if (loading) return <DashboardLayout><div className="page-container"><LoadingSpinner text="Loading group..." /></div></DashboardLayout>
  if (!group) return <DashboardLayout><div className="page-container"><EmptyState title="Group not found" icon={<Users className="h-12 w-12" />} /></div></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Header */}
        <div className="card mb-6 animate-fade-in">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-green-800">{group.name}</h2>
                {group.is_public ? <Globe className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4 text-orange-500" />}
              </div>
              {group.location_name && <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="h-4 w-4" />{group.location_name}</p>}
              {group.description && <p className="text-gray-600 mt-2">{group.description}</p>}
              <div className="flex flex-wrap gap-1 mt-3">
                {(group.environmental_goals || []).map((g) => <Badge key={g} variant="success">{g}</Badge>)}
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1"><Users className="h-4 w-4" />{group.member_count} members</span>
                <span className="flex items-center gap-1"><Crown className="h-4 w-4" />{group.organizer?.full_name}</span>
              </div>
            </div>
            {isMember && !isOrganizer && (
              <button onClick={handleLeave} className="btn-danger text-sm flex items-center gap-1"><LogOut className="h-4 w-4" /> Leave</button>
            )}
          </div>
        </div>

        {!isMember && !group.is_public ? (
          <div className="card text-center py-12">
            <Lock className="h-12 w-12 text-orange-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">Private Group</h3>
            <p className="text-gray-500">Request to join to see group content</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {[
                { key: 'discussion' as const, label: 'Discussion', icon: MessageCircle },
                { key: 'members' as const, label: 'Members', icon: Users },
                ...(isOrganizer ? [{ key: 'requests' as const, label: `Requests (${requests.length})`, icon: Megaphone }] : []),
              ].map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    tab === t.key ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-green-50 border border-green-100'
                  }`}>
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              ))}
            </div>

            {tab === 'discussion' && (
              <div className="card">
                <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                  {messages.length === 0 ? (
                    <EmptyState icon={<MessageCircle className="h-10 w-10" />} title="No messages yet" description="Start the conversation!" />
                  ) : messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.user_id === user?.id ? 'flex-row-reverse' : ''}`}>
                      <Avatar src={msg.profiles?.avatar_url} name={msg.profiles?.full_name || 'User'} size="sm" />
                      <div className={`max-w-xs lg:max-w-md ${msg.user_id === user?.id ? 'text-right' : ''}`}>
                        <p className="text-xs text-gray-500 mb-1">{msg.profiles?.full_name} · {timeAgo(msg.created_at)}</p>
                        <div className={`inline-block px-4 py-2 rounded-2xl text-sm ${
                          msg.user_id === user?.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800'
                        }`}>{msg.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {isMember && (
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..." className="input-field flex-1" />
                    <button type="submit" disabled={sending || !newMessage.trim()} className="btn-primary px-4">
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </div>
            )}

            {tab === 'members' && (
              <div className="card">
                <div className="space-y-3">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-green-50">
                      <Avatar src={m.profiles?.avatar_url} name={m.profiles?.full_name || 'User'} size="sm" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{m.profiles?.full_name}</p>
                        <p className="text-xs text-gray-500">Joined {timeAgo(m.joined_at)}</p>
                      </div>
                      {m.role === 'organizer' && <Badge variant="success"><Crown className="h-3 w-3 inline mr-1" />Organizer</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'requests' && isOrganizer && (
              <div className="card">
                {requests.length === 0 ? (
                  <EmptyState title="No pending requests" icon={<Users className="h-10 w-10" />} />
                ) : (
                  <div className="space-y-3">
                    {requests.map((req) => (
                      <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-yellow-50">
                        <Avatar src={req.profiles?.avatar_url} name={req.profiles?.full_name || 'User'} size="sm" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{req.profiles?.full_name}</p>
                          {req.message && <p className="text-xs text-gray-500">{req.message}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleRequest(req.id, 'approve')} className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"><Check className="h-4 w-4" /></button>
                          <button onClick={() => handleRequest(req.id, 'reject')} className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"><X className="h-4 w-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function GroupDetailPage() {
  return (
    <Suspense fallback={<DashboardLayout><div className="page-container"><LoadingSpinner text="Loading group..." /></div></DashboardLayout>}>
      <GroupDetailContent />
    </Suspense>
  )
}
