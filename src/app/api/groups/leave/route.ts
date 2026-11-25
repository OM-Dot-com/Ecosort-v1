import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { group_id } = await request.json()
    const serviceClient = createServiceRoleClient()

    const { data: group } = await serviceClient.from('groups').select('organizer_id, member_count').eq('id', group_id).single()
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    if (group.organizer_id === user.id) return NextResponse.json({ error: 'Organizers cannot leave their own group' }, { status: 400 })

    await serviceClient.from('group_members').delete().eq('group_id', group_id).eq('user_id', user.id)
    await serviceClient.from('groups').update({ member_count: Math.max(0, group.member_count - 1) }).eq('id', group_id)
    const { data: profile } = await serviceClient.from('profiles').select('groups_joined').eq('id', user.id).single()
    await serviceClient.from('profiles').update({ groups_joined: Math.max(0, (profile?.groups_joined || 1) - 1) }).eq('id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Leave error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
