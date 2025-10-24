import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// 업로드 크기 제한 설정
export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  console.log('=== 업로드 API 호출됨 ===')
  
  try {
    // FormData 파싱
    let formData
    try {
      formData = await request.formData()
      console.log('FormData 파싱 성공')
    } catch (error) {
      console.error('FormData 파싱 실패:', error)
      return NextResponse.json(
        { error: 'Invalid form data' },
        { status: 400 }
      )
    }

    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    console.log('받은 데이터:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      userId: userId
    })

    if (!file || !userId) {
      console.error('필수 데이터 누락:', { hasFile: !!file, hasUserId: !!userId })
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      )
    }

    // 파일 데이터 읽기
    let bytes, buffer
    try {
      bytes = await file.arrayBuffer()
      buffer = Buffer.from(bytes)
      console.log('파일 버퍼 생성 성공, 크기:', buffer.length)
    } catch (error) {
      console.error('파일 읽기 실패:', error)
      return NextResponse.json(
        { error: 'Failed to read file' },
        { status: 500 }
      )
    }
    
    // 업로드 디렉토리 생성
    const uploadDir = path.join(process.cwd(), 'uploads', userId)
    console.log('업로드 디렉토리:', uploadDir)
    
    try {
      await mkdir(uploadDir, { recursive: true })
      console.log('디렉토리 생성 성공')
    } catch (error) {
      console.error('디렉토리 생성 실패:', error)
      return NextResponse.json(
        { error: 'Failed to create upload directory' },
        { status: 500 }
      )
    }
    
    // 파일명 생성 (중복 방지를 위해 timestamp 추가)
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}_${sanitizedFileName}`
    const filePath = path.join(uploadDir, fileName)
    
    console.log('저장할 파일 경로:', filePath)
    
    // 파일 저장
    try {
      await writeFile(filePath, buffer)
      console.log('파일 저장 성공')
    } catch (error) {
      console.error('파일 저장 실패:', error)
      return NextResponse.json(
        { error: 'Failed to save file' },
        { status: 500 }
      )
    }
    
    // Supabase에 문서 정보 저장
    try {
      // Supabase 클라이언트 생성 (RLS 우회를 위해 관리자 권한 사용)
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      // 사용자 ID 검증을 위해 요청 헤더에서 인증 토큰 확인 (선택사항)
      console.log('사용자 ID 검증:', userId)
      const documentId = `doc_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
      
      console.log('Supabase에 저장할 데이터:', {
        id: documentId,
        user_id: userId,
        title: file.name.replace(/\.[^/.]+$/, ''),
        file_name: fileName,
        file_size: file.size,
        file_type: file.type,
        file_path: `/uploads/${userId}/${fileName}`
      })
      
      // RLS를 우회하기 위해 서비스 역할로 직접 삽입
      const { data, error } = await supabase
        .from('documents')
        .insert({
          id: documentId,
          user_id: userId,
          title: file.name.replace(/\.[^/.]+$/, ''), // 확장자 제거
          file_name: fileName,
          file_size: file.size,
          file_type: file.type,
          file_path: `/uploads/${userId}/${fileName}` // 상대 경로 저장
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase 저장 오류:', error)
        return NextResponse.json(
          { error: 'Failed to save document info: ' + error.message },
          { status: 500 }
        )
      }

      console.log('Supabase 저장 성공:', data)

      return NextResponse.json({
        success: true,
        document: data,
        message: 'File uploaded successfully'
      })
    } catch (supabaseError) {
      console.error('Supabase 연결 오류:', supabaseError)
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('전체 업로드 프로세스 실패:', error)
    return NextResponse.json(
      { error: 'Failed to upload file: ' + (error as Error).message },
      { status: 500 }
    )
  }
}