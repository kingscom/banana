import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import FormData from 'form-data'
import fetch from 'node-fetch'

// FastAPI 서버 설정 (환경변수에서 로드)
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL

// FastAPI 서버 설정 확인
if (!FASTAPI_BASE_URL) {
  console.error('❌ NEXT_PUBLIC_FASTAPI_BASE_URL 환경변수가 설정되지 않았습니다.')
}

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 AI 요약 API 호출됨')
    
    // FastAPI 서버 설정 확인
    if (!FASTAPI_BASE_URL) {
      return NextResponse.json(
        { 
          error: 'FastAPI 서버가 설정되지 않았습니다.',
          details: 'NEXT_PUBLIC_FASTAPI_BASE_URL 환경변수를 설정해주세요.'
        },
        { status: 500 }
      )
    }
    
    // FormData에서 파일과 메타데이터 추출
    const formData = await request.formData()
    const file = formData.get('file') as File
    const pageNumber = formData.get('pageNumber') as string
    const documentId = formData.get('documentId') as string
    const userId = formData.get('userId') as string

    if (!file || !pageNumber || !userId) {
      return NextResponse.json(
        { error: 'PDF 파일, 페이지 번호, 사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('📋 AI 요약 요청 정보:', {
      fileName: file.name,
      fileSize: file.size,
      pageNumber,
      documentId,
      userId: userId.substring(0, 8) + '...'
    })

    // 파일을 Buffer로 변환
    const pdfBuffer = Buffer.from(await file.arrayBuffer())
    
    // FastAPI로 전송할 FormData 준비
    const fastApiFormData = new FormData()
    fastApiFormData.append('file', pdfBuffer, {
      filename: `page_${pageNumber}.pdf`,
      contentType: 'application/pdf'
    })
    fastApiFormData.append('page_number', pageNumber)
    fastApiFormData.append('user_id', userId)
    fastApiFormData.append('document_id', documentId || '')

    console.log('📡 FastAPI로 요약 요청 전송 중...', FASTAPI_BASE_URL)

    // FastAPI로 비동기 요청
    const fastApiResponse = await fetch(`${FASTAPI_BASE_URL}/summarize-pdf`, {
      method: 'POST',
      body: fastApiFormData,
      headers: fastApiFormData.getHeaders()
    })

    if (!fastApiResponse.ok) {
      const errorText = await fastApiResponse.text()
      console.error('❌ FastAPI 오류 응답:', {
        status: fastApiResponse.status,
        statusText: fastApiResponse.statusText,
        error: errorText
      })
      
      return NextResponse.json(
        { 
          error: 'AI 요약 서비스에서 오류가 발생했습니다.',
          details: errorText,
          status: fastApiResponse.status
        },
        { status: 502 }
      )
    }

    const summaryResult = await fastApiResponse.json() as any
    console.log('✅ FastAPI 요약 결과 수신:', {
      summaryLength: summaryResult?.summary?.length || 0,
      success: !!summaryResult?.success
    })

    // 파일이 메모리에서 처리되므로 별도의 임시 파일 정리 불필요
    console.log('📁 파일 처리 완료 (메모리에서 처리됨)')

    return NextResponse.json({
      success: true,
      summary: summaryResult?.summary || '요약을 생성할 수 없습니다.',
      pageNumber,
      documentId,
      metadata: {
        processingTime: summaryResult?.processing_time,
        model: summaryResult?.model_used,
        confidence: summaryResult?.confidence
      }
    })

  } catch (error) {
    console.error('❌ AI 요약 처리 중 오류:', error)
    
    // 네트워크 오류 처리
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { 
          error: 'AI 요약 서비스에 연결할 수 없습니다. FastAPI 서버가 실행 중인지 확인하세요.',
          details: 'Connection refused to FastAPI server'
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { 
        error: 'AI 요약 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}