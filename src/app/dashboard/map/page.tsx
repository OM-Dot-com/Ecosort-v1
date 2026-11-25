'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useLocation } from '@/hooks/useLocation'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { calculateDistance, formatDateTime } from '@/lib/utils'
import type { CleaningEvent, Group } from '@/lib/types'
import { Map, MapPin, CalendarCheck, Users, Search, AlertCircle, Navigation } from 'lucide-react'

export default function MapPage() {
  const { location, loading: locLoading, permissionDenied, setManualLocation } = useLocation()
  const supabase = createClient()
  const [events, setEvents] = useState<CleaningEvent[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [maxDistance, setMaxDistance] = useState(50)
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const [evRes, grRes] = await Promise.all([
        supabase.from('cleaning_events').select('*').in('status', ['upcoming', 'ongoing']).gte('event_date', new Date().toISOString()),
        supabase.from('groups').select('*').eq('is_public', true),
      ])
      setEvents(evRes.data || [])
      setGroups(grRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [supabase])

  const withDistance = <T extends { latitude?: number | null; longitude?: number | null }>(items: T[]) => {
    if (!location) return items.map((item) => ({ ...item, distance: undefined }))
    return items
      .map((item) => ({
        ...item,
        distance: item.latitude && item.longitude
          ? calculateDistance(location.latitude, location.longitude, item.latitude, item.longitude)
          : undefined,
      }))
      .filter((item) => item.distance === undefined || item.distance <= maxDistance)
      .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))
  }

  const nearbyEvents = withDistance(events).filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) || e.location_name.toLowerCase().includes(search.toLowerCase())
  )
  const nearbyGroups = withDistance(groups).filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) || (g.location_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const hasMapKey = typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  return (
    <DashboardLayout>
      <div className="page-container">
        <h2 className="section-title flex items-center gap-2"><Map className="h-7 w-7" /> Nearby Map</h2>

        {/* Map notice */}
        {!hasMapKey && (
          <div className="card bg-blue-50 border-blue-200 mb-6 flex items-start gap-3 animate-fade-in">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">Interactive Map Not Configured</p>
              <p className="text-xs text-blue-600 mt-1">Set <code className="bg-blue-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your .env.local to enable the interactive map view. Showing list view below.</p>
            </div>
          </div>
        )}

        {/* Location Notice */}
        {permissionDenied && (
          <div className="card bg-yellow-50 border-yellow-200 mb-4 animate-fade-in">
            <p className="text-sm text-yellow-800 mb-2">📍 Location permission denied. Using default location. Enter your coordinates manually:</p>
            <div className="flex gap-2 items-end">
              <input type="number" step="any" placeholder="Latitude" value={manualLat} onChange={(e) => setManualLat(e.target.value)} className="input-field text-sm flex-1" />
              <input type="number" step="any" placeholder="Longitude" value={manualLng} onChange={(e) => setManualLng(e.target.value)} className="input-field text-sm flex-1" />
              <button onClick={() => { if (manualLat && manualLng) setManualLocation(parseFloat(manualLat), parseFloat(manualLng)) }}
                className="btn-primary text-sm py-2.5"><Navigation className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="Search by name or city..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-11" />
          </div>
          <select value={maxDistance} onChange={(e) => setMaxDistance(Number(e.target.value))} className="input-field w-auto">
            <option value={5}>Within 5 km</option>
            <option value={10}>Within 10 km</option>
            <option value={25}>Within 25 km</option>
            <option value={50}>Within 50 km</option>
            <option value={100}>Within 100 km</option>
            <option value={99999}>Any distance</option>
          </select>
        </div>

        {locLoading || loading ? <LoadingSpinner text="Finding nearby activities..." /> : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Nearby Events */}
            <div>
              <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2"><CalendarCheck className="h-5 w-5" /> Nearby Events</h3>
              {nearbyEvents.length === 0 ? (
                <EmptyState icon={<CalendarCheck className="h-10 w-10" />} title="No nearby events" />
              ) : (
                <div className="space-y-3">
                  {nearbyEvents.map((event) => (
                    <Link key={event.id} href={`/dashboard/drives/${event.id}`}
                      className="card hover:shadow-md transition-shadow block">
                      <h4 className="font-semibold text-green-800">{event.title}</h4>
                      <div className="text-sm text-gray-500 space-y-1 mt-2">
                        <p className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location_name}
                          {event.distance !== undefined && <span className="text-green-600 font-medium ml-1">({event.distance.toFixed(1)} km)</span>}</p>
                        <p>{formatDateTime(event.event_date)}</p>
                      </div>
                      <Badge variant="info" className="mt-2">{event.participant_count} participants</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Nearby Groups */}
            <div>
              <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2"><Users className="h-5 w-5" /> Nearby Groups</h3>
              {nearbyGroups.length === 0 ? (
                <EmptyState icon={<Users className="h-10 w-10" />} title="No nearby groups" />
              ) : (
                <div className="space-y-3">
                  {nearbyGroups.map((group) => (
                    <Link key={group.id} href={`/dashboard/community/${group.id}`}
                      className="card hover:shadow-md transition-shadow block">
                      <h4 className="font-semibold text-green-800">{group.name}</h4>
                      <p className="text-sm text-gray-600 line-clamp-1 mt-1">{group.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{group.location_name || 'No location'}
                          {group.distance !== undefined && <span className="text-green-600 font-medium ml-1">({group.distance.toFixed(1)} km)</span>}
                        </span>
                        <Badge variant="success">{group.member_count} members</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
