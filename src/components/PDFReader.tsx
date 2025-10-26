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
const HighlightOverlay = React.memo(function HighlightOverlay({ highlights, pageNumber, pageLoaded }: { highlights: Highlight[], pageNumber: number, pageLoaded: boolean }) {
  const [overlayHighlights, setOverlayHighlights] = useState<Array<Highlight & { actualX: number, actualY: number, actualWidth: number, actualHeight: number }>>([])

  useEffect(() => {
    const updateHighlightPositions = () => {
      // 페이지가 완전히 로드되지 않았으면 하이라이트를 숨김
      if (!pageLoaded) {
        setOverlayHighlights([])
        return
      }

      // PDF 페이지의 실제 렌더링 영역을 찾기
      const pdfCanvas = document.querySelector('.react-pdf__Page__canvas')
      const textLayer = document.querySelector('.react-pdf__Page__textContent')
      const pdfPage = document.querySelector('.react-pdf__Page')
      
      // 가장 정확한 기준점 선택
      const pageElement = (pdfCanvas || textLayer || pdfPage)
      const pageRect = pageElement?.getBoundingClientRect()
      
      if (!pageRect || highlights.length === 0) {
        setOverlayHighlights([])
        return
      }
      
      const updatedHighlights = highlights.map(highlight => {
        // PDF 페이지 크기를 기준으로 상대적 위치를 픽셀로 변환 (X 위치 대폭 조정)
        const actualX = (highlight.x * pageRect.width) + 15  // X 위치를 20px 왼쪽으로 조정
        const actualY = highlight.y * pageRect.height  + 15
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
    
    // PDF 페이지 로드 완료를 위한 단일 타이머 (과도한 재요청 방지)
    const timeoutId = setTimeout(() => {
      updateHighlightPositions()
    }, pageLoaded ? 100 : 500) // 페이지가 로드되었으면 빠르게, 아니면 더 기다림
    
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timeoutId)
    }
  }, [highlights.length, pageNumber, pageLoaded]) // 페이지 로드 상태도 감시

  return (
    <div className="absolute inset-0 pointer-events-none z-20" style={{ 
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    }}>
      {overlayHighlights.map((highlight, index) => (
        <div
          key={highlight.id}
          data-highlight-id={highlight.id}
          className="absolute bg-yellow-300 bg-opacity-30 border border-yellow-400 pointer-events-none transition-all duration-300 animate-fade-in"
          style={{
            left: `${highlight.actualX}px`,
            top: `${highlight.actualY}px`,
            width: `${highlight.actualWidth}px`,
            height: `${highlight.actualHeight}px`,
            animationDelay: `${index * 50}ms` // 하이라이트가 순차적으로 나타나도록
          }}
          title={highlight.text}
        />
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
    if (!highlightsLoaded && selectedPDFId && user) {
      setHighlightsLoaded(true) // 먼저 플래그를 설정하여 중복 호출 방지
      loadHighlights()
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
      
      // 위치 정보 로깅 (디버깅 시에만 활성화)
      // console.log('선택 영역:', { left: rect.left, top: rect.top, width: rect.width, height: rect.height })
      // console.log('PDF 페이지 영역:', { left: pageRect.left, top: pageRect.top, width: pageRect.width, height: pageRect.height })
      
      // PDF 페이지 크기 기준으로 상대 비율 계산 (0-1 사이 값)
      const relativeX = (rect.left - pageRect.left) / pageRect.width
      const relativeY = (rect.top - pageRect.top) / pageRect.height
      const relativeWidth = rect.width / pageRect.width
      const relativeHeight = rect.height / pageRect.height
      
      // 상대 위치 로깅 (디버깅 시에만 활성화)
      // console.log('상대 위치:', { x: relativeX, y: relativeY, width: relativeWidth, height: relativeHeight })
      
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

      // 하이라이트 추가 로깅 (디버깅 시에만 활성화)
      // console.log('하이라이트 추가:', newHighlight)

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

  return (
    <div className="flex h-screen library-background">
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
                        AI 요약
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
                        className="pdf-page shadow-inner"
                        onLoadSuccess={() => {
                          setPageLoaded(true)
                          console.log('PDF 페이지 로드 완료')
                        }}
                        onGetTextSuccess={(textItems) => {
                          console.log('PDF 텍스트 레이어 로드됨:', textItems)
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