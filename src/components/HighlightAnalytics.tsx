'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from './AuthProvider'
import { BarChart, FileText, ChevronRight, Hash, Calendar, ExternalLink, Search, MapPin, X } from 'lucide-react'

interface Highlight {
  id: string
  document_id: string
  page_number: number
  selected_text: string
  note?: string
  created_at?: string
}

interface DocumentInfo {
  id: string
  title: string
  file_name: string
}

interface WordFrequency {
  word: string
  count: number
  highlights: Array<{
    id: string
    document_id: string
    document_title: string
    page_number: number
    text: string
    created_at?: string
  }>
}

interface HighlightAnalyticsProps {
  onNavigateToHighlight?: (documentId: string, pageNumber: number, highlightId: string) => void
  onNavigateToConceptMap?: () => void
  onNavigateToCourses?: (searchKeyword: string) => void
}

// 워드 클라우드 캔버스 컴포넌트
function WordCloudCanvas({ 
  words, 
  maxCount, 
  selectedWord, 
  onWordClick 
}: {
  words: WordFrequency[]
  maxCount: number
  selectedWord: string | null
  onWordClick: (word: WordFrequency) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<Array<{
    word: WordFrequency
    x: number
    y: number
    width: number
    height: number
    fontSize: number
    color: string
  }>>([])

  const getWordSize = (count: number, maxCount: number) => {
    const minSize = 14
    const maxSize = 48
    const ratio = count / maxCount
    return minSize + (maxSize - minSize) * ratio
  }

  const getWordColor = (count: number, maxCount: number) => {
    const colors = [
      '#3B82F6', // blue-500
      '#8B5CF6', // violet-500
      '#06B6D4', // cyan-500
      '#10B981', // emerald-500
      '#F59E0B', // amber-500
      '#EF4444', // red-500
      '#EC4899', // pink-500
      '#84CC16'  // lime-500
    ]
    const ratio = count / maxCount
    const colorIndex = Math.floor(ratio * (colors.length - 1))
    return colors[colorIndex]
  }

  // 두 사각형이 겹치는지 확인
  const isOverlapping = (rect1: any, rect2: any, margin = 5) => {
    return !(
      rect1.x + rect1.width + margin < rect2.x ||
      rect2.x + rect2.width + margin < rect1.x ||
      rect1.y + rect1.height + margin < rect2.y ||
      rect2.y + rect2.height + margin < rect1.y
    )
  }

  // 나선형으로 위치 찾기 (개선된 버전)
  const findNonOverlappingPosition = (
    word: WordFrequency,
    fontSize: number,
    containerWidth: number,
    containerHeight: number,
    existingPositions: any[]
  ) => {
    const textWidth = Math.max(word.word.length * fontSize * 0.55, fontSize * 2) // 더 정확한 텍스트 너비
    const textHeight = fontSize * 1.3

    // 중심점에서 시작
    const centerX = containerWidth / 2 - textWidth / 2
    const centerY = containerHeight / 2 - textHeight / 2

    // 첫 번째 단어(가장 빈도가 높은)는 중심에 배치
    if (existingPositions.length === 0) {
      return { x: centerX, y: centerY, width: textWidth, height: textHeight }
    }

    // 빈도에 따라 중심에서의 거리 조정
    const frequencyRatio = word.count / (existingPositions[0]?.word.count || word.count)
    const baseRadius = fontSize * (1 - frequencyRatio * 0.7) // 빈도가 높을수록 중심에 가깝게

    // 나선형으로 위치 탐색
    let angle = Math.random() * Math.PI * 2 // 랜덤 시작 각도로 다양성 추가
    let radius = baseRadius
    const angleIncrement = 0.3
    const radiusIncrement = 1.5

    let attempts = 0
    const maxAttempts = 500

    while (radius < Math.max(containerWidth, containerHeight) / 2 && attempts < maxAttempts) {
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      // 컨테이너 범위 내에 있는지 확인 (여백 고려)
      if (x >= 10 && y >= 10 && x + textWidth <= containerWidth - 10 && y + textHeight <= containerHeight - 10) {
        const newRect = { x, y, width: textWidth, height: textHeight }
        
        // 기존 단어들과 겹치지 않는지 확인
        const hasOverlap = existingPositions.some(pos => isOverlapping(newRect, pos, 8))
        
        if (!hasOverlap) {
          return newRect
        }
      }

      angle += angleIncrement
      attempts++
      
      if (angle > Math.PI * 8) { // 4바퀴 이상 돌면 반지름 증가
        angle = Math.random() * Math.PI * 2 // 각도 재설정
        radius += radiusIncrement
      }
    }

    // 적절한 위치를 찾지 못한 경우 강제 배치 (겹침 허용)
    const fallbackX = Math.max(10, Math.min(containerWidth - textWidth - 10, centerX + (Math.random() - 0.5) * containerWidth * 0.8))
    const fallbackY = Math.max(10, Math.min(containerHeight - textHeight - 10, centerY + (Math.random() - 0.5) * containerHeight * 0.8))
    
    return {
      x: fallbackX,
      y: fallbackY,
      width: textWidth,
      height: textHeight
    }
  }

  // 단어 위치 계산 (개선된 알고리즘)
  useEffect(() => {
    if (!containerRef.current || words.length === 0) return

    const container = containerRef.current
    const containerWidth = container.offsetWidth - 40
    const containerHeight = container.offsetHeight - 40

    // 빈도순으로 정렬하되, 상위 20개는 확실히 배치하고 나머지는 일부 중첩 허용
    const sortedWords = [...words].sort((a, b) => b.count - a.count)
    const importantWords = sortedWords.slice(0, 15) // 상위 15개는 중첩 방지
    const lessImportantWords = sortedWords.slice(15, 50) // 다음 35개는 일부 중첩 허용
    
    const newPositions: any[] = []

    // 중요한 단어들 먼저 배치 (중첩 방지)
    importantWords.forEach(word => {
      const fontSize = getWordSize(word.count, maxCount)
      const color = getWordColor(word.count, maxCount)
      
      const position = findNonOverlappingPosition(
        word,
        fontSize,
        containerWidth,
        containerHeight,
        newPositions
      )
      
      newPositions.push({
        word,
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
        fontSize,
        color
      })
    })

    // 덜 중요한 단어들 배치 (일부 중첩 허용)
    lessImportantWords.forEach((word, index) => {
      const fontSize = getWordSize(word.count, maxCount)
      const color = getWordColor(word.count, maxCount)
      
      // 가끔 중첩을 허용하여 더 자연스러운 클라우드 형태 만들기
      const allowOverlap = Math.random() < 0.3 && index > 10
      
      if (allowOverlap) {
        // 중첩 허용 시 간단한 랜덤 배치
        const textWidth = Math.max(word.word.length * fontSize * 0.55, fontSize * 2)
        const textHeight = fontSize * 1.3
        const centerX = containerWidth / 2
        const centerY = containerHeight / 2
        const angle = Math.random() * Math.PI * 2
        const radius = Math.random() * Math.min(containerWidth, containerHeight) * 0.3
        
        const x = Math.max(10, Math.min(containerWidth - textWidth - 10, centerX + Math.cos(angle) * radius - textWidth / 2))
        const y = Math.max(10, Math.min(containerHeight - textHeight - 10, centerY + Math.sin(angle) * radius - textHeight / 2))
        
        newPositions.push({
          word,
          x,
          y,
          width: textWidth,
          height: textHeight,
          fontSize,
          color
        })
      } else {
        const position = findNonOverlappingPosition(
          word,
          fontSize,
          containerWidth,
          containerHeight,
          newPositions
        )
        
        newPositions.push({
          word,
          x: position.x,
          y: position.y,
          width: position.width,
          height: position.height,
          fontSize,
          color
        })
      }
    })

    setPositions(newPositions)
  }, [words, maxCount])

  return (
    <div 
      ref={containerRef}
      className="relative min-h-[500px] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-lg overflow-hidden border"
      style={{ 
        backgroundImage: `
          radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 70%)
        ` 
      }}
    >
      {positions.map((pos, index) => {
        const isSelected = selectedWord === pos.word.word
        const importance = pos.word.count / maxCount
        
        return (
          <button
            key={pos.word.word}
            onClick={() => onWordClick(pos.word)}
            className={`absolute font-bold transition-all duration-300 cursor-pointer px-3 py-1 rounded-lg whitespace-nowrap select-none ${
              isSelected 
                ? 'bg-white ring-2 ring-blue-500 shadow-xl z-50 scale-110' 
                : 'hover:bg-white/70 hover:shadow-lg hover:scale-105'
            }`}
            style={{
              left: `${pos.x + 20}px`,
              top: `${pos.y + 20}px`,
              fontSize: `${pos.fontSize}px`,
              color: pos.color,
              fontWeight: Math.min(900, 400 + importance * 500),
              textShadow: `2px 2px 4px rgba(0,0,0,${0.1 + importance * 0.2})`,
              transform: `scale(${isSelected ? 1.15 : 1}) rotate(${(Math.random() - 0.5) * (importance < 0.5 ? 15 : 5)}deg)`,
              zIndex: isSelected ? 100 : Math.floor(importance * 30) + 10,
              opacity: isSelected ? 1 : 0.8 + importance * 0.2,
              filter: `drop-shadow(0 ${Math.floor(importance * 4) + 1}px ${Math.floor(importance * 8) + 2}px rgba(0,0,0,0.1))`,
              background: isSelected 
                ? 'rgba(255, 255, 255, 0.95)' 
                : `linear-gradient(135deg, rgba(255,255,255,${0.1 + importance * 0.3}) 0%, rgba(255,255,255,${0.05 + importance * 0.2}) 100%)`,
              backdropFilter: 'blur(2px)',
              border: isSelected ? '2px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255,255,255,0.3)'
            }}
            title={`${pos.word.word} (${pos.word.count}회 언급)`}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.transform = `scale(1.1) rotate(0deg)`
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.transform = `scale(1) rotate(${(Math.random() - 0.5) * (importance < 0.5 ? 15 : 5)}deg)`
              }
            }}
          >
            {pos.word.word}
          </button>
        )
      })}
      
      {/* 배경 장식 효과 */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-blue-200/20 to-purple-200/20 animate-pulse"
            style={{
              width: `${50 + Math.random() * 100}px`,
              height: `${50 + Math.random() * 100}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
      
      {/* 로딩 상태 */}
      {positions.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-white/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-600 font-medium">워드 클라우드 생성 중...</p>
            <p className="text-sm text-gray-500 mt-1">단어 배치를 최적화하고 있습니다</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HighlightAnalytics({ 
  onNavigateToHighlight, 
  onNavigateToConceptMap,
  onNavigateToCourses 
}: HighlightAnalyticsProps) {
  const { user } = useAuth()
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [selectedWordData, setSelectedWordData] = useState<WordFrequency | null>(null)
  const [minWordLength, setMinWordLength] = useState(2)
  const [showKeywordModal, setShowKeywordModal] = useState(false)
  const [clickedKeyword, setClickedKeyword] = useState<WordFrequency | null>(null)

  // 불용어 목록 (한국어 + 영어)
  const stopWords = new Set([
    // 한국어 불용어
    '이', '그', '저', '것', '거', '게', '를', '을', '가', '이', '에', '의', '와', '과', '는', '은', 
    '도', '만', '도', '까지', '부터', '보다', '처럼', '같이', '하지만', '그러나', '그런데', '따라서',
    '있다', '없다', '되다', '하다', '이다', '아니다', '같다', '다르다', '크다', '작다',
    '그것', '이것', '저것', '여기', '거기', '저기', '지금', '그때', '이때',
    '위', '아래', '앞', '뒤', '안', '밖', '속', '중', '간', '사이',
    '및', '또는', '그리고', '하지만', '그러므로', '따라서', '즉', '예를 들어',
    // 영어 불용어
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
    'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
  ])

  useEffect(() => {
    if (user) {
      loadAllData()
    }
  }, [user])

  const loadAllData = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // 문서 목록 로드
      const documentsResponse = await fetch(`/api/documents?user_id=${user.id}`)
      const documentsResult = await documentsResponse.json()
      
      if (documentsResponse.ok && documentsResult.data) {
        setDocuments(documentsResult.data)

        // 모든 문서의 하이라이트 로드
        const allHighlights: Highlight[] = []
        for (const doc of documentsResult.data) {
          try {
            const highlightsResponse = await fetch(`/api/highlights?document_id=${doc.id}&user_id=${user.id}`)
            const highlightsResult = await highlightsResponse.json()
            
            if (highlightsResponse.ok && highlightsResult.data) {
              const docHighlights = highlightsResult.data.map((h: any) => ({
                id: h.id,
                document_id: h.document_id,
                page_number: h.page_number,
                selected_text: h.selected_text,
                note: h.note || '',
                created_at: h.created_at
              }))
              allHighlights.push(...docHighlights)
            }
          } catch (error) {
            console.error(`하이라이트 로딩 실패 (${doc.id}):`, error)
          }
        }
        
        setHighlights(allHighlights)
        console.log('하이라이트 분석 데이터 로드 완료:', allHighlights.length, '개')
      }
    } catch (error) {
      console.error('데이터 로딩 중 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  // 단어 빈도 계산
  const wordFrequencies = useMemo(() => {
    const wordMap = new Map<string, WordFrequency>()
    
    highlights.forEach(highlight => {
      const document = documents.find(doc => doc.id === highlight.document_id)
      if (!document) return

      // 텍스트를 단어로 분리 (한국어, 영어, 숫자 지원)
      const words = highlight.selected_text
        .toLowerCase()
        .replace(/[^\w\s가-힣]/gi, ' ') // 특수문자 제거
        .split(/\s+/)
        .filter(word => 
          word.length >= minWordLength && 
          !stopWords.has(word) &&
          !/^\d+$/.test(word) // 순수 숫자 제외
        )

      words.forEach(word => {
        if (!wordMap.has(word)) {
          wordMap.set(word, {
            word,
            count: 0,
            highlights: []
          })
        }
        
        const wordData = wordMap.get(word)!
        wordData.count++
        wordData.highlights.push({
          id: highlight.id,
          document_id: highlight.document_id,
          document_title: document.title,
          page_number: highlight.page_number,
          text: highlight.selected_text,
          created_at: highlight.created_at
        })
      })
    })

    return Array.from(wordMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 100) // 상위 100개만
  }, [highlights, documents, minWordLength])

  const handleWordClick = (wordData: WordFrequency) => {
    setClickedKeyword(wordData)
    setShowKeywordModal(true)
    setSelectedWord(wordData.word)
    setSelectedWordData(wordData)
  }

  const handleHighlightClick = (highlight: any) => {
    if (onNavigateToHighlight) {
      onNavigateToHighlight(highlight.document_id, highlight.page_number, highlight.id)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">하이라이트 빈도 분석</h2>
          <p className="text-gray-600">하이라이트에서 추출한 키워드 분석을 로딩 중...</p>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (highlights.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">하이라이트 빈도 분석</h2>
          <p className="text-gray-600">하이라이트에서 추출한 키워드를 분석합니다</p>
        </div>
        
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="mb-4">
              <Hash className="mx-auto h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">하이라이트가 없습니다</h3>
            <p className="mt-2 text-sm text-gray-500">
              PDF 문서에서 텍스트를 하이라이트하면 키워드 분석을 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const maxCount = wordFrequencies[0]?.count || 1

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">하이라이트 빈도 분석</h2>
        <p className="text-gray-600">
          총 {highlights.length}개의 하이라이트에서 {wordFrequencies.length}개의 키워드를 분석했습니다
        </p>
      </div>

      {/* 필터 컨트롤 */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">최소 글자 수:</label>
            <select
              value={minWordLength}
              onChange={(e) => setMinWordLength(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1글자 이상</option>
              <option value={2}>2글자 이상</option>
              <option value={3}>3글자 이상</option>
              <option value={4}>4글자 이상</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <BarChart size={16} />
            <span>상위 {Math.min(wordFrequencies.length, 100)}개 키워드</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 워드 클라우드 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">키워드 클라우드</h3>
            
            {wordFrequencies.length > 0 ? (
              <WordCloudCanvas 
                words={wordFrequencies}
                maxCount={maxCount}
                selectedWord={selectedWord}
                onWordClick={handleWordClick}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                분석할 키워드가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* 선택된 단어 정보 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">키워드 상세 정보</h3>
            
            {selectedWordData ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xl font-bold text-blue-900">
                      "{selectedWordData.word}"
                    </h4>
                    <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                      {selectedWordData.count}회
                    </span>
                  </div>
                  <p className="text-sm text-blue-700">
                    {selectedWordData.highlights.length}개의 하이라이트에서 발견
                  </p>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedWordData.highlights.map((highlight, index) => (
                    <div 
                      key={`${highlight.id}-${index}`}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleHighlightClick(highlight)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <FileText size={14} />
                          <span className="font-medium truncate max-w-[150px]" title={highlight.document_title}>
                            {highlight.document_title}
                          </span>
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {highlight.page_number}페이지
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-800 line-clamp-2 mb-2">
                        {highlight.text}
                      </p>
                      
                      {highlight.created_at && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar size={12} className="mr-1" />
                          {new Date(highlight.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-end mt-2">
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Hash className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-gray-500 text-sm">
                  키워드를 클릭하면<br />상세 정보를 확인할 수 있습니다
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 통계 요약 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">분석 통계</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{highlights.length}</div>
            <div className="text-sm text-gray-600">총 하이라이트</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{wordFrequencies.length}</div>
            <div className="text-sm text-gray-600">고유 키워드</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{documents.length}</div>
            <div className="text-sm text-gray-600">분석된 문서</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {maxCount}
            </div>
            <div className="text-sm text-gray-600">최다 언급 횟수</div>
          </div>
        </div>
      </div>

      {/* 키워드 액션 모달 */}
      {showKeywordModal && clickedKeyword && (
        <KeywordActionModal
          keyword={clickedKeyword}
          onClose={() => {
            setShowKeywordModal(false)
            setClickedKeyword(null)
          }}
          onNavigateToHighlight={onNavigateToHighlight}
          onNavigateToConceptMap={onNavigateToConceptMap}
          onNavigateToCourses={onNavigateToCourses}
        />
      )}
    </div>
  )
}

// 키워드 액션 모달 컴포넌트
interface KeywordActionModalProps {
  keyword: WordFrequency
  onClose: () => void
  onNavigateToHighlight?: (documentId: string, pageNumber: number, highlightId: string) => void
  onNavigateToConceptMap?: () => void
  onNavigateToCourses?: (searchKeyword: string) => void
}

function KeywordActionModal({
  keyword,
  onClose,
  onNavigateToHighlight,
  onNavigateToConceptMap,
  onNavigateToCourses
}: KeywordActionModalProps) {
  const handleHighlightClick = (highlight: any) => {
    if (onNavigateToHighlight) {
      onNavigateToHighlight(highlight.document_id, highlight.page_number, highlight.id)
    }
    onClose()
  }

  const handleConceptMapClick = () => {
    if (onNavigateToConceptMap) {
      onNavigateToConceptMap()
    }
    onClose()
  }

  const handleCoursesClick = () => {
    if (onNavigateToCourses) {
      onNavigateToCourses(keyword.word)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* 모달 헤더 */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                키워드: "{keyword.word}"
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {keyword.count}회 언급됨 • {keyword.highlights.length}개 하이라이트
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* 액션 버튼들 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* 개념 연결맵으로 이동 */}
            <button
              onClick={handleConceptMapClick}
              className="flex flex-col items-center p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors group"
            >
              <MapPin className="w-8 h-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-gray-900">개념 연결맵</span>
              <span className="text-sm text-gray-600 text-center mt-1">
                키워드 관계를 시각화
              </span>
            </button>

            {/* 추천 강좌로 이동 */}
            <button
              onClick={handleCoursesClick}
              className="flex flex-col items-center p-4 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors group"
            >
              <Search className="w-8 h-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-gray-900">추천 강좌</span>
              <span className="text-sm text-gray-600 text-center mt-1">
                관련 강의 검색
              </span>
            </button>

            {/* 직접 하이라이트로 이동 (기존 기능) */}
            <button
              onClick={() => {
                if (keyword.highlights.length > 0) {
                  handleHighlightClick(keyword.highlights[0])
                }
              }}
              className="flex flex-col items-center p-4 border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors group"
            >
              <FileText className="w-8 h-8 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-gray-900">첫 번째 하이라이트</span>
              <span className="text-sm text-gray-600 text-center mt-1">
                PDF로 바로 이동
              </span>
            </button>
          </div>

          {/* 하이라이트 목록 */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">
              관련 하이라이트 ({keyword.highlights.length}개)
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {keyword.highlights.map((highlight, index) => (
                <div
                  key={highlight.id}
                  className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => handleHighlightClick(highlight)}
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {index + 1}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h5 className="text-sm font-medium text-gray-900 truncate">
                        {highlight.document_title}
                      </h5>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        {highlight.page_number}페이지
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {highlight.text}
                    </p>
                    {highlight.created_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(highlight.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          </div>

          {/* 닫기 버튼 */}
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}