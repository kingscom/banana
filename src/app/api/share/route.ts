import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export async function POST(request: NextRequest) {
  try {
    console.log('📥 공유 API 호출 시작')
    
    const body = await request.json()
    console.log('📋 요청 데이터:', {
      hasDocumentId: !!body.documentId,
      hasTargetUserEmail: !!body.targetUserEmail,
      hasUserId: !!body.userId,
      highlightsCount: body.highlights?.length || 0
    })

    const { 
      documentId, 
      documentTitle, 
      documentSummary, 
      highlights: highlightData, 
      targetUserEmail, 
      userId, 
      sharedAt 
    } = body

    if (!documentId || !targetUserEmail || !userId) {
      console.error('❌ 필수 필드 누락:', { documentId: !!documentId, targetUserEmail: !!targetUserEmail, userId: !!userId })
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: {
          documentId: !documentId ? 'required' : 'ok',
          targetUserEmail: !targetUserEmail ? 'required' : 'ok',
          userId: !userId ? 'required' : 'ok'
        }
      }, { status: 400 })
    }

    console.log('📤 공유 요청 처리:', {
      documentId,
      documentTitle,
      summaryLength: documentSummary?.length || 0,
      highlightsCount: highlightData?.length || 0,
      targetUserEmail
    })

    // 원본 문서 조회
    console.log('📖 원본 문서 조회 시작:', { documentId, userId })
    const { data: sourceDocument, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (docError) {
      console.error('❌ 문서 조회 오류:', docError)
      return NextResponse.json({ 
        error: 'Document query failed', 
        details: docError.message 
      }, { status: 500 })
    }

    if (!sourceDocument) {
      console.error('❌ 문서를 찾을 수 없음:', { documentId, userId })
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    console.log('✅ 원본 문서 조회 성공:', sourceDocument.title)

    // 대상 사용자 조회
    console.log('👤 대상 사용자 조회 시작:', targetUserEmail)
    const { data: targetUser, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('email', targetUserEmail)
      .single()

    if (userError) {
      console.error('❌ 사용자 조회 오류:', userError)
      return NextResponse.json({ 
        error: 'User query failed', 
        details: userError.message 
      }, { status: 500 })
    }

    if (!targetUser) {
      console.error('❌ 대상 사용자를 찾을 수 없음:', targetUserEmail)
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    console.log('✅ 대상 사용자 조회 성공:', targetUser.email)

    // 이미 공유되었는지 확인
    const { data: existingShare } = await supabase
      .from('documents')
      .select('id')
      .eq('original_document_id', documentId)
      .eq('user_id', targetUser.id)
      .single()

    if (existingShare) {
      return NextResponse.json({ error: 'Document already shared with this user' }, { status: 409 })
    }

    // 새 문서 ID 생성
    const newDocumentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    // 문서 복사 (공유자 정보 및 요약 포함)
    console.log('📄 문서 복사 시작:', newDocumentId)
    const documentData = {
      id: newDocumentId,
      user_id: targetUser.id,
      title: documentTitle || sourceDocument.title,
      file_name: sourceDocument.file_name,
      file_path: sourceDocument.file_path,
      file_type: sourceDocument.file_type,
      file_size: sourceDocument.file_size,
      summary: documentSummary || sourceDocument.summary, // 요약 정보 포함
      original_document_id: documentId,
      shared_by_user_id: userId,
      is_shared: true,
      shared_at: sharedAt || new Date().toISOString()
    }

    console.log('📋 복사할 문서 데이터:', {
      id: documentData.id,
      title: documentData.title,
      hasSummary: !!documentData.summary,
      targetUserId: documentData.user_id
    })

    const { data: sharedDocument, error: shareError } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single()

    if (shareError) {
      console.error('❌ 문서 공유 실패:', shareError)
      return NextResponse.json({ 
        error: 'Failed to share document', 
        details: shareError.message,
        code: shareError.code 
      }, { status: 500 })
    }

    console.log('✅ 문서 복사 성공:', sharedDocument.id)

    // 하이라이트 복사 (색상 정보 포함)
    if (highlightData && highlightData.length > 0) {
      console.log('🎨 하이라이트 색상 정보와 함께 복사 중...', highlightData.length, '개')
      
      const sharedHighlights = highlightData.map((highlight: any) => ({
        document_id: sharedDocument.id,
        page_number: highlight.pageNumber,
        selected_text: highlight.text,
        note: highlight.note || '',
        position_x: highlight.position_x || 0,
        position_y: highlight.position_y || 0,
        position_width: highlight.position_width || 0,
        position_height: highlight.position_height || 0,
        rectangles: highlight.rectangles || null, // rectangle 정보 포함
        color: highlight.color || '#fde047', // 색상 정보 포함
        // user_id 제거 (스키마에 해당 컬럼이 없음)
        created_at: highlight.created_at || new Date().toISOString()
      }))

      console.log('📋 복사할 하이라이트 데이터 샘플:', {
        ...sharedHighlights[0],
        위치정보: {
          position_x: sharedHighlights[0].position_x,
          position_y: sharedHighlights[0].position_y,
          position_width: sharedHighlights[0].position_width,
          position_height: sharedHighlights[0].position_height,
          hasRectangles: !!sharedHighlights[0].rectangles
        }
      })
      
      console.log('📊 전체 하이라이트 위치 정보 통계:', {
        총개수: sharedHighlights.length,
        위치있음: sharedHighlights.filter((h: any) => h.position_x > 0 || h.position_y > 0).length,
        rectangles있음: sharedHighlights.filter((h: any) => h.rectangles).length
      })

      const { data: insertedHighlights, error: highlightInsertError } = await supabase
        .from('highlights')
        .insert(sharedHighlights)
        .select()

      if (highlightInsertError) {
        console.error('❌ 하이라이트 복사 실패:', {
          error: highlightInsertError,
          sampleData: sharedHighlights[0]
        })
        // 하이라이트 복사 실패해도 문서 공유는 성공으로 처리
      } else {
        console.log('✅ 하이라이트 색상 정보 복사 완료:', insertedHighlights?.length || sharedHighlights.length, '개')
      }
    } else {
      console.log('📋 프론트엔드에서 하이라이트 데이터가 없어서 원본에서 직접 조회...')
      // 기존 하이라이트도 복사 (색상 정보 없는 경우 대비)
      const { data: originalHighlights } = await supabase
        .from('highlights')
        .select('*')
        .eq('document_id', documentId)

      console.log('📋 원본 하이라이트 조회 결과:', originalHighlights?.length || 0, '개')

      if (originalHighlights && originalHighlights.length > 0) {
        const sharedHighlights = originalHighlights.map(highlight => ({
          document_id: sharedDocument.id,
          page_number: highlight.page_number,
          selected_text: highlight.selected_text,
          note: highlight.note,
          position_x: highlight.position_x,
          position_y: highlight.position_y,
          position_width: highlight.position_width,
          position_height: highlight.position_height,
          rectangles: highlight.rectangles,
          color: highlight.color || '#fde047', // 기본 색상
          // user_id 제거 (스키마에 해당 컬럼이 없음)
          created_at: highlight.created_at || new Date().toISOString()
        }))

        const { data: insertedHighlights, error: highlightInsertError } = await supabase
          .from('highlights')
          .insert(sharedHighlights)
          .select()

        if (highlightInsertError) {
          console.error('❌ 원본 하이라이트 복사 실패:', highlightInsertError)
        } else {
          console.log('✅ 원본 하이라이트 복사 완료:', insertedHighlights?.length || sharedHighlights.length, '개')
        }
      } else {
        console.log('📋 복사할 하이라이트가 없습니다.')
      }
    }

    // 실제 복사된 하이라이트 개수 계산
    let actualHighlightsShared = 0
    if (highlightData && highlightData.length > 0) {
      actualHighlightsShared = highlightData.length
    } else {
      // 원본에서 복사한 경우, 다시 조회하여 개수 확인
      const { data: copiedHighlights } = await supabase
        .from('highlights')
        .select('id')
        .eq('document_id', sharedDocument.id)
      
      actualHighlightsShared = copiedHighlights?.length || 0
    }

    console.log('📊 공유 완료 결과:', {
      sharedDocumentId: sharedDocument.id,
      highlightsShared: actualHighlightsShared,
      summaryIncluded: !!documentSummary
    })

    return NextResponse.json({ 
      success: true, 
      sharedDocument,
      highlightsShared: actualHighlightsShared,
      summaryIncluded: !!documentSummary,
      message: `Document shared successfully with ${targetUserEmail} (${actualHighlightsShared} highlights with colors included)` 
    })

  } catch (error) {
    console.error('❌ 공유 API 전체 오류:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}