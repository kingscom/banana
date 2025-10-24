import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string; fileName: string } }
) {
  try {
    const { userId, fileName } = params
    
    if (!userId || !fileName) {
      return NextResponse.json(
        { error: 'userId and fileName are required' },
        { status: 400 }
      )
    }

    // 먼저 요청된 사용자 폴더에서 파일 찾기
    let filePath = path.join(process.cwd(), 'uploads', userId, fileName)
    
    // 파일이 없으면 데이터베이스에서 실제 파일 경로 찾기
    try {
      await readFile(filePath)
    } catch (initialError) {
      console.log(`File not found in user folder, checking database for shared document...`)
      
      // Supabase에서 해당 사용자의 문서 중 이 파일명을 가진 것 찾기
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: document, error } = await supabase
        .from('documents')
        .select('file_path, is_shared, original_document_id')
        .eq('user_id', userId)
        .eq('file_name', fileName)
        .single()
      
      if (document && document.file_path) {
        // 데이터베이스에 저장된 실제 파일 경로 사용
        filePath = path.join(process.cwd(), document.file_path)
        console.log(`Using database file path: ${filePath}`)
      } else {
        throw initialError // 원래 오류 다시 던지기
      }
    }
    
    try {
      const fileBuffer = await readFile(filePath)
      
      // MIME 타입 결정
      const ext = path.extname(fileName).toLowerCase()
      let contentType = 'application/octet-stream'
      
      if (ext === '.pdf') {
        contentType = 'application/pdf'
      } else if (ext === '.txt') {
        contentType = 'text/plain'
      } else if (ext === '.json') {
        contentType = 'application/json'
      }

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${fileName}"`,
        },
      })
    } catch (fileError) {
      console.error('File read error:', fileError)
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

  } catch (error) {
    console.error('File serve error:', error)
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
}