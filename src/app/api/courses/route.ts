import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET - 강의 목록 조회 및 검색
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const difficulty = searchParams.get('difficulty') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sort_by') || 'created_at' // title, category, created_at

    console.log('강의 검색:', { search, category, difficulty, limit, offset, sortBy })

    let query = supabase
      .from('courses')
      .select('*')

    // 검색 조건 적용
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,instructor_name.ilike.%${search}%,tags.cs.{${search}}`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (difficulty) {
      query = query.eq('difficulty_level', difficulty)
    }



    // 정렬 적용
    switch (sortBy) {
      case 'title':
        query = query.order('title', { ascending: true })
        break
      case 'category':
        query = query.order('category', { ascending: true })
        break
      case 'created_at':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    // 페이지네이션
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('강의 조회 오류:', error)
      return NextResponse.json(
        { error: '강의 조회에 실패했습니다: ' + error.message },
        { status: 500 }
      )
    }

    console.log('강의 조회 성공:', data?.length || 0, '개')
    return NextResponse.json({ 
      success: true, 
      data: data || [],
      total: count || 0
    })

  } catch (error) {
    console.error('강의 조회 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST - 새 강의 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const body = await request.json()
    console.log('강의 추가 요청:', body)

    const {
      title,
      category,
      description,
      image_url,
      course_url,
      tags,
      instructor_name,
      duration,
      difficulty_level,
      platform,
      language,
      created_by
    } = body

    // 필수 필드 검증
    if (!title || !category || !course_url) {
      return NextResponse.json(
        { error: '강의명, 카테고리, 강의 URL은 필수입니다.' },
        { status: 400 }
      )
    }

    // URL 유효성 검증
    try {
      new URL(course_url)
    } catch {
      return NextResponse.json(
        { error: '올바른 강의 URL을 입력해주세요.' },
        { status: 400 }
      )
    }

    const insertData = {
      title,
      category,
      description: description || '',
      image_url: image_url || null,
      course_url,
      tags: tags || [],
      instructor_name: instructor_name || '',
      duration: duration || '',
      difficulty_level: difficulty_level || 'beginner',
      platform: platform || '',
      language: language || 'ko',
      created_by: created_by || null
    }

    const { data, error } = await supabase
      .from('courses')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('강의 추가 오류:', error)
      return NextResponse.json(
        { error: '강의 추가에 실패했습니다: ' + error.message },
        { status: 500 }
      )
    }

    console.log('강의 추가 성공:', data)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('강의 추가 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT - 강의 수정
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('id')

    if (!courseId) {
      return NextResponse.json(
        { error: '강의 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    console.log('강의 수정 요청:', { courseId, body })

    const {
      title,
      category,
      description,
      image_url,
      course_url,
      tags,
      instructor_name,
      duration,
      difficulty_level,
      platform,
      language
    } = body

    // 필수 필드 검증
    if (!title || !category || !course_url) {
      return NextResponse.json(
        { error: '강의명, 카테고리, 강의 URL은 필수입니다.' },
        { status: 400 }
      )
    }

    // URL 유효성 검증
    try {
      new URL(course_url)
    } catch {
      return NextResponse.json(
        { error: '올바른 강의 URL을 입력해주세요.' },
        { status: 400 }
      )
    }

    const updateData = {
      title,
      category,
      description: description || '',
      image_url: image_url || null,
      course_url,
      tags: tags || [],
      instructor_name: instructor_name || '',
      duration: duration || '',
      difficulty_level: difficulty_level || 'beginner',
      platform: platform || '',
      language: language || 'ko'
    }

    const { data, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', courseId)
      .select()
      .single()

    if (error) {
      console.error('강의 수정 오류:', error)
      return NextResponse.json(
        { error: '강의 수정에 실패했습니다: ' + error.message },
        { status: 500 }
      )
    }

    console.log('강의 수정 성공:', data)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('강의 수정 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE - 강의 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('id')

    if (!courseId) {
      return NextResponse.json(
        { error: '강의 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('강의 삭제 요청:', courseId)

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)

    if (error) {
      console.error('강의 삭제 오류:', error)
      return NextResponse.json(
        { error: '강의 삭제에 실패했습니다: ' + error.message },
        { status: 500 }
      )
    }

    console.log('강의 삭제 성공')
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('강의 삭제 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}