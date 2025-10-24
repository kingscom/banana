'use client'

import { useState, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { createClient } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { FileText } from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// PDF.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

interface PDFReaderProps {
  pdfs: Array<{id: string, name: string, file: File | null, document?: any}>
}

interface Highlight {
  id: string
  document_id?: string
  pageNumber: number
  text: string
  note?: string
  x: number
  y: number
  width: number
  height: number
  created_at?: string
}

interface Note {
  id: string
  pageNumber: number
  content: string
  x: number
  y: number
}

// 하이라이트 오버레이 컴포넌트
function HighlightOverlay({ highlights, pageNumber }: { highlights: Highlight[], pageNumber: number }) {
  const [overlayHighlights, setOverlayHighlights] = useState<Array<Highlight & { actualX: number, actualY: number, actualWidth: number, actualHeight: number }>>([])

  useEffect(() => {
    const updateHighlightPositions = () => {
      // PDF 페이지의 실제 렌더링 영역을 찾기
      const pdfCanvas = document.querySelector('.react-pdf__Page__canvas')
      const textLayer = document.querySelector('.react-pdf__Page__textContent')
      const pdfPage = document.querySelector('.react-pdf__Page')
      
      // 가장 정확한 기준점 선택
      const pageRect = (pdfCanvas || textLayer || pdfPage)?.getBoundingClientRect()
      
      if (!pageRect || highlights.length === 0) {
        setOverlayHighlights([])
        return
      }
      
      // PDF 컨테이너 기준으로 상대 위치 계산
      const container = document.querySelector('.pdf-container')
      const containerRect = container?.getBoundingClientRect()
      
      if (!containerRect) {
        setOverlayHighlights([])
        return
      }
      
      const offsetX = pageRect.left - containerRect.left
      const offsetY = pageRect.top - containerRect.top
      
      const updatedHighlights = highlights.map(highlight => {
        const actualX = offsetX + (highlight.x * (pageRect.width+2)) - 1 // 1px 왼쪽으로 이동
        const actualY = offsetY + (highlight.y * pageRect.height)
        const actualWidth = highlight.width * pageRect.width
        const actualHeight = highlight.height * pageRect.height
        
        return {
          ...highlight,
          actualX,
          actualY,
          actualWidth,
          actualHeight
        }
      })
      
      setOverlayHighlights(updatedHighlights)
    }

    // 초기 계산
    updateHighlightPositions()
    
    // 리사이즈 이벤트 리스너
    const handleResize = () => {
      setTimeout(updateHighlightPositions, 100) // PDF 렌더링이 완료되기를 기다림
    }
    
    window.addEventListener('resize', handleResize)
    
    // PDF 페이지 로드 완료 후 다시 계산 (한 번만)
    let hasObserved = false
    const observer = new MutationObserver((mutations) => {
      // 텍스트 레이어나 캔버스가 추가되었을 때만 재계산
      const hasRelevantChange = mutations.some(mutation => 
        Array.from(mutation.addedNodes).some(node => 
          node instanceof Element && (
            node.classList.contains('react-pdf__Page__canvas') ||
            node.classList.contains('react-pdf__Page__textContent')
          )
        )
      )
      
      if (hasRelevantChange && !hasObserved) {
        hasObserved = true
        setTimeout(() => {
          updateHighlightPositions()
          hasObserved = false
        }, 200)
      }
    })
    
    const pdfContainer = document.querySelector('.react-pdf__Page')
    if (pdfContainer) {
      observer.observe(pdfContainer, { childList: true, subtree: true })
    }
    
    return () => {
      window.removeEventListener('resize', handleResize)
      observer.disconnect()
    }
  }, [highlights, pageNumber])

  return (
    <>
      {overlayHighlights.map((highlight) => (
        <div
          key={highlight.id}
          className="absolute bg-yellow-300 bg-opacity-30 border border-yellow-400 pointer-events-none z-10"
          style={{
            left: `${highlight.actualX}px`,
            top: `${highlight.actualY}px`,
            width: `${highlight.actualWidth}px`,
            height: `${highlight.actualHeight}px`,
          }}
          title={highlight.text}
        />
      ))}
    </>
  )
}

export default function PDFReader({ pdfs }: PDFReaderProps) {
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null)
  const [selectedPDFId, setSelectedPDFId] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedText, setSelectedText] = useState<string>('')
  const [selection, setSelection] = useState<Selection | null>(null)
  const [showHighlights, setShowHighlights] = useState<boolean>(true)
  const [aiSummary, setAiSummary] = useState<string>('')
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false)
  const [pageLoaded, setPageLoaded] = useState<boolean>(false)
  const [highlightsLoaded, setHighlightsLoaded] = useState<boolean>(false)
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()

  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set())

  // 서버에서 파일을 로드하는 함수 (중복 로딩 방지)
  const loadFileFromServer = async (document: any): Promise<File | null> => {
    try {
      if (!document.file_path || !user) return null

      // 이미 로딩 중인 파일이면 스킵
      if (loadingFiles.has(document.id)) {
        console.log('파일 로딩 중 스킵:', document.file_name)
        return null
      }

      setLoadingFiles(prev => new Set(prev).add(document.id))

      console.log('파일 로딩 시작:', document.file_name)
      const response = await fetch(`/api/files/${user.id}/${document.file_name}`)
      if (!response.ok) {
        console.error('파일 로드 실패:', response.statusText)
        return null
      }

      const blob = await response.blob()
      const file = new File([blob], document.file_name, { type: document.file_type })
      console.log('파일 로딩 완료:', document.file_name)
      return file
    } catch (error) {
      console.error('파일 로드 중 오류:', error)
      return null
    } finally {
      setLoadingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(document.id)
        return newSet
      })
    }
  }

  // 사용자 인증 상태 확인
  useEffect(() => {
    if (user) {
      console.log('AuthProvider에서 사용자 정보 확인됨:', user)
      // Supabase 연결 테스트
      testSupabaseConnection()
    } else if (!authLoading) {
      console.log('사용자가 로그인되지 않음')
    }
  }, [user, authLoading])

  // Supabase 연결 테스트
  const testSupabaseConnection = async () => {
    try {
      console.log('Supabase 연결 테스트 시작...')
      
      // 테이블 존재 확인
      const { data, error } = await supabase
        .from('highlights')
        .select('count', { count: 'exact', head: true })
        .limit(1)

      if (error) {
        console.error('Supabase 테이블 접근 오류:', error)
        if (error.code === 'PGRST116') {
          console.error('highlights 테이블이 존재하지 않습니다!')
        }
      } else {
        console.log('Supabase 연결 성공, highlights 테이블 존재 확인됨')
      }
    } catch (error) {
      console.error('Supabase 연결 테스트 실패:', error)
    }
  }

  // 텍스트 선택 감지를 위한 이벤트 리스너
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (selection && selection.toString().trim()) {
        setSelectedText(selection.toString().trim())
        setSelection(selection)
        console.log('텍스트 선택됨:', selection.toString().trim())
      } else if (selectedText) {
        // 선택이 해제되면 일정 시간 후 상태 초기화
        setTimeout(() => {
          const currentSelection = window.getSelection()
          if (!currentSelection || !currentSelection.toString().trim()) {
            setSelectedText('')
            setSelection(null)
          }
        }, 100)
      }
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [selectedText])

  // PDF 문서가 로드된 후 하이라이트 불러오기
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    if (!highlightsLoaded) {
      loadHighlights()
      setHighlightsLoaded(true)
    }
  }

  // 하이라이트 불러오기
  const loadHighlights = async () => {
    if (!selectedPDFId || !user) {
      console.log('하이라이트 로딩 스킵:', { selectedPDFId, userId: user?.id })
      return
    }

    console.log('하이라이트 로딩 시작:', { selectedPDFId, userId: user.id })

    try {
      const response = await fetch(`/api/highlights?document_id=${selectedPDFId}&user_id=${user.id}`)
      const result = await response.json()

      if (!response.ok) {
        console.error('하이라이트 로딩 오류:', result.error)
        return
      }
      
      console.log('API에서 로드된 하이라이트:', result.data)
      
      const formattedHighlights = result.data.map((h: any) => ({
        id: h.id,
        document_id: h.document_id,
        pageNumber: h.page_number,
        text: h.selected_text,
        note: h.note || '',
        x: h.position_x,
        y: h.position_y,
        width: h.position_width,
        height: h.position_height,
        created_at: h.created_at
      }))
      
      console.log('포맷된 하이라이트:', formattedHighlights)
      setHighlights(formattedHighlights)
    } catch (error) {
      console.error('하이라이트 로드 중 오류:', error)
    }
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim())
      setSelection(selection)
    }
  }

  const addHighlight = async () => {
    // 현재 선택된 텍스트가 없으면 다시 확인
    let currentSelection = selection
    let currentText = selectedText

    if (!currentText) {
      const windowSelection = window.getSelection()
      if (windowSelection && windowSelection.toString().trim()) {
        currentText = windowSelection.toString().trim()
        currentSelection = windowSelection
        setSelectedText(currentText)
        setSelection(windowSelection)
      }
    }

    if (!currentText || !currentSelection || !selectedPDFId || !user) {
      console.log('하이라이트 추가 실패:', {
        hasText: !!currentText,
        hasSelection: !!currentSelection,
        hasPDFId: !!selectedPDFId,
        hasUser: !!user,
        authLoading: authLoading,
        selectedText: currentText,
        selectedPDFId: selectedPDFId
      })
      
      // 사용자 정보가 없는 경우 로그인 필요 메시지
      if (!user && !authLoading) {
        alert('하이라이트를 추가하려면 로그인이 필요합니다.')
      }
      return
    }

    try {
      // 선택된 텍스트의 위치 정보 가져오기
      const range = currentSelection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      
      // PDF 페이지의 실제 렌더링 영역을 찾기 위해 여러 요소 확인
      const pdfCanvas = document.querySelector('.react-pdf__Page__canvas')
      const textLayer = document.querySelector('.react-pdf__Page__textContent') 
      const pdfPage = document.querySelector('.react-pdf__Page')
      
      // 가장 정확한 기준점 선택 (Canvas > TextLayer > Page 순)
      const pageRect = (pdfCanvas || textLayer || pdfPage)?.getBoundingClientRect()
      
      if (!pageRect) {
        console.error('PDF 페이지를 찾을 수 없습니다')
        return
      }
      
      console.log('선택 영역:', { left: rect.left, top: rect.top, width: rect.width, height: rect.height })
      console.log('PDF 페이지 영역:', { left: pageRect.left, top: pageRect.top, width: pageRect.width, height: pageRect.height })
      
      // PDF 페이지 크기 기준으로 상대 비율 계산 (0-1 사이 값)
      const relativeX = (rect.left - pageRect.left) / pageRect.width
      const relativeY = (rect.top - pageRect.top) / pageRect.height
      const relativeWidth = rect.width / pageRect.width
      const relativeHeight = rect.height / pageRect.height
      
      console.log('상대 위치:', { x: relativeX, y: relativeY, width: relativeWidth, height: relativeHeight })
      
      const newHighlight: Highlight = {
        id: crypto.randomUUID(),
        document_id: selectedPDFId,
        pageNumber,
        text: currentText,
        note: '',
        x: relativeX,
        y: relativeY,
        width: relativeWidth,
        height: relativeHeight
      }

      console.log('하이라이트 추가:', newHighlight)

      // 먼저 UI에 임시로 추가 (즉시 피드백)
      const tempHighlight = { ...newHighlight }
      setHighlights(prev => {
        console.log('현재 하이라이트 개수:', prev.length)
        const updated = [...prev, tempHighlight]
        console.log('업데이트된 하이라이트 개수:', updated.length)
        return updated
      })

      // API를 통해 하이라이트 저장 (상대 비율로 저장)
      const saveData = {
        document_id: selectedPDFId,
        page_number: pageNumber,
        selected_text: currentText,
        note: '',
        position_x: relativeX,
        position_y: relativeY,
        position_width: relativeWidth,
        position_height: relativeHeight,
        user_id: user.id
      }
      
      console.log('저장할 데이터:', saveData)

      const response = await fetch('/api/highlights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData)
      })

      const result = await response.json()
      console.log('API 응답:', result)

      if (!response.ok) {
        console.error('하이라이트 저장 오류:', result.error)
        // 저장 실패 시 임시 하이라이트 제거
        setHighlights(prev => prev.filter(h => h.id !== tempHighlight.id))
        alert('하이라이트 저장에 실패했습니다: ' + result.error)
        return
      }

      console.log('하이라이트 저장 성공:', result.data)

      // 임시 하이라이트를 실제 저장된 데이터로 교체
      if (result.data) {
        const savedHighlight = {
          id: result.data.id,
          document_id: result.data.document_id,
          pageNumber: result.data.page_number,
          text: result.data.selected_text,
          note: result.data.note || '',
          x: result.data.position_x,
          y: result.data.position_y,
          width: result.data.position_width,
          height: result.data.position_height,
          created_at: result.data.created_at
        }
        
        setHighlights(prev => {
          const filtered = prev.filter(h => h.id !== tempHighlight.id)
          const updated = [...filtered, savedHighlight]
          console.log('최종 하이라이트 개수:', updated.length)
          console.log('저장된 하이라이트:', savedHighlight)
          return updated
        })
      }
      
      setSelectedText('')
      setSelection(null)
      
      // 선택 해제
      window.getSelection()?.removeAllRanges()
      
      console.log('하이라이트 추가 완료')
    } catch (error) {
      console.error('하이라이트 저장 중 오류:', error)
      alert('하이라이트 저장 중 오류가 발생했습니다.')
    }
  }

  const goToHighlight = (highlight: Highlight) => {
    // 같은 페이지가 아닐 때만 페이지 로드 상태 초기화
    if (highlight.pageNumber !== pageNumber) {
      setPageLoaded(false)
      setPageNumber(highlight.pageNumber)
    }
    // 같은 페이지일 때는 페이지 번호만 설정 (이미 같으므로 실제로는 변경되지 않음)
  }

  // 페이지 번호가 변경될 때마다 페이지 로드 상태 초기화
  useEffect(() => {
    setPageLoaded(false)
  }, [pageNumber])

  const deleteHighlight = async (highlightId: string) => {
    if (!user) return

    try {
      const response = await fetch(`/api/highlights?id=${highlightId}&user_id=${user.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('하이라이트 삭제 오류:', result.error)
        alert('하이라이트 삭제에 실패했습니다: ' + result.error)
        return
      }

      setHighlights(prev => prev.filter(h => h.id !== highlightId))
    } catch (error) {
      console.error('하이라이트 삭제 중 오류:', error)
      alert('하이라이트 삭제 중 오류가 발생했습니다.')
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
            PDF 파일을 업로드하여 시작하세요.
          </p>
        </div>
      </div>
    )
  }

  // 첫 번째 PDF를 자동으로 선택 (한 번만)
  useEffect(() => {
    if (!selectedPDF && pdfs.length > 0 && user) {
      const firstPdf = pdfs[0]
      
      if (firstPdf.file) {
        // 로컬 파일인 경우
        setSelectedPDF(firstPdf.file)
        setSelectedPDFId(firstPdf.id)
        setHighlightsLoaded(false)
      } else if (firstPdf.document && !selectedPDF) {
        // 서버 파일인 경우 로드 (이미 로딩 중이 아닐 때만)
        console.log('서버에서 파일 로딩 시작:', firstPdf.document.file_name)
        loadFileFromServer(firstPdf.document).then(file => {
          if (file) {
            setSelectedPDF(file)
            setSelectedPDFId(firstPdf.id)
            setHighlightsLoaded(false)
            console.log('서버 파일 로딩 완료:', firstPdf.document.title)
          }
        }).catch(error => {
          console.error('서버 파일 로딩 실패:', error)
        })
      }
    }
  }, [pdfs.length, user?.id]) // 의존성 배열 최적화

  // PDF ID가 변경될 때 하이라이트 로딩 상태 리셋
  useEffect(() => {
    setHighlightsLoaded(false)
    setHighlights([]) // 기존 하이라이트 클리어
  }, [selectedPDFId])

  return (
    <div className="flex h-screen">
      {/* PDF Viewer */}
      <div className="flex-1 flex">
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          {selectedPDF ? (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                {/* 문서 제목 및 컨트롤 */}
                <div className="flex justify-between items-center mb-4 border-b pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {pdfs[0]?.name || '문서'}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {pdfs[0]?.document && new Date(pdfs[0].document.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHighlights(!showHighlights)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      showHighlights 
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    하이라이트 {showHighlights ? '숨기기' : '보기'}
                  </button>
                </div>

                {/* 페이지 네비게이션 */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => {
                        setPageLoaded(false)
                        setPageNumber(Math.max(1, pageNumber - 1))
                      }}
                      disabled={pageNumber <= 1}
                      className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
                    >
                      이전
                    </button>
                    <span className="text-sm text-gray-600 font-medium">
                      {pageNumber} / {numPages}
                    </span>
                    <button
                      onClick={() => {
                        setPageLoaded(false)
                        setPageNumber(Math.min(numPages, pageNumber + 1))
                      }}
                      disabled={pageNumber >= numPages}
                      className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
                    >
                      다음
                    </button>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={addHighlight}
                      className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 font-medium disabled:opacity-50"
                      title={selectedText ? `선택된 텍스트: "${selectedText.substring(0, 50)}..."` : "텍스트를 선택하세요"}
                    >
                      🖍️ 하이라이트 {selectedText && `(${selectedText.length}자)`}
                    </button>
                    <button
                      onClick={generateSummary}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
                    >
                      ✨ AI 요약
                    </button>
                  </div>
                </div>

                {/* PDF 문서 */}
                <div 
                  onMouseUp={handleTextSelection}
                  onClick={handleTextSelection}
                  onKeyUp={handleTextSelection}
                  className="border rounded relative pdf-container flex justify-center"
                  style={{ userSelect: 'text' }}
                >
                  <Document
                    file={selectedPDF}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="flex justify-center"
                  >
                    <Page 
                      pageNumber={pageNumber}
                      renderTextLayer={true}
                      renderAnnotationLayer={false}
                      className="pdf-page"
                      onLoadSuccess={() => {
                        setPageLoaded(true)
                        console.log('PDF 페이지 로드 완료')
                      }}
                      onGetTextSuccess={(textItems) => {
                        console.log('PDF 텍스트 레이어 로드됨:', textItems)
                      }}
                    />
                  </Document>
                  
                  {/* 하이라이트 오버레이 */}
                  {showHighlights && pageLoaded && (
                    <HighlightOverlay 
                      highlights={highlights.filter(h => h.pageNumber === pageNumber)}
                      pageNumber={pageNumber}
                    />
                  )}
                </div>

                {/* 선택된 텍스트 표시 */}
                {selectedText && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                    <p className="text-sm font-medium text-gray-900">선택된 텍스트:</p>
                    <p className="text-sm text-gray-700 mt-1">{selectedText}</p>
                    <button
                      onClick={addHighlight}
                      className="mt-2 px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                    >
                      하이라이트 추가
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">문서를 로딩 중...</p>
            </div>
          )}
        </div>

        {/* 하이라이트 사이드바 */}
        {showHighlights && (
          <div className="w-80 bg-white border-l p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">하이라이트</h3>
              <span className="text-sm text-gray-500">
                {highlights.length}개
              </span>
            </div>
            
            <div className="space-y-3">
              {highlights.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">🖍️</div>
                  <p className="text-gray-500 text-sm">
                    하이라이트가 없습니다.<br />
                    텍스트를 선택하고 하이라이트 버튼을 클릭하세요.
                  </p>
                </div>
              )}
              
              {highlights.map((highlight) => (
                <div 
                  key={highlight.id} 
                  className="p-3 bg-yellow-50 rounded border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-colors"
                  onClick={() => goToHighlight(highlight)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      페이지 {highlight.pageNumber}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteHighlight(highlight.id)
                      }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      삭제
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3">
                    {highlight.text}
                  </p>
                  {highlight.created_at && (
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(highlight.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  )}
                </div>
              ))}
              
            </div>

            {/* AI 요약 섹션 */}
            {aiSummary && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-3">AI 요약</h3>
                {isLoadingSummary ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="prose prose-sm text-gray-700 whitespace-pre-line text-sm">
                    {aiSummary}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}