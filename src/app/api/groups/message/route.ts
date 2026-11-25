import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { group_id, content } = await request.json()
    if (!group_id || !content?.trim()) return NextResponse.json({ error: 'Group ID and content required' }, { status: 400 })

    const serviceClient = createServiceRoleClient()

    // Verify membership
    const { data: member } = await serviceClient.from('group_members').select('id').eq('group_id', group_id).eq('user_id', user.id).single()
    if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

    const { data: message, error } = await serviceClient.from('group_messages').insert({
      group_id, user_id: user.id, content: content.trim(),
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('Message error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
