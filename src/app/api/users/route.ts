import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const currentUserId = searchParams.get('currentUserId')

    if (!currentUserId) {
      return NextResponse.json({ error: 'Current user ID is required' }, { status: 400 })
    }

    // 현재 사용자를 제외한 모든 사용자 조회
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, display_name, department, email')
      .neq('id', currentUserId)
      .eq('is_profile_completed', true)
      .order('display_name', { ascending: true })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // 사용자 목록을 "이름(부서명)" 형태로 포맷
    const formattedUsers = users?.map(user => ({
      id: user.id,
      email: user.email,
      label: user.department 
        ? `${user.display_name} (${user.department})`
        : user.display_name || user.email
    })) || []

    return NextResponse.json({ users: formattedUsers })

  } catch (error) {
    console.error('Error in users API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}