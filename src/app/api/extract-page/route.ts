import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'

export async function POST(request: NextRequest) {
  try {
    console.log('📄 PDF 페이지 추출 API 호출됨')
    
    const formData = await request.formData()
    const pdfFile = formData.get('pdf') as File
    const pageNumber = parseInt(formData.get('pageNumber') as string)
    const userId = formData.get('userId') as string
    const documentId = formData.get('documentId') as string

    if (!pdfFile || !pageNumber || !userId) {
      return NextResponse.json(
        { error: 'PDF 파일, 페이지 번호, 사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('📋 추출 요청 정보:', {
      fileName: pdfFile.name,
      pageNumber,
      userId: userId.substring(0, 8) + '...',
      fileSize: pdfFile.size
    })

    // PDF 파일을 ArrayBuffer로 변환
    const pdfArrayBuffer = await pdfFile.arrayBuffer()
    
    // PDF-lib으로 PDF 문서 로드
    const pdfDoc = await PDFDocument.load(pdfArrayBuffer)
    const totalPages = pdfDoc.getPageCount()

    console.log(`📖 PDF 총 페이지 수: ${totalPages}, 추출할 페이지: ${pageNumber}`)

    // 페이지 번호 유효성 검사
    if (pageNumber < 1 || pageNumber > totalPages) {
      return NextResponse.json(
        { error: `유효하지 않은 페이지 번호입니다. (1-${totalPages})` },
        { status: 400 }
      )
    }

    // 새 PDF 문서 생성
    const newPdfDoc = await PDFDocument.create()
    
    // 특정 페이지 복사 (인덱스는 0부터 시작하므로 -1)
    const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNumber - 1])
    newPdfDoc.addPage(copiedPage)

    // PDF를 바이트 배열로 변환
    const pdfBytes = await newPdfDoc.save()

    console.log('✅ PDF 페이지 추출 완료:', {
      pageNumber,
      fileSize: pdfBytes.length
    })

    // 파일을 직접 응답으로 반환 (Base64 인코딩)
    const base64Pdf = Buffer.from(pdfBytes).toString('base64')

    console.log('✅ PDF 페이지 추출 완료:', {
      pageNumber,
      fileSize: pdfBytes.length,
      base64Length: base64Pdf.length
    })

    return NextResponse.json({
      success: true,
      message: `페이지 ${pageNumber} 추출 완료`,
      pageNumber,
      totalPages,
      fileSize: pdfBytes.length,
      pdfData: base64Pdf // Base64로 인코딩된 PDF 데이터
    })

  } catch (error) {
    console.error('❌ PDF 페이지 추출 중 오류:', error)
    return NextResponse.json(
      { 
        error: 'PDF 페이지 추출 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}