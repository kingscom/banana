'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { FileText } from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// PDF.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

interface PDFReaderProps {
  pdfs: Array<{id: string, name: string, file: File | null, document?: any}>
  initialPage?: number
  targetHighlightId?: string
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
  rectangles?: Array<{x: number, y: number, width: number, height: number}> // 다각형 지원
  created_at?: string
}

interface Note {
  id: string
  pageNumber: number
  content: string
  x: number
  y: number
}

// 하이라이트 오버레이 컴포넌트 - 다각형 지원
const HighlightOverlay = React.memo(function HighlightOverlay({ highlights, pageNumber, pageLoaded }: { highlights: Highlight[], pageNumber: number, pageLoaded: boolean }) {
  const [overlayHighlights, setOverlayHighlights] = useState<Array<Highlight & { actualRectangles: Array<{x: number, y: number, width: number, height: number}> }>>([])

  useEffect(() => {
    const updateHighlightPositions = () => {
      if (!pageLoaded || highlights.length === 0) {
        setOverlayHighlights([])
        return
      }

      // PDF Canvas를 직접 찾아서 그 크기를 기준으로 계산
      const pdfCanvas = document.querySelector('.react-pdf__Page__canvas') as HTMLCanvasElement
      
      if (!pdfCanvas) {
        setOverlayHighlights([])
        return
      }

      // Canvas의 실제 표시 크기 (CSS 크기)
      const canvasRect = pdfCanvas.getBoundingClientRect()
      const displayWidth = canvasRect.width
      const displayHeight = canvasRect.height
      
      const updatedHighlights = highlights.map(highlight => {
        let rawRectangles = []
        
        if (highlight.rectangles && Array.isArray(highlight.rectangles) && highlight.rectangles.length > 0) {
          // 다각형 하이라이트 (여러 직사각형)
          rawRectangles = highlight.rectangles.map(rect => ({
            x: Math.max(0, rect.x * displayWidth + 15),
            y: Math.max(0, rect.y * displayHeight + 17),
            width: Math.max(10, rect.width * displayWidth),
            height: Math.max(8, rect.height * displayHeight)
          }))
        } else {
          // 기존 단일 직사각형 하이라이트 또는 잘못된 rectangles 데이터
          rawRectangles = [{
            x: Math.max(0, highlight.x * displayWidth + 15),
            y: Math.max(0, highlight.y * displayHeight + 17),
            width: Math.max(10, highlight.width * displayWidth),
            height: Math.max(8, highlight.height * displayHeight)
          }]
        }
        
        // 같은 행(Y값과 height가 같은)의 사각형들을 합치기
        const mergedRectangles: Array<{x: number, y: number, width: number, height: number}> = []
        const tolerance = 5 // Y값 허용 오차
        
        // Y값 기준으로 정렬
        const sortedRects = rawRectangles.sort((a, b) => a.y - b.y)
        
        for (const rect of sortedRects) {
          // 같은 행에 있는 기존 직사각형 찾기
          const existingRow = mergedRectangles.find(merged => 
            Math.abs(merged.y - rect.y) <= tolerance && 
            Math.abs(merged.height - rect.height) <= tolerance
          )
          
          if (existingRow) {
            // 같은 행이면 X값 범위를 확장해서 합치기
            const minX = Math.min(existingRow.x, rect.x)
            const maxX = Math.max(existingRow.x + existingRow.width, rect.x + rect.width)
            existingRow.x = minX
            existingRow.width = maxX - minX
          } else {
            // 새로운 행이면 추가
            mergedRectangles.push({ ...rect })
          }
        }
        
        return {
          ...highlight,
          actualRectangles: mergedRectangles
        }
      })
      
      setOverlayHighlights(updatedHighlights)
    }

    // 즉시 실행
    updateHighlightPositions()
    
    // 리사이즈 처리
    const handleResize = () => {
      setTimeout(updateHighlightPositions, 100)
    }
    
    window.addEventListener('resize', handleResize)
    
    // 지연 재계산
    const timeout = setTimeout(updateHighlightPositions, 300)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timeout)
    }
  }, [highlights.length, pageNumber, pageLoaded])

  return (
    <div 
      className="absolute pointer-events-none z-20" 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%'
      }}
    >
      {overlayHighlights.map((highlight, index) => (
        <div key={highlight.id} data-highlight-id={highlight.id} className="absolute">
          {highlight.actualRectangles.map((rect, rectIndex) => {
            // 연결된 하이라이트처럼 보이게 하기 위한 스타일링
            const isFirst = rectIndex === 0
            const isLast = rectIndex === highlight.actualRectangles.length - 1
            const isMiddle = !isFirst && !isLast
            
            return (
              <div
                key={`${highlight.id}-${rectIndex}`}
                className="absolute pointer-events-none"
                style={{
                  left: `${rect.x}px`,
                  top: `${rect.y}px`,
                  width: `${rect.width}px`,
                  height: `${rect.height}px`,
                  backgroundColor: '#ffeb3b',
                  opacity: 0.3,
                  border: 'none',
                  borderRadius: '0',
                  boxShadow: 'none',
                  // 중첩되어도 색이 진해지지 않도록 mix-blend-mode 사용
                  mixBlendMode: 'multiply',
                  zIndex: 10
                }}
                title={isFirst ? highlight.text : undefined}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
})

export default function PDFReader({ pdfs, initialPage, targetHighlightId }: PDFReaderProps) {
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
  const [isFlipping, setIsFlipping] = useState<boolean>(false)
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null)
  const [pageInputValue, setPageInputValue] = useState<string>('')
  const { user, loading: authLoading } = useAuth()

  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set())
  const [showDocumentSummary, setShowDocumentSummary] = useState<boolean>(false)
  const [documentSummary, setDocumentSummary] = useState<string>('')
  const [summaryCheckInterval, setSummaryCheckInterval] = useState<NodeJS.Timeout | null>(null)

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
    if (!highlightsLoaded && selectedPDFId && user) {
      setHighlightsLoaded(true) // 먼저 플래그를 설정하여 중복 호출 방지
      loadHighlights()
      loadDocumentSummary().then(() => {
        // 요약이 없으면 주기적 체크 시작
        if (!documentSummary || !documentSummary.trim()) {
          startSummaryCheck()
        }
      })
    }
    
    // 초기 페이지가 지정된 경우 해당 페이지로 이동
    if (initialPage && initialPage !== pageNumber) {
      setPageNumber(initialPage)
      setPageLoaded(false)
    }
  }

  // 하이라이트 불러오기
  const loadHighlights = async () => {
    if (!selectedPDFId || !user) {
      return
    }

    try {
      const response = await fetch(`/api/highlights?document_id=${selectedPDFId}&user_id=${user.id}`)
      const result = await response.json()

      if (!response.ok) {
        console.error('하이라이트 로딩 오류:', result.error)
        return
      }
      
      const formattedHighlights = result.data.map((h: any) => {
        let rectangles = undefined
        
        // rectangles 필드 파싱 (여러 형태 지원)
        if (h.rectangles) {
          try {
            if (typeof h.rectangles === 'string') {
              const parsed = JSON.parse(h.rectangles)
              if (Array.isArray(parsed) && parsed.length > 0) {
                rectangles = parsed
              }
            } else if (Array.isArray(h.rectangles)) {
              rectangles = h.rectangles
            }
          } catch (e) {
            console.warn('rectangles 파싱 실패:', h.rectangles, e)
          }
        }
        
        return {
          id: h.id,
          document_id: h.document_id,
          pageNumber: h.page_number,
          text: h.selected_text,
          note: h.note || '',
          x: h.position_x || 0,
          y: h.position_y || 0,
          width: h.position_width || 0.1,
          height: h.position_height || 0.02,
          rectangles: rectangles,
          created_at: h.created_at
        }
      })
      
      setHighlights(formattedHighlights)
    } catch (error) {
      console.error('하이라이트 로드 중 오류:', error)
    }
  }

  // 문서 요약 불러오기
  const loadDocumentSummary = async () => {
    if (!selectedPDFId || !user) {
      console.log('문서 요약 로드 스킵:', { selectedPDFId: !!selectedPDFId, user: !!user })
      return
    }

    try {
      console.log('🔍 문서 요약 로드 시작:', { selectedPDFId, userId: user.id })
      
      const response = await fetch(`/api/documents?id=${selectedPDFId}&user_id=${user.id}`)
      const result = await response.json()

      console.log('📄 문서 요약 API 응답:', {
        ok: response.ok,
        status: response.status,
        hasData: !!result.data,
        hasSummary: !!(result.data?.summary),
        summaryLength: result.data?.summary?.length || 0,
        fullResult: result
      })

      if (response.ok && result.data && result.data.summary && result.data.summary.trim()) {
        setDocumentSummary(result.data.summary.trim())
        console.log('✅ 문서 요약 로드 완료:', result.data.summary.length, '문자')
        stopSummaryCheck() // 요약이 있으면 체크 중단
      } else {
        setDocumentSummary('')
        console.log('⚠️ 문서 요약이 없습니다:', {
          responseOk: response.ok,
          hasData: !!result.data,
          hasSummary: !!(result.data?.summary),
          summaryContent: result.data?.summary
        })
        // 요약이 없으면 주기적 체크 시작 (이미 실행 중이 아닐 때만)
        if (!summaryCheckInterval) {
          startSummaryCheck()
        }
      }
    } catch (error) {
      console.error('❌ 문서 요약 로드 중 오류:', error)
      setDocumentSummary('')
    }
  }

  // 문서 요약 팝업 열기
  const openDocumentSummary = () => {
    setShowDocumentSummary(true)
  }

  // 문서 요약 주기적 체크 시작
  const startSummaryCheck = () => {
    if (summaryCheckInterval) {
      clearInterval(summaryCheckInterval)
    }

    const interval = setInterval(async () => {
      if (!selectedPDFId || !user) return

      try {
        const response = await fetch(`/api/documents?id=${selectedPDFId}&user_id=${user.id}`)
        const result = await response.json()

        if (response.ok && result.data && result.data.summary && result.data.summary.trim()) {
          const newSummary = result.data.summary.trim()
          if (newSummary !== documentSummary) {
            console.log('🔄 새로운 문서 요약 감지됨:', newSummary.length, '문자')
            setDocumentSummary(newSummary)
            // 요약이 생성되면 체크 중단
            clearInterval(interval)
            setSummaryCheckInterval(null)
          }
        }
      } catch (error) {
        console.error('문서 요약 체크 중 오류:', error)
      }
    }, 5000) // 5초마다 체크

    setSummaryCheckInterval(interval)
    console.log('📡 문서 요약 주기적 체크 시작 (5초 간격)')
  }

  // 문서 요약 체크 중단
  const stopSummaryCheck = () => {
    if (summaryCheckInterval) {
      clearInterval(summaryCheckInterval)
      setSummaryCheckInterval(null)
      console.log('⏹️ 문서 요약 체크 중단')
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
      // 선택된 텍스트의 다각형 영역 정보 가져오기
      const range = currentSelection.getRangeAt(0)
      
      // PDF Canvas를 직접 찾아서 기준으로 사용
      const pdfCanvas = document.querySelector('.react-pdf__Page__canvas') as HTMLCanvasElement
      
      if (!pdfCanvas) {
        alert('PDF 페이지를 찾을 수 없습니다')
        return
      }

      const canvasRect = pdfCanvas.getBoundingClientRect()
      
      // Range의 모든 직사각형 영역 가져오기 (여러 줄 선택 시 다각형)
      const rects = range.getClientRects()
      const rectangles = []
      
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i]
        if (rect.width > 0 && rect.height > 0) {
          // 각 직사각형을 상대 좌표로 변환
          const relativeX = Math.max(0, Math.min(1, (rect.left - canvasRect.left) / canvasRect.width))
          const relativeY = Math.max(0, Math.min(1, (rect.top - canvasRect.top) / canvasRect.height))
          const relativeWidth = Math.max(0.01, Math.min(1, rect.width / canvasRect.width))
          const relativeHeight = Math.max(0.01, Math.min(1, rect.height / canvasRect.height))
          
          rectangles.push({
            x: relativeX,
            y: relativeY, 
            width: relativeWidth,
            height: relativeHeight
          })
        }
      }
      
      // 첫 번째 직사각형을 기본으로 하되, 다각형 정보도 저장
      const firstRect = rectangles[0] || { x: 0, y: 0, width: 0.1, height: 0.02 }
      const relativeX = firstRect.x
      const relativeY = firstRect.y
      const relativeWidth = firstRect.width
      const relativeHeight = firstRect.height
      
      const newHighlight: Highlight = {
        id: crypto.randomUUID(),
        document_id: selectedPDFId,
        pageNumber,
        text: currentText,
        note: '',
        x: relativeX,
        y: relativeY,
        width: relativeWidth,
        height: relativeHeight,
        rectangles: rectangles // 다각형 정보 저장
      }

      // 하이라이트 추가 로깅 (디버깅 시에만 활성화)
      // console.log('하이라이트 추가:', newHighlight)

      // 먼저 UI에 임시로 추가 (즉시 피드백)
      const tempHighlight = { ...newHighlight }
      setHighlights(prev => [...prev, tempHighlight])

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
        rectangles: JSON.stringify(rectangles), // 다각형 정보를 JSON으로 저장
        user_id: user.id
      }
      
      const response = await fetch('/api/highlights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData)
      })

      const result = await response.json()

      if (!response.ok) {
        // 저장 실패 시 임시 하이라이트 제거
        setHighlights(prev => prev.filter(h => h.id !== tempHighlight.id))
        alert('하이라이트 저장에 실패했습니다: ' + result.error)
        return
      }

      // 임시 하이라이트를 실제 저장된 데이터로 교체
      if (result.data) {
        let savedRectangles = undefined
        
        // rectangles 필드 파싱
        if (result.data.rectangles) {
          try {
            if (typeof result.data.rectangles === 'string') {
              const parsed = JSON.parse(result.data.rectangles)
              if (Array.isArray(parsed) && parsed.length > 0) {
                savedRectangles = parsed
              }
            } else if (Array.isArray(result.data.rectangles)) {
              savedRectangles = result.data.rectangles
            }
          } catch (e) {
            console.warn('저장된 rectangles 파싱 실패:', result.data.rectangles, e)
          }
        }
        
        const savedHighlight = {
          id: result.data.id,
          document_id: result.data.document_id,
          pageNumber: result.data.page_number,
          text: result.data.selected_text,
          note: result.data.note || '',
          x: result.data.position_x || 0,
          y: result.data.position_y || 0,
          width: result.data.position_width || 0.1,
          height: result.data.position_height || 0.02,
          rectangles: savedRectangles,
          created_at: result.data.created_at
        }
        
        setHighlights(prev => {
          const filtered = prev.filter(h => h.id !== tempHighlight.id)
          return [...filtered, savedHighlight]
        })
      }
      
      setSelectedText('')
      setSelection(null)
      
      // 선택 해제
      window.getSelection()?.removeAllRanges()
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

  // 페이지 이동 함수
  const goToPage = (targetPage: number) => {
    if (targetPage >= 1 && targetPage <= numPages && targetPage !== pageNumber && !isFlipping) {
      setIsFlipping(true)
      setFlipDirection(targetPage > pageNumber ? 'next' : 'prev')
      setTimeout(() => {
        setPageLoaded(false)
        setPageNumber(targetPage)
        setTimeout(() => {
          setIsFlipping(false)
          setFlipDirection(null)
        }, 800)
      }, 400)
    }
  }

  // 페이지 입력 처리
  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const targetPage = parseInt(pageInputValue)
    if (!isNaN(targetPage)) {
      goToPage(targetPage)
      setPageInputValue('')
    }
  }

  const generateSummary = async () => {
    if (!selectedPDF || !user) return
    
    setIsLoadingSummary(true)
    setAiSummary('') // 이전 요약 초기화
    
    try {
      console.log('🔄 AI 요약 생성 시작:', { 
        page: pageNumber, 
        document: selectedPDFId,
        fileName: selectedPDF.name 
      })

      // 1단계: 현재 페이지의 PDF 추출
      const formData = new FormData()
      formData.append('pdf', selectedPDF)
      formData.append('pageNumber', pageNumber.toString())
      formData.append('userId', user.id)
      formData.append('documentId', selectedPDFId || '')

      console.log('📄 PDF 페이지 추출 요청 중...')
      
      // PDF 페이지 추출 API 호출
      const extractResponse = await fetch('/api/extract-page', {
        method: 'POST',
        body: formData
      })

      if (!extractResponse.ok) {
        const error = await extractResponse.json()
        throw new Error(`PDF 페이지 추출 실패: ${error.error || 'Unknown error'}`)
      }

      const extractResult = await extractResponse.json()
      console.log('✅ PDF 페이지 추출 성공:', extractResult)

      // 2단계: FastAPI로 AI 요약 요청 (Base64 데이터를 Blob으로 변환)
      console.log('🤖 FastAPI AI 요약 요청 중...')
      
      // Base64 데이터를 Blob으로 변환
      const base64Data = extractResult.pdfData
      const pdfBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
      const extractedPdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' })
      
      // FormData로 외부 FastAPI에 직접 전송
      const summaryFormData = new FormData()
      summaryFormData.append('file', extractedPdfBlob, `page_${pageNumber}.pdf`)
      summaryFormData.append('document_id', selectedPDFId || '')
      summaryFormData.append('full', 'false')
      
      // 외부 FastAPI 서버로 직접 요청
      const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000'
      
      const summaryResponse = await fetch(`${FASTAPI_BASE_URL}/summarize`, {
        method: 'POST',
        body: summaryFormData,
      })

      if (!summaryResponse.ok) {
        let errorMessage = 'Unknown error'
        try {
          const error = await summaryResponse.json()
          errorMessage = error.detail || error.message || error.error || `HTTP ${summaryResponse.status}`
        } catch {
          errorMessage = `HTTP ${summaryResponse.status} - ${summaryResponse.statusText}`
        }
        throw new Error(`AI 요약 요청 실패: ${errorMessage}`)
      }

      const summaryResult = await summaryResponse.json()
      console.log('✅ FastAPI에서 AI 요약 완료:', summaryResult)

      // FastAPI 응답 형식에 맞게 요약 텍스트 추출
      setAiSummary(summaryResult.summary || summaryResult.text || summaryResult.result || '요약을 생성할 수 없습니다.')
      
    } catch (error) {
      console.error('❌ AI 요약 생성 중 오류:', error)
      
      let errorMessage = '알 수 없는 오류'
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
          errorMessage = `FastAPI 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.\n(${process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000'})`
        } else {
          errorMessage = error.message
        }
      }
      
      setAiSummary(`요약 생성 중 오류가 발생했습니다:\n${errorMessage}`)
    } finally {
      setIsLoadingSummary(false)
    }
  }

  if (pdfs.length === 0) {
    return (
      <div className="h-screen library-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <FileText className="w-12 h-12 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h3 className="library-title text-2xl">빈 서재</h3>
            <p className="library-text opacity-70">
              아직 읽을 책이 없습니다.<br/>
              PDF 문서를 업로드하여 독서를 시작해보세요.
            </p>
          </div>
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
    setDocumentSummary('') // 문서 요약도 클리어
    stopSummaryCheck() // 기존 체크 중단
  }, [selectedPDFId])

  // 타겟 하이라이트로 스크롤
  useEffect(() => {
    if (targetHighlightId && highlights.length > 0 && pageLoaded) {
      const targetHighlight = highlights.find(h => h.id === targetHighlightId)
      if (targetHighlight && targetHighlight.pageNumber === pageNumber) {
        setTimeout(() => {
          // 해당 하이라이트를 시각적으로 강조
          const highlightElement = document.querySelector(`[data-highlight-id="${targetHighlightId}"]`)
          if (highlightElement) {
            highlightElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            })
            // 잠시 강조 효과
            highlightElement.classList.add('ring-4', 'ring-blue-500', 'ring-opacity-75')
            setTimeout(() => {
              highlightElement.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-75')
            }, 2000)
          }
        }, 500)
      }
    }
  }, [targetHighlightId, highlights, pageLoaded, pageNumber])

  // 컴포넌트 언마운트 시 인터벌 정리
  useEffect(() => {
    return () => {
      stopSummaryCheck()
    }
  }, [])

  return (
    <div className="flex h-screen library-background">
      {/* 문서 요약 팝업 모달 */}
      {showDocumentSummary && documentSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">📄 전체 문서 AI 요약</h3>
                  <p className="text-sm text-gray-500">{pdfs[0]?.name || '문서'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDocumentSummary(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[60vh] bg-gray-50 rounded-lg p-6 border">
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line leading-relaxed">
                {documentSummary}
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                <span className="inline-flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>AI가 생성한 전체 문서 요약입니다</span>
                </span>
              </div>
              <button
                onClick={() => setShowDocumentSummary(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer */}
      <div className="flex-1 flex">
        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          {selectedPDF ? (
            <div className="max-w-5xl mx-auto">
              {/* Open Book Header */}
              <div className="book-card rounded-2xl p-6 mb-6 relative overflow-hidden">
                {/* Book binding effect */}
                <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-amber-700 to-amber-500 rounded-l-2xl"></div>
                <div className="absolute left-3 top-0 bottom-0 w-1 bg-amber-300 opacity-50"></div>
                
                <div className="ml-6">
                  <div className="flex justify-between items-center mb-4">
                    {/* Book Title & Info */}
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                          <FileText className="w-8 h-8 text-amber-50" />
                        </div>
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
                    <div className="flex space-x-2">
                      <button
                        onClick={openDocumentSummary}
                        disabled={!documentSummary}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          documentSummary && documentSummary.trim()
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                            : summaryCheckInterval
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed'
                        }`}
                        title={
                          documentSummary && documentSummary.trim() 
                            ? `전체 문서 AI 요약 보기 (${documentSummary.length}자)` 
                            : summaryCheckInterval
                            ? 'AI 요약 생성 대기 중... (10초마다 확인)'
                            : 'AI 요약이 아직 생성되지 않았습니다'
                        }
                      >
                        {documentSummary && documentSummary.trim() 
                          ? '📄 AI 요약보기 ✅' 
                          : summaryCheckInterval 
                          ? '📄 AI 요약보기 ⏱️' 
                          : '📄 AI 요약보기'
                        }
                      </button>
                      <button
                        onClick={() => setShowHighlights(!showHighlights)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          showHighlights 
                            ? 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200' 
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        하이라이트 {showHighlights ? '숨기기' : '보기'}
                      </button>
                    </div>
                  </div>

                  {/* 페이지 네비게이션 */}
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          if (isFlipping || pageNumber <= 1) return
                          setIsFlipping(true)
                          setFlipDirection('prev')
                          setTimeout(() => {
                            setPageLoaded(false)
                            setPageNumber(Math.max(1, pageNumber - 1))
                            setTimeout(() => {
                              setIsFlipping(false)
                              setFlipDirection(null)
                            }, 800)
                          }, 400)
                        }}
                        disabled={pageNumber <= 1 || isFlipping}
                        className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        <span>←</span>
                        <span>이전</span>
                      </button>
                      
                      {/* 페이지 입력 필드 */}
                      <form onSubmit={handlePageInputSubmit} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={pageInputValue}
                          onChange={(e) => setPageInputValue(e.target.value)}
                          placeholder="페이지"
                          className="w-16 px-2 py-1 text-center text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-gray-500 text-sm">/ {numPages}</span>
                        <button
                          type="submit"
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                          disabled={isFlipping}
                        >
                          이동
                        </button>
                      </form>
                      
                      {/* 현재 페이지 표시 */}
                      <div className="px-3 py-1 bg-gray-100 text-gray-700 font-medium rounded-lg text-sm">
                        현재: {pageNumber}
                      </div>
                      
                      <button
                        onClick={() => {
                          if (isFlipping || pageNumber >= numPages) return
                          setIsFlipping(true)
                          setFlipDirection('next')
                          setTimeout(() => {
                            setPageLoaded(false)
                            setPageNumber(Math.min(numPages, pageNumber + 1))
                            setTimeout(() => {
                              setIsFlipping(false)
                              setFlipDirection(null)
                            }, 800)
                          }, 400)
                        }}
                        disabled={pageNumber >= numPages || isFlipping}
                        className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        <span>다음</span>
                        <span>→</span>
                      </button>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={addHighlight}
                        disabled={!selectedText}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedText 
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100' 
                            : 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed'
                        }`}
                        title={selectedText ? `선택된 텍스트: "${selectedText.substring(0, 50)}..."` : "텍스트를 선택하세요"}
                      >
                        하이라이트 {selectedText && `(${selectedText.length}자)`}
                      </button>
                      <button
                        onClick={generateSummary}
                        className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                      >
                        Page AI 요약
                      </button>
                    </div>
                  </div>

                  {/* 책 느낌의 PDF 문서 컨테이너 */}
                  <div className="relative flex justify-center items-start">
                    {/* 왼쪽 이전 페이지 화살표 */}
                    <div className="absolute top-1/2 -translate-y-1/2 z-[100]" style={{ left: "1.1rem" }}>
                      <button
                        onClick={() => {
                          if (isFlipping || pageNumber <= 1) return
                          setIsFlipping(true)
                          setFlipDirection('prev')
                          setTimeout(() => {
                            setPageLoaded(false)
                            setPageNumber(Math.max(1, pageNumber - 1))
                            setTimeout(() => {
                              setIsFlipping(false)
                              setFlipDirection(null)
                            }, 600)
                          }, 200)
                        }}
                        disabled={pageNumber <= 1 || isFlipping}
                        className="transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-110"
                        title="이전 페이지"
                      >
                        <svg width="60" height="50" viewBox="0 0 60 50" className="drop-shadow-lg">
                          <defs>
                            <linearGradient id="leftArrowGradient" x1="20%" y1="20%" x2="80%" y2="80%">
                              <stop offset="0%" stopColor={pageNumber <= 1 || isFlipping ? "#E5E7EB" : "#7DD3FC"} />
                              <stop offset="50%" stopColor={pageNumber <= 1 || isFlipping ? "#D1D5DB" : "#38BDF8"} />
                              <stop offset="100%" stopColor={pageNumber <= 1 || isFlipping ? "#9CA3AF" : "#0EA5E9"} />
                            </linearGradient>
                            <filter id="leftArrowShadow" x="-20%" y="-20%" width="140%" height="140%">
                              <feDropShadow dx="2" dy="3" stdDeviation="4" floodOpacity="0.25"/>
                            </filter>
                          </defs>
                          {/* Main arrow body with rounded corners */}
                          <path
                            d="M35 10 C38 8, 42 8, 45 10 C48 12, 48 15, 45 17 L32 25 L45 33 C48 35, 48 38, 45 40 C42 42, 38 42, 35 40 L18 30 C15 28, 15 22, 18 20 L35 10 Z"
                            fill="url(#leftArrowGradient)"
                            stroke={pageNumber <= 1 || isFlipping ? "#9CA3AF" : "#4B5563"}
                            strokeWidth="2"
                            filter="url(#leftArrowShadow)"
                            className="transition-all duration-200"
                          />
                          {/* Inner highlight for 3D effect */}
                          <path
                            d="M35 12 C37 11, 39 11, 41 12 C42 13, 42 14, 41 15 L31 22 L41 29 C42 30, 42 31, 41 32 C39 33, 37 33, 35 32 L22 26 C21 25, 21 23, 22 22 L35 12 Z"
                            fill="rgba(255,255,255,0.3)"
                            className="transition-all duration-200"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* 왼쪽 책갈피 영역 */}
                    <div className="flex flex-col justify-start items-center mr-0 relative z-50" style={{ pointerEvents: 'none' }}>
                      {/* 읽은 페이지들 (책갈피) */}
                      <div className="relative" style={{ height: '800px' }}>
                        {Array.from({ length: Math.min(Math.max(pageNumber - 1, 1), 12) }, (_, i) => (
                          <div
                            key={i}
                            className="absolute bg-gradient-to-r from-amber-50 to-white rounded-sm shadow-sm"
                            style={{
                              width: '12px',
                              height: '800px',
                              left: `${i * -2}px`,
                              top: `${i * -1}px`,
                              zIndex: 60 - i,
                              opacity: Math.max(0.3, 0.9 - (i * 0.06))
                            }}
                          />
                        ))}
                        <div className="w-12 bg-gradient-to-r from-amber-100 to-amber-50 border-l-4 border-amber-400 rounded-sm shadow-lg relative z-70" style={{ height: '800px' }}>
                          {/* 읽은 페이지 라벨 */}
                          <div className="absolute top-8 left-0 right-0 flex justify-center">
                            <div className="bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                              {pageNumber - 1}
                            </div>
                          </div>
                          <div className="absolute top-20 left-1 right-1 text-center">
                            <div className="text-xs text-amber-800 font-bold transform rotate-90 origin-center whitespace-nowrap">
                              읽은페이지
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 중앙 PDF 문서 */}
                    <div 
                      onMouseUp={handleTextSelection}
                      onClick={handleTextSelection}
                      onKeyUp={handleTextSelection}
                      className={`relative bg-white rounded-lg border border-gray-200 shadow-lg pdf-container flex justify-center book-container transition-all duration-500 ease-in-out z-10 ${
                        isFlipping && flipDirection === 'next' ? 'page-flip-next' :
                        isFlipping && flipDirection === 'prev' ? 'page-flip-prev' :
                        !pageLoaded ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
                      }`}
                      style={{ userSelect: 'text' }}
                    >
                    <Document
                      file={selectedPDF}
                      onLoadSuccess={onDocumentLoadSuccess}
                      className="flex justify-center"
                      loading={
                        <div className="flex items-center justify-center p-8">
                          <div className="text-center space-y-3">
                            <div className="animate-spin w-8 h-8 border-3 border-amber-200 border-t-amber-500 rounded-full mx-auto"></div>
                            <p className="library-text text-sm">문서를 읽는 중...</p>
                          </div>
                        </div>
                      }
                      error={
                        <div className="flex items-center justify-center p-8">
                          <div className="text-center space-y-3 max-w-md">
                            <FileText className="w-12 h-12 text-red-400 mx-auto" />
                            <div className="space-y-2">
                              <p className="text-red-600 font-medium">문서를 불러올 수 없습니다</p>
                              <p className="text-sm text-amber-700 opacity-70">
                                파일이 손상되었거나 지원되지 않는 형식일 수 있습니다.
                              </p>
                            </div>
                          </div>
                        </div>
                      }
                    >
                      <Page 
                        pageNumber={pageNumber}
                        renderTextLayer={true}
                        renderAnnotationLayer={false}
                        className={`pdf-page shadow-inner transition-all duration-300 ${!pageLoaded ? 'loading' : ''}`}
                        onLoadSuccess={() => {
                          setTimeout(() => {
                            setPageLoaded(true)
                          }, 150)
                        }}
                        onGetTextSuccess={() => {
                          // 텍스트 레이어 로드 완료
                        }}
                        onRenderSuccess={() => {
                          // 페이지 렌더링 완료
                        }}
                      />
                    </Document>
                    
                      {/* 하이라이트 오버레이 - PDF 페이지와 정확히 같은 위치 */}
                      {showHighlights && pageLoaded && !isFlipping && (
                        <HighlightOverlay 
                          highlights={highlights.filter(h => h.pageNumber === pageNumber)}
                          pageNumber={pageNumber}
                          pageLoaded={pageLoaded}
                        />
                      )}
                    </div>

                    {/* 오른쪽 남은 페이지들 */}
                    <div className="flex flex-col justify-start items-center ml-0 relative z-50" style={{ pointerEvents: 'none' }}>
                      <div className="relative" style={{ height: '800px' }}>
                        {Array.from({ length: Math.min(Math.max(numPages - pageNumber, 1), 12) }, (_, i) => (
                          <div
                            key={i}
                            className="absolute bg-gradient-to-l from-gray-100 to-white border border-gray-200 rounded-sm shadow-sm"
                            style={{
                              width: '12px',
                              height: '800px',
                              right: `${i * -2}px`,
                              top: `${i * -1}px`,
                              zIndex: 60 - i,
                              opacity: Math.max(0.3, 0.8 - (i * 0.05))
                            }}
                          />
                        ))}
                        <div className="w-12 bg-gradient-to-l from-gray-200 to-gray-100 border-r-4 border-gray-500 rounded-sm shadow-lg relative z-70" style={{ height: '800px' }}>
                          {/* 남은 페이지 라벨 */}
                          <div className="absolute top-8 left-0 right-0 flex justify-center">
                            <div className="bg-gray-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                              {numPages - pageNumber}
                            </div>
                          </div>
                          <div className="absolute top-20 left-1 right-1 text-center">
                            <div className="text-xs text-gray-700 font-bold transform rotate-90 origin-center whitespace-nowrap">
                              남은페이지
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 오른쪽 다음 페이지 화살표 */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 z-[100]" style={{right: "1.1rem"}}>
                      <button
                        onClick={() => {
                          if (isFlipping || pageNumber >= numPages) return
                          setIsFlipping(true)
                          setFlipDirection('next')
                          setTimeout(() => {
                            setPageLoaded(false)
                            setPageNumber(Math.min(numPages, pageNumber + 1))
                            setTimeout(() => {
                              setIsFlipping(false)
                              setFlipDirection(null)
                            }, 600)
                          }, 200)
                        }}
                        disabled={pageNumber >= numPages || isFlipping}
                        className="transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-110"
                        title="다음 페이지"
                      >
                        <svg width="60" height="50" viewBox="0 0 60 50" className="drop-shadow-lg">
                          <defs>
                            <linearGradient id="rightArrowGradient" x1="20%" y1="20%" x2="80%" y2="80%">
                              <stop offset="0%" stopColor={pageNumber >= numPages || isFlipping ? "#E5E7EB" : "#7DD3FC"} />
                              <stop offset="50%" stopColor={pageNumber >= numPages || isFlipping ? "#D1D5DB" : "#38BDF8"} />
                              <stop offset="100%" stopColor={pageNumber >= numPages || isFlipping ? "#9CA3AF" : "#0EA5E9"} />
                            </linearGradient>
                            <filter id="rightArrowShadow" x="-20%" y="-20%" width="140%" height="140%">
                              <feDropShadow dx="2" dy="3" stdDeviation="4" floodOpacity="0.25"/>
                            </filter>
                          </defs>
                          {/* Main arrow body with rounded corners */}
                          <path
                            d="M25 10 C22 8, 18 8, 15 10 C12 12, 12 15, 15 17 L28 25 L15 33 C12 35, 12 38, 15 40 C18 42, 22 42, 25 40 L42 30 C45 28, 45 22, 42 20 L25 10 Z"
                            fill="url(#rightArrowGradient)"
                            stroke={pageNumber >= numPages || isFlipping ? "#9CA3AF" : "#4B5563"}
                            strokeWidth="2"
                            filter="url(#rightArrowShadow)"
                            className="transition-all duration-200"
                          />
                          {/* Inner highlight for 3D effect */}
                          <path
                            d="M25 12 C23 11, 21 11, 19 12 C18 13, 18 14, 19 15 L29 22 L19 29 C18 30, 18 31, 19 32 C21 33, 23 33, 25 32 L38 26 C39 25, 39 23, 38 22 L25 12 Z"
                            fill="rgba(255,255,255,0.3)"
                            className="transition-all duration-200"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* 선택된 텍스트 표시 */}
                  {selectedText && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">선택된 텍스트</p>
                      <p className="text-sm text-gray-600 bg-white p-3 rounded border mb-3">{selectedText}</p>
                      <button
                        onClick={addHighlight}
                        className="px-4 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-sm font-medium hover:bg-yellow-100 transition-colors"
                      >
                        하이라이트 추가
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="animate-spin w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full mx-auto"></div>
                <p className="library-text">문서를 로딩 중...</p>
              </div>
            </div>
          )}
        </div>

        {/* 하이라이트 사이드바 */}
        {showHighlights && (
          <div className="w-80 bg-white border-l p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800">하이라이트</h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {highlights.length}개
              </span>
            </div>
            
            <div className="space-y-3">
              {highlights.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="text-gray-400 text-2xl mb-2">📝</div>
                  <div className="space-y-1">
                    <p className="text-gray-600 font-medium">하이라이트가 없습니다</p>
                    <p className="text-gray-500 text-sm">
                      텍스트를 선택하고<br />하이라이트 버튼을 클릭하세요
                    </p>
                  </div>
                </div>
              )}
              
              {highlights.map((highlight) => (
                <div 
                  key={highlight.id} 
                  className="p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => goToHighlight(highlight)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      페이지 {highlight.pageNumber}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteHighlight(highlight.id)
                      }}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      ✕
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
            {(aiSummary || isLoadingSummary) && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">AI 요약</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    페이지 {pageNumber}
                  </span>
                </div>
                
                {isLoadingSummary ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-blue-800 font-medium">Data Waiting...</p>
                        <div className="space-y-1">
                          <p className="text-blue-700 text-sm">📄 PDF 페이지 추출 중</p>
                          <p className="text-blue-600 text-xs">🤖 AI 분석 요청 중</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="prose prose-sm text-gray-700 whitespace-pre-line text-sm max-w-none">
                      {aiSummary}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        생성 시간: {new Date().toLocaleString('ko-KR')}
                      </p>
                    </div>
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