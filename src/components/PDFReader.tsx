'use client'

import { useState, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// PDF.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

interface PDFReaderProps {
  pdfs: Array<{id: string, name: string, file: File}>
}

interface Highlight {
  id: string
  pageNumber: number
  text: string
  note: string
  x: number
  y: number
  width: number
  height: number
}

interface Note {
  id: string
  pageNumber: number
  content: string
  x: number
  y: number
}

export default function PDFReader({ pdfs }: PDFReaderProps) {
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedText, setSelectedText] = useState<string>('')
  const [showSummary, setShowSummary] = useState<boolean>(false)
  const [aiSummary, setAiSummary] = useState<string>('')
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false)

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim())
    }
  }

  const addHighlight = () => {
    if (selectedText) {
      const newHighlight: Highlight = {
        id: Date.now().toString(),
        pageNumber,
        text: selectedText,
        note: '',
        x: 0,
        y: 0,
        width: 0,
        height: 0
      }
      setHighlights(prev => [...prev, newHighlight])
      setSelectedText('')
    }
  }

  const addNote = (content: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      pageNumber,
      content,
      x: Math.random() * 200,
      y: Math.random() * 200
    }
    setNotes(prev => [...prev, newNote])
  }

  const generateSummary = async () => {
    if (!selectedPDF) return
    
    setIsLoadingSummary(true)
    setShowSummary(true)
    
    try {
      // AI 요약 API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 2000))
      setAiSummary(`이 문서의 주요 내용:

1. **핵심 개념**: PDF 문서 처리 및 AI 기반 학습 도구 구현
2. **주요 기능**: 
   - 문서 업로드 및 뷰어 기능
   - 하이라이트 및 노트 작성
   - AI 기반 요약 및 질의응답
3. **기술적 특징**: React와 Node.js를 활용한 통합 플랫폼
4. **사용자 경험**: 직관적인 인터페이스와 Google 로그인 연동

이 문서는 현대적인 웹 기술을 활용한 교육용 플랫폼 구축에 대한 포괄적인 가이드를 제공합니다.`)
    } finally {
      setIsLoadingSummary(false)
    }
  }

  if (pdfs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">PDF 문서가 없습니다</h3>
          <p className="mt-2 text-sm text-gray-500">
            왼쪽 사이드바에서 PDF 파일을 업로드하여 시작하세요.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      {/* PDF List */}
      <div className="w-80 bg-white border-r overflow-y-auto">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">문서 목록</h3>
        </div>
        <div className="divide-y">
          {pdfs.map((pdf) => (
            <button
              key={pdf.id}
              onClick={() => setSelectedPDF(pdf.file)}
              className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                selectedPDF === pdf.file ? 'bg-blue-50 border-r-2 border-blue-500' : ''
              }`}
            >
              <div className="font-medium text-gray-900 truncate">{pdf.name}</div>
              <div className="text-sm text-gray-500 mt-1">
                {highlights.filter(h => h.pageNumber).length}개 하이라이트
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 flex">
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          {selectedPDF ? (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                      disabled={pageNumber <= 1}
                      className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                    >
                      이전
                    </button>
                    <span className="text-sm text-gray-600">
                      {pageNumber} / {numPages}
                    </span>
                    <button
                      onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                      disabled={pageNumber >= numPages}
                      className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                    >
                      다음
                    </button>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={addHighlight}
                      disabled={!selectedText}
                      className="px-3 py-1 bg-yellow-500 text-white rounded disabled:opacity-50"
                    >
                      하이라이트
                    </button>
                    <button
                      onClick={generateSummary}
                      className="px-3 py-1 bg-blue-500 text-white rounded"
                    >
                      AI 요약
                    </button>
                  </div>
                </div>

                <div onMouseUp={handleTextSelection} className="border rounded">
                  <Document
                    file={selectedPDF}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="flex justify-center"
                  >
                    <Page pageNumber={pageNumber} />
                  </Document>
                </div>

                {selectedText && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded border">
                    <p className="text-sm font-medium text-gray-900">선택된 텍스트:</p>
                    <p className="text-sm text-gray-700 mt-1">{selectedText}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">문서를 선택하세요</p>
            </div>
          )}
        </div>

        {/* Sidebar for AI Summary and Notes */}
        {showSummary && (
          <div className="w-96 bg-white border-l p-4 overflow-y-auto">
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">AI 요약</h3>
              {isLoadingSummary ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="prose prose-sm text-gray-700 whitespace-pre-line">
                  {aiSummary}
                </div>
              )}
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">질문하기</h3>
              <textarea
                placeholder="문서에 대해 질문해보세요..."
                className="w-full p-3 border rounded-md text-sm resize-none"
                rows={3}
              />
              <button className="mt-2 w-full bg-blue-500 text-white py-2 rounded-md text-sm hover:bg-blue-600">
                AI에게 질문하기
              </button>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">하이라이트</h3>
              <div className="space-y-2">
                {highlights.map((highlight) => (
                  <div key={highlight.id} className="p-3 bg-yellow-50 rounded border text-sm">
                    <p className="text-gray-900 font-medium">페이지 {highlight.pageNumber}</p>
                    <p className="text-gray-700 mt-1">{highlight.text}</p>
                  </div>
                ))}
                {highlights.length === 0 && (
                  <p className="text-gray-500 text-sm">아직 하이라이트가 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}