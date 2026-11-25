'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { useLocation } from '@/hooks/useLocation'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/utils'
import type { CleaningEvent, EventRegistration } from '@/lib/types'
import { CalendarCheck, Plus, MapPin, Clock, Users as UsersIcon, Search } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DrivesPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const router = useRouter()
  const [tab, setTab] = useState<'upcoming' | 'my' | 'organize'>('upcoming')
  const [events, setEvents] = useState<CleaningEvent[]>([])
  const [myRegs, setMyRegs] = useState<EventRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Create form state
  const { location: loc } = useLocation()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [locationName, setLocationName] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [meetingPoint, setMeetingPoint] = useState('')
  const [maxParticipants, setMaxParticipants] = useState(30)
  const [cleaningType, setCleaningType] = useState('Neighborhood Cleanup')
  const [equipment, setEquipment] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      const [evRes, regRes] = await Promise.all([
        supabase.from('cleaning_events').select('*, organizer:profiles!organizer_id(id, full_name, avatar_url)')
          .in('status', ['upcoming', 'ongoing']).gte('event_date', new Date().toISOString()).order('event_date'),
        supabase.from('event_registrations').select('*, cleaning_events(*, organizer:profiles!organizer_id(id, full_name, avatar_url))')
          .eq('user_id', user.id).neq('status', 'cancelled'),
      ])
      setEvents(evRes.data || [])
      setMyRegs(regRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [user, supabase])

  const handleRegister = async (eventId: string) => {
    try {
      const res = await fetch('/api/events/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success('Registered!')
      setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, participant_count: e.participant_count + 1 } : e))
    } catch { toast.error('Failed to register') }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !locationName || !eventDate) { toast.error('Fill required fields'); return }
    if (!user) return
    setCreating(true)
    try {
      const { error } = await supabase.from('cleaning_events').insert({
        title, description, location_name: locationName,
        latitude: lat ? parseFloat(lat) : loc?.latitude || 0,
        longitude: lng ? parseFloat(lng) : loc?.longitude || 0,
        event_date: new Date(eventDate).toISOString(), meeting_point: meetingPoint,
        max_participants: maxParticipants, cleaning_type: cleaningType,
        required_equipment: equipment.split(',').map((s) => s.trim()).filter(Boolean),
        organizer_id: user.id,
      })
      if (error) { toast.error(error.message); return }
      toast.success('Event created!')
      setTab('upcoming')
      router.refresh()
    } catch { toast.error('Failed') }
    finally { setCreating(false) }
  }

  const filtered = events.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()) || e.location_name.toLowerCase().includes(search.toLowerCase()))
  const isRegistered = (eid: string) => myRegs.some((r) => r.event_id === eid)

  return (
    <DashboardLayout>
      <div className="page-container">
        <h2 className="section-title flex items-center gap-2"><CalendarCheck className="h-7 w-7" /> Cleaning Drives</h2>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: 'upcoming' as const, label: 'Upcoming Drives' },
            { key: 'my' as const, label: 'My Registrations' },
            ...(user?.role !== 'user' ? [{ key: 'organize' as const, label: 'Organize' }] : []),
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                tab === t.key ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-green-50 border border-green-100'
              }`}>{t.label}</button>
          ))}
        </div>

        {tab === 'upcoming' && (
          <>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input type="text" placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-11" />
            </div>
            {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
              <EmptyState icon={<CalendarCheck className="h-12 w-12" />} title="No upcoming drives" description="Check back later or organize your own!" />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((event) => (
                  <div key={event.id} className="card hover:shadow-md transition-shadow animate-fade-in">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-green-800">{event.title}</h3>
                      {event.cleaning_type && <Badge variant="info">{event.cleaning_type}</Badge>}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{event.description}</p>
                    <div className="space-y-1 text-sm text-gray-500 mb-4">
                      <p className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location_name}</p>
                      <p className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDateTime(event.event_date)}</p>
                      <p className="flex items-center gap-1"><UsersIcon className="h-3 w-3" />{event.participant_count}/{event.max_participants}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/drives/${event.id}`} className="btn-secondary text-xs py-1.5 flex-1 text-center">Details</Link>
                      {!isRegistered(event.id) ? (
                        <button onClick={() => handleRegister(event.id)} className="btn-primary text-xs py-1.5 flex-1"
                          disabled={event.participant_count >= event.max_participants}>
                          {event.participant_count >= event.max_participants ? 'Full' : 'Register'}
                        </button>
                      ) : (
                        <span className="btn-secondary text-xs py-1.5 flex-1 text-center opacity-70">Registered ✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'my' && (
          loading ? <LoadingSpinner /> : myRegs.length === 0 ? (
            <EmptyState icon={<CalendarCheck className="h-12 w-12" />} title="No registrations" description="Browse and register for upcoming drives"
              action={{ label: 'Browse Drives', onClick: () => setTab('upcoming') }} />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {myRegs.map((reg) => (
                <Link key={reg.id} href={`/dashboard/drives/${reg.event_id}`}
                  className="card hover:shadow-md transition-shadow flex items-center gap-4">
                  <CalendarCheck className="h-8 w-8 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{reg.cleaning_events?.title}</p>
                    <p className="text-xs text-gray-500">{reg.cleaning_events ? formatDateTime(reg.cleaning_events.event_date) : ''}</p>
                  </div>
                  <Badge variant={reg.status === 'attended' ? 'success' : 'info'}>{reg.status}</Badge>
                </Link>
              ))}
            </div>
          )
        )}

        {tab === 'organize' && (
          <div className="card max-w-2xl animate-fade-in">
            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2"><Plus className="h-5 w-5" /> Create Cleaning Drive</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" required placeholder="e.g., Weekend Beach Cleanup" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field" rows={3} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                  <input type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)} className="input-field" required placeholder="Location name" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
                  <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="input-field" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                  <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} className="input-field" placeholder="Auto-detected" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                  <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} className="input-field" placeholder="Auto-detected" /></div>
              </div>
              {loc && <button type="button" onClick={() => { setLat(String(loc.latitude)); setLng(String(loc.longitude)) }}
                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"><MapPin className="h-3 w-3" /> Use my location</button>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Meeting Point</label>
                  <input type="text" value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Participants</label>
                  <input type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(Number(e.target.value))} className="input-field" min={2} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Cleanup Type</label>
                <select value={cleaningType} onChange={(e) => setCleaningType(e.target.value)} className="input-field">
                  {['Beach Cleanup', 'Park Cleanup', 'Street Cleanup', 'River Cleanup', 'Neighborhood Cleanup', 'Other'].map((t) => <option key={t}>{t}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Required Equipment (comma separated)</label>
                <input type="text" value={equipment} onChange={(e) => setEquipment(e.target.value)} className="input-field" placeholder="e.g., Gloves, Trash bags, Masks" /></div>
              <button type="submit" disabled={creating} className="btn-primary w-full">{creating ? 'Creating...' : 'Create Cleaning Drive'}</button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
