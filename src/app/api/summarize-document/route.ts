import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('📄 전체 문서 요약 API 호출됨')
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentId = formData.get('documentId') as string
    const userId = formData.get('userId') as string

    if (!file || !documentId || !userId) {
      return NextResponse.json(
        { error: 'PDF 파일, 문서 ID, 사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('📋 전체 문서 요약 요청 정보:', {
      fileName: file.name,
      fileSize: file.size,
      documentId,
      userId: userId.substring(0, 8) + '...'
    })

    // 외부 FastAPI 서버로 전체 문서 요약 요청
    const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000'
    
    const fastApiFormData = new FormData()
    fastApiFormData.append('file', file)
    fastApiFormData.append('user_id', userId)
    fastApiFormData.append('document_id', documentId)

    console.log('📡 FastAPI로 전체 문서 요약 요청 전송 중...', FASTAPI_BASE_URL)

    const fastApiResponse = await fetch(`${FASTAPI_BASE_URL}/summarize-full-document`, {
      method: 'POST',
      body: fastApiFormData
    })

    if (!fastApiResponse.ok) {
      let errorMessage = 'Unknown error'
      try {
        const error = await fastApiResponse.json()
        errorMessage = error.detail || error.message || error.error || `HTTP ${fastApiResponse.status}`
      } catch {
        errorMessage = `HTTP ${fastApiResponse.status} - ${fastApiResponse.statusText}`
      }
      throw new Error(`FastAPI 요약 요청 실패: ${errorMessage}`)
    }

    const summaryResult = await fastApiResponse.json()
    console.log('✅ FastAPI에서 전체 문서 요약 완료:', {
      summaryLength: summaryResult.summary?.length || 0,
      success: !!summaryResult.success
    })

    // 요약 결과를 documents 테이블에 업데이트
    const summary = summaryResult.summary || summaryResult.text || summaryResult.result || null

    if (summary) {
      console.log('💾 데이터베이스에 요약 저장 중...')
      
      const updateResponse = await fetch('/api/documents', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: documentId,
          userId: userId,
          summary: summary
        })
      })

      if (!updateResponse.ok) {
        const updateError = await updateResponse.json()
        console.error('❌ 요약 저장 실패:', updateError.error)
        throw new Error(`요약 저장 실패: ${updateError.error}`)
      }

      console.log('✅ 요약이 성공적으로 저장되었습니다')
    }

    return NextResponse.json({
      success: true,
      message: '전체 문서 요약 완료',
      summary: summary,
      documentId,
      metadata: {
        processingTime: summaryResult.processing_time,
        model: summaryResult.model_used,
        confidence: summaryResult.confidence
      }
    })

  } catch (error) {
    console.error('❌ 전체 문서 요약 처리 중 오류:', error)
    
    let errorMessage = '알 수 없는 오류'
    if (error instanceof Error) {
      if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
        errorMessage = `FastAPI 서버에 연결할 수 없습니다: ${process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000'}`
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      { 
        error: '전체 문서 요약 처리 중 오류가 발생했습니다.',
        details: errorMessage,
        success: false
      },
      { status: 500 }
    )
  }
}