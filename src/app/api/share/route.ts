import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export async function POST(request: NextRequest) {
  try {
    const { documentId, targetUserEmail, userId } = await request.json()

    if (!documentId || !targetUserEmail || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 원본 문서 조회
    const { data: sourceDocument, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (docError || !sourceDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // 대상 사용자 조회
    const { data: targetUser, error: userError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', targetUserEmail)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

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

    // 문서 복사 (공유자 정보 포함)
    const { data: sharedDocument, error: shareError } = await supabase
      .from('documents')
      .insert({
        id: newDocumentId,
        user_id: targetUser.id,
        title: sourceDocument.title,
        file_name: sourceDocument.file_name,
        file_path: sourceDocument.file_path,
        file_type: sourceDocument.file_type,
        file_size: sourceDocument.file_size,
        original_document_id: documentId,
        shared_by_user_id: userId,
        is_shared: true
      })
      .select()
      .single()

    if (shareError) {
      console.error('Error sharing document:', shareError)
      return NextResponse.json({ error: 'Failed to share document' }, { status: 500 })
    }

    // 하이라이트도 복사
    const { data: highlights, error: highlightError } = await supabase
      .from('highlights')
      .select('*')
      .eq('document_id', documentId)

    if (highlights && highlights.length > 0) {
      const sharedHighlights = highlights.map(highlight => ({
        document_id: sharedDocument.id,
        page_number: highlight.page_number,
        selected_text: highlight.selected_text,
        note: highlight.note,
        position_x: highlight.position_x,
        position_y: highlight.position_y,
        position_width: highlight.position_width,
        position_height: highlight.position_height
      }))

      const { error: highlightInsertError } = await supabase
        .from('highlights')
        .insert(sharedHighlights)

      if (highlightInsertError) {
        console.error('Error copying highlights:', highlightInsertError)
        // 하이라이트 복사 실패해도 문서 공유는 성공으로 처리
      }
    }

    return NextResponse.json({ 
      success: true, 
      sharedDocument,
      message: `Document shared successfully with ${targetUserEmail}` 
    })

  } catch (error) {
    console.error('Error in share API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}