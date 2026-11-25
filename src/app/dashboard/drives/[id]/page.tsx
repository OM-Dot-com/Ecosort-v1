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
import { formatDateTime } from '@/lib/utils'
import type { CleaningEvent, EventRegistration } from '@/lib/types'
import { CalendarCheck, MapPin, Clock, Users as UsersIcon, CheckSquare, Upload, Crown } from 'lucide-react'
import toast from 'react-hot-toast'

function EventDetailContent() {
  const { id } = useParams()
  const { user } = useAuth()
  const supabase = createClient()
  const [event, setEvent] = useState<CleaningEvent | null>(null)
  const [registrations, setRegistrations] = useState<EventRegistration[]>([])
  const [isRegistered, setIsRegistered] = useState(false)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [attendanceChecked, setAttendanceChecked] = useState<Set<string>>(new Set())

  // Evidence form
  const [beforeUrl, setBeforeUrl] = useState('')
  const [afterUrl, setAfterUrl] = useState('')
  const [evidenceDesc, setEvidenceDesc] = useState('')

  useEffect(() => {
    if (!user || !id) return
    const fetchData = async () => {
      const [evRes, regRes] = await Promise.all([
        supabase.from('cleaning_events').select('*, organizer:profiles!organizer_id(*), groups(name)').eq('id', id).single(),
        supabase.from('event_registrations').select('*, profiles(*)').eq('event_id', id).neq('status', 'cancelled'),
      ])
      setEvent(evRes.data)
      setRegistrations(regRes.data || [])
      setIsRegistered((regRes.data || []).some((r: EventRegistration) => r.user_id === user.id))
      setIsOrganizer(evRes.data?.organizer_id === user.id)
      setLoading(false)
    }
    fetchData()
  }, [id, user, supabase])

  const handleRegister = async () => {
    try {
      const res = await fetch('/api/events/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success('Registered!')
      setIsRegistered(true)
      if (event) setEvent({ ...event, participant_count: event.participant_count + 1 })
    } catch { toast.error('Failed') }
  }

  const handleCancel = async () => {
    try {
      const res = await fetch('/api/events/register', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: id }),
      })
      if (!res.ok) { toast.error('Failed'); return }
      toast.success('Registration cancelled')
      setIsRegistered(false)
      if (event) setEvent({ ...event, participant_count: Math.max(0, event.participant_count - 1) })
    } catch { toast.error('Failed') }
  }

  const handleAttendance = async () => {
    if (attendanceChecked.size === 0) { toast.error('Select participants'); return }
    try {
      const res = await fetch('/api/events/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: id, user_ids: Array.from(attendanceChecked) }),
      })
      if (!res.ok) { toast.error('Failed'); return }
      toast.success('Attendance marked & points awarded!')
    } catch { toast.error('Failed') }
  }

  const handleEvidence = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/events/evidence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: id, before_image_url: beforeUrl, after_image_url: afterUrl, description: evidenceDesc }),
      })
      if (!res.ok) { toast.error('Failed'); return }
      toast.success('Evidence submitted!')
      setBeforeUrl(''); setAfterUrl(''); setEvidenceDesc('')
    } catch { toast.error('Failed') }
  }

  if (loading) return <DashboardLayout><div className="page-container"><LoadingSpinner text="Loading event..." /></div></DashboardLayout>
  if (!event) return <DashboardLayout><div className="page-container"><EmptyState title="Event not found" icon={<CalendarCheck className="h-12 w-12" />} /></div></DashboardLayout>

  const statusVariant = { upcoming: 'info' as const, ongoing: 'warning' as const, completed: 'success' as const, cancelled: 'danger' as const, verified: 'success' as const }

  return (
    <DashboardLayout>
      <div className="page-container max-w-4xl">
        {/* Header */}
        <div className="card mb-6 animate-fade-in">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Badge variant={statusVariant[event.status]}>{event.status}</Badge>
              <h2 className="text-2xl font-bold text-green-800 mt-2">{event.title}</h2>
            </div>
            {!isOrganizer && event.status === 'upcoming' && (
              isRegistered ? (
                <button onClick={handleCancel} className="btn-danger text-sm">Cancel Registration</button>
              ) : (
                <button onClick={handleRegister} className="btn-primary" disabled={event.participant_count >= event.max_participants}>
                  {event.participant_count >= event.max_participants ? 'Full' : 'Register'}
                </button>
              )
            )}
          </div>
          {event.description && <p className="text-gray-600 mb-4">{event.description}</p>}
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <p className="flex items-center gap-2 text-gray-600"><MapPin className="h-4 w-4 text-green-600" />{event.location_name}</p>
            <p className="flex items-center gap-2 text-gray-600"><Clock className="h-4 w-4 text-green-600" />{formatDateTime(event.event_date)}</p>
            <p className="flex items-center gap-2 text-gray-600"><UsersIcon className="h-4 w-4 text-green-600" />{event.participant_count}/{event.max_participants} participants</p>
            {event.meeting_point && <p className="flex items-center gap-2 text-gray-600"><MapPin className="h-4 w-4 text-green-600" />Meet at: {event.meeting_point}</p>}
            <p className="flex items-center gap-2 text-gray-600"><Crown className="h-4 w-4 text-green-600" />Organizer: {event.organizer?.full_name}</p>
            {event.cleaning_type && <p className="flex items-center gap-2 text-gray-600"><CheckSquare className="h-4 w-4 text-green-600" />{event.cleaning_type}</p>}
          </div>
          {event.required_equipment.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Required Equipment:</p>
              <div className="flex flex-wrap gap-2">
                {event.required_equipment.map((eq) => <Badge key={eq}>{eq}</Badge>)}
              </div>
            </div>
          )}
        </div>

        {/* Participants */}
        <div className="card mb-6">
          <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2"><UsersIcon className="h-5 w-5" /> Participants</h3>
          {registrations.length === 0 ? <p className="text-gray-500 text-sm">No participants yet</p> : (
            <div className="space-y-2">
              {registrations.map((reg) => (
                <div key={reg.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-green-50">
                  {isOrganizer && event.status !== 'verified' && (
                    <input type="checkbox" checked={attendanceChecked.has(reg.user_id)}
                      onChange={(e) => {
                        const s = new Set(attendanceChecked)
                        e.target.checked ? s.add(reg.user_id) : s.delete(reg.user_id)
                        setAttendanceChecked(s)
                      }} className="rounded text-green-600" />
                  )}
                  <Avatar src={reg.profiles?.avatar_url} name={reg.profiles?.full_name || 'User'} size="sm" />
                  <span className="text-sm font-medium flex-1">{reg.profiles?.full_name}</span>
                  <Badge variant={reg.status === 'attended' ? 'success' : 'default'}>{reg.status}</Badge>
                </div>
              ))}
            </div>
          )}
          {isOrganizer && registrations.length > 0 && event.status !== 'verified' && (
            <button onClick={handleAttendance} className="btn-primary mt-4 text-sm" disabled={attendanceChecked.size === 0}>
              <CheckSquare className="h-4 w-4 inline mr-1" /> Mark Attendance & Award Points
            </button>
          )}
        </div>

        {/* Upload Evidence */}
        {isRegistered && (
          <div className="card mb-6">
            <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2"><Upload className="h-5 w-5" /> Submit Cleanup Evidence</h3>
            <form onSubmit={handleEvidence} className="space-y-3">
              <input type="url" value={beforeUrl} onChange={(e) => setBeforeUrl(e.target.value)} className="input-field" placeholder="Before image URL" />
              <input type="url" value={afterUrl} onChange={(e) => setAfterUrl(e.target.value)} className="input-field" placeholder="After image URL" />
              <textarea value={evidenceDesc} onChange={(e) => setEvidenceDesc(e.target.value)} className="input-field" rows={2} placeholder="Description of cleanup work" />
              <button type="submit" className="btn-primary text-sm">Submit Evidence</button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function EventDetailPage() {
  return (
    <Suspense fallback={<DashboardLayout><div className="page-container"><LoadingSpinner text="Loading event..." /></div></DashboardLayout>}>
      <EventDetailContent />
    </Suspense>
  )
}
