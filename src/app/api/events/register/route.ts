import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { event_id } = await request.json()
    const serviceClient = createServiceRoleClient()
    const { data: event } = await serviceClient.from('cleaning_events').select('*').eq('id', event_id).single()
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    if (event.participant_count >= event.max_participants) return NextResponse.json({ error: 'Event is full' }, { status: 400 })
    const { data: existing } = await serviceClient.from('event_registrations').select('id').eq('event_id', event_id).eq('user_id', user.id).single()
    if (existing) return NextResponse.json({ error: 'Already registered' }, { status: 400 })
    await serviceClient.from('event_registrations').insert({ event_id, user_id: user.id })
    await serviceClient.from('cleaning_events').update({ participant_count: event.participant_count + 1 }).eq('id', event_id)
    await serviceClient.from('notifications').insert({ user_id: event.organizer_id, title: 'New Registration', message: `Someone registered for "${event.title}"`, type: 'event', reference_id: event_id, reference_type: 'event' })
    return NextResponse.json({ success: true })
  } catch (error) { console.error(error); return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { event_id } = await request.json()
    const serviceClient = createServiceRoleClient()
    await serviceClient.from('event_registrations').update({ status: 'cancelled' }).eq('event_id', event_id).eq('user_id', user.id)
    const { data: event } = await serviceClient.from('cleaning_events').select('participant_count').eq('id', event_id).single()
    if (event) await serviceClient.from('cleaning_events').update({ participant_count: Math.max(0, event.participant_count - 1) }).eq('id', event_id)
    return NextResponse.json({ success: true })
  } catch (error) { console.error(error); return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
}
