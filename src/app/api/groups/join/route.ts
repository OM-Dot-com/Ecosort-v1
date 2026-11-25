import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { group_id } = await request.json()
    if (!group_id) return NextResponse.json({ error: 'Group ID required' }, { status: 400 })

    const serviceClient = createServiceRoleClient()

    // Check if already a member
    const { data: existing } = await serviceClient.from('group_members').select('id').eq('group_id', group_id).eq('user_id', user.id).single()
    if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 400 })

    // Get group info
    const { data: group } = await serviceClient.from('groups').select('*').eq('id', group_id).single()
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

    if (group.member_count >= group.max_members) return NextResponse.json({ error: 'Group is full' }, { status: 400 })

    if (group.is_public) {
      // Direct join
      await serviceClient.from('group_members').insert({ group_id, user_id: user.id, role: 'member' })
      await serviceClient.from('groups').update({ member_count: group.member_count + 1 }).eq('id', group_id)
      // Update user profile
      const { data: profile } = await serviceClient.from('profiles').select('groups_joined').eq('id', user.id).single()
      await serviceClient.from('profiles').update({ groups_joined: (profile?.groups_joined || 0) + 1 }).eq('id', user.id)
      // Notify organizer
      await serviceClient.from('notifications').insert({
        user_id: group.organizer_id, title: 'New Member', message: `A new member joined ${group.name}`,
        type: 'group', reference_id: group_id, reference_type: 'group',
      })
      return NextResponse.json({ success: true, type: 'joined' })
    } else {
      // Check existing request
      const { data: existingReq } = await serviceClient.from('group_join_requests').select('id').eq('group_id', group_id).eq('user_id', user.id).eq('status', 'pending').single()
      if (existingReq) return NextResponse.json({ error: 'Request already pending' }, { status: 400 })

      await serviceClient.from('group_join_requests').insert({ group_id, user_id: user.id })
      await serviceClient.from('notifications').insert({
        user_id: group.organizer_id, title: 'Join Request', message: `New join request for ${group.name}`,
        type: 'group', reference_id: group_id, reference_type: 'group',
      })
      return NextResponse.json({ success: true, type: 'requested' })
    }
  } catch (error) {
    console.error('Join error:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}
