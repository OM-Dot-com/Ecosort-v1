import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { request_id, action } = await request.json()
    const serviceClient = createServiceRoleClient()

    // Get request
    const { data: joinReq } = await serviceClient.from('group_join_requests').select('*, groups(*)').eq('id', request_id).single()
    if (!joinReq) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    // Verify organizer
    if (joinReq.groups.organizer_id !== user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    if (action === 'approve') {
      await serviceClient.from('group_members').insert({ group_id: joinReq.group_id, user_id: joinReq.user_id, role: 'member' })
      await serviceClient.from('groups').update({ member_count: joinReq.groups.member_count + 1 }).eq('id', joinReq.group_id)
      const { data: profile } = await serviceClient.from('profiles').select('groups_joined').eq('id', joinReq.user_id).single()
      await serviceClient.from('profiles').update({ groups_joined: (profile?.groups_joined || 0) + 1 }).eq('id', joinReq.user_id)
      await serviceClient.from('notifications').insert({
        user_id: joinReq.user_id, title: 'Request Approved', message: `You are now a member of ${joinReq.groups.name}`,
        type: 'group', reference_id: joinReq.group_id, reference_type: 'group',
      })
    } else {
      await serviceClient.from('notifications').insert({
        user_id: joinReq.user_id, title: 'Request Declined', message: `Your request to join ${joinReq.groups.name} was declined`,
        type: 'group', reference_id: joinReq.group_id, reference_type: 'group',
      })
    }

    await serviceClient.from('group_join_requests').update({ status: action === 'approve' ? 'approved' : 'rejected', reviewed_by: user.id }).eq('id', request_id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Request error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
