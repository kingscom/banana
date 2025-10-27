import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Anon key로 Supabase 클라이언트 생성 (RLS 비활성화됨)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    const id = searchParams.get('id')

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('문서 조회:', { user_id, id })

    let data, error

    // 특정 문서 ID가 제공된 경우 해당 문서만 조회
    if (id) {
      const result = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user_id)
        .eq('id', id)
        .single()
      data = result.data
      error = result.error
    } else {
      const result = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
      data = result.data
      error = result.error
    }

    if (error) {
      console.error('문서 조회 오류:', error)
      return NextResponse.json(
        { error: '문서 조회에 실패했습니다: ' + error.message },
        { status: 500 }
      )
    }

    console.log('문서 조회 성공:', data?.length, '개')
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('문서 조회 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Anon key로 Supabase 클라이언트 생성 (RLS 비활성화됨)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const body = await request.json()
    const { id, userId, summary } = body

    if (!id || !userId || !summary) {
      return NextResponse.json(
        { error: 'id, userId, summary가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('문서 요약 업데이트:', { 
      id, 
      userId: userId.substring(0, 8) + '...',
      summaryLength: summary.length 
    })

    const { data, error } = await supabase
      .from('documents')
      .update({ summary })
      .eq('id', id)
      .eq('user_id', userId)
      .select()

    if (error) {
      console.error('문서 요약 업데이트 오류:', error)
      return NextResponse.json(
        { error: '문서 요약 업데이트에 실패했습니다: ' + error.message },
        { status: 500 }
      )
    }

    console.log('문서 요약 업데이트 성공')
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('문서 요약 업데이트 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Anon key로 Supabase 클라이언트 생성 (RLS 비활성화됨)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { searchParams } = new URL(request.url)
    const document_id = searchParams.get('id')
    const user_id = searchParams.get('user_id')

    if (!document_id || !user_id) {
      return NextResponse.json(
        { error: 'document_id와 user_id가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('문서 삭제 시작:', { document_id, user_id })

    // 먼저 관련 하이라이트들 삭제
    const { error: highlightsError } = await supabase
      .from('highlights')
      .delete()
      .eq('document_id', document_id)
      .eq('user_id', user_id)

    if (highlightsError) {
      console.error('하이라이트 삭제 오류:', highlightsError)
      // 하이라이트 삭제 실패해도 문서 삭제는 계속 진행
    } else {
      console.log('관련 하이라이트 삭제 완료')
    }

    // 문서 삭제
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', document_id)
      .eq('user_id', user_id)

    if (error) {
      console.error('문서 삭제 오류:', error)
      return NextResponse.json(
        { error: '문서 삭제에 실패했습니다: ' + error.message },
        { status: 500 }
      )
    }

    console.log('문서 삭제 성공')

    // 서버에 저장된 파일도 삭제 시도 (실패해도 무시)
    try {
      const fs = require('fs').promises
      const path = require('path')
      
      const uploadsDir = path.join(process.cwd(), 'uploads', user_id)
      const files = await fs.readdir(uploadsDir).catch(() => [])
      
      for (const file of files) {
        if (file.includes(document_id)) {
          await fs.unlink(path.join(uploadsDir, file)).catch(() => {})
          console.log('서버 파일 삭제됨:', file)
        }
      }
    } catch (fileError) {
      console.log('서버 파일 삭제 시도 실패 (무시):', fileError)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('문서 삭제 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}