import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { event_id, before_image_url, after_image_url, description } = await request.json()
    const serviceClient = createServiceRoleClient()
    const { error } = await serviceClient.from('cleanup_evidence').insert({ event_id, user_id: user.id, before_image_url, after_image_url, description })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) { console.error(error); return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { evidence_id, status } = await request.json()
    const serviceClient = createServiceRoleClient()
    // Verify admin/organizer
    const { data: profile } = await serviceClient.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || !['admin', 'organizer'].includes(profile.role)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    
    await serviceClient.from('cleanup_evidence').update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', evidence_id)
    
    if (status === 'approved') {
      const { data: evidence } = await serviceClient.from('cleanup_evidence').select('user_id, event_id').eq('id', evidence_id).single()
      if (evidence) {
        const { data: existing } = await serviceClient.from('point_transactions').select('id').eq('reference_id', evidence_id).eq('transaction_type', 'evidence_upload').single()
        if (!existing) {
          await serviceClient.from('point_transactions').insert({ user_id: evidence.user_id, points: 30, transaction_type: 'evidence_upload', description: 'Approved cleanup evidence', reference_id: evidence_id, reference_type: 'evidence' })
          const { data: p } = await serviceClient.from('profiles').select('total_points').eq('id', evidence.user_id).single()
          if (p) await serviceClient.from('profiles').update({ total_points: (p.total_points || 0) + 30 }).eq('id', evidence.user_id)
        }
      }
    }
    return NextResponse.json({ success: true })
  } catch (error) { console.error(error); return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
}
