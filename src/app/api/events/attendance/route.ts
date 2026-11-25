import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { event_id, user_ids } = await request.json()
    const serviceClient = createServiceRoleClient()
    // Verify organizer
    const { data: event } = await serviceClient.from('cleaning_events').select('organizer_id').eq('id', event_id).single()
    if (!event || event.organizer_id !== user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    for (const uid of user_ids) {
      await serviceClient.from('event_attendance').upsert({ event_id, user_id: uid, marked_by: user.id }, { onConflict: 'event_id,user_id' })
      await serviceClient.from('event_registrations').update({ status: 'attended' }).eq('event_id', event_id).eq('user_id', uid)
      // Award points
      const { data: existing } = await serviceClient.from('point_transactions').select('id').eq('reference_id', event_id).eq('user_id', uid).eq('transaction_type', 'drive_participate').single()
      if (!existing) {
        await serviceClient.from('point_transactions').insert({ user_id: uid, points: 50, transaction_type: 'drive_participate', description: 'Participated in cleanup drive', reference_id: event_id, reference_type: 'event' })
        const { data: profile } = await serviceClient.from('profiles').select('total_points, completed_drives').eq('id', uid).single()
        if (profile) {
          await serviceClient.from('profiles').update({ total_points: (profile.total_points || 0) + 50, completed_drives: (profile.completed_drives || 0) + 1 }).eq('id', uid)
        }
        await serviceClient.from('notifications').insert({ user_id: uid, title: 'Points Earned!', message: 'You earned 50 points for attending a cleanup drive!', type: 'points', reference_id: event_id, reference_type: 'event' })
      }
    }
    return NextResponse.json({ success: true })
  } catch (error) { console.error(error); return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
}
