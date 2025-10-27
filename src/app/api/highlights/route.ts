import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Anon key로 Supabase 클라이언트 생성 (RLS 비활성화됨)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    console.log('API 라우트: 하이라이트 저장 시작')

    // 클라이언트에서 보낸 사용자 정보 확인 (Authorization 헤더에서)
    const authHeader = request.headers.get('authorization')
    console.log('Authorization 헤더:', authHeader ? '있음' : '없음')
    
    // 현재는 RLS가 비활성화되어 있으므로 인증 체크를 단순화
    // 실제 사용자 ID는 클라이언트에서 전송된 데이터에서 가져옴

    const body = await request.json()
    console.log('하이라이트 저장 요청:', body)

    const {
      document_id,
      page_number,
      selected_text,
      note,
      position_x,
      position_y,
      position_width,
      position_height,
      rectangles,
      user_id
    } = body

    // 필수 필드 검증
    if (!document_id || !selected_text || page_number === undefined || !user_id) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 문서 소유자 확인
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('user_id')
      .eq('id', document_id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (document.user_id !== user_id) {
      return NextResponse.json(
        { error: '해당 문서에 하이라이트를 추가할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 하이라이트 저장 (user_id 제거)
    const insertData = {
      document_id,
      page_number,
      selected_text,
      note: note || '',
      position_x,
      position_y,
      position_width,
      position_height,
      rectangles: rectangles || null
    }

    console.log('저장할 하이라이트 데이터:', insertData)

    const { data, error } = await supabase
      .from('highlights')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('하이라이트 저장 오류:', error)
      return NextResponse.json(
        { error: '하이라이트 저장에 실패했습니다: ' + error.message },
        { status: 500 }
      )
    }

    console.log('하이라이트 저장 성공:', data)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('하이라이트 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Anon key로 Supabase 클라이언트 생성 (RLS 비활성화됨)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { searchParams } = new URL(request.url)
    const document_id = searchParams.get('document_id')
    const user_id = searchParams.get('user_id')

    if (!document_id || !user_id) {
      return NextResponse.json(
        { error: 'document_id와 user_id가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('하이라이트 조회:', { document_id, user_id })

    // 문서 소유자 확인
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('user_id')
      .eq('id', document_id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (document.user_id !== user_id) {
      return NextResponse.json(
        { error: '해당 문서의 하이라이트를 조회할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('highlights')
      .select('*')
      .eq('document_id', document_id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('하이라이트 조회 오류:', error)
      return NextResponse.json(
        { error: '하이라이트 조회에 실패했습니다: ' + error.message },
        { status: 500 }
      )
    }

    console.log('하이라이트 조회 성공:', data?.length, '개')
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('하이라이트 조회 API 오류:', error)
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
    const highlight_id = searchParams.get('id')
    const user_id = searchParams.get('user_id')

    if (!highlight_id || !user_id) {
      return NextResponse.json(
        { error: 'highlight_id와 user_id가 필요합니다.' },
        { status: 400 }
      )
    }

    // 하이라이트와 연결된 문서의 소유자 확인
    const { data: highlight, error: hlError } = await supabase
      .from('highlights')
      .select('document_id')
      .eq('id', highlight_id)
      .single()

    if (hlError || !highlight) {
      return NextResponse.json(
        { error: '하이라이트를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('user_id')
      .eq('id', highlight.document_id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (document.user_id !== user_id) {
      return NextResponse.json(
        { error: '해당 하이라이트를 삭제할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('highlights')
      .delete()
      .eq('id', highlight_id)

    if (error) {
      console.error('하이라이트 삭제 오류:', error)
      return NextResponse.json(
        { error: '하이라이트 삭제에 실패했습니다: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('하이라이트 삭제 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}