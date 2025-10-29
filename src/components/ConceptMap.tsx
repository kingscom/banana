'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { Map, BookOpen, Link, FileText, Send } from 'lucide-react'
import { db } from '../lib/supabase'

interface LocalConcept {
  id: string
  name: string
  description: string
  position_x: number
  position_y: number
  connections: string[]
  similarity?: number
  page?: string
  chunk_index?: number
}

interface SimilarityData {
  chunk_index: number
  page: string
  source: string
  similarity: number
  keyword: string
}

interface Document {
  id: string
  title: string
  file_name: string
  created_at: string
}

export default function ConceptMap() {
  const { user } = useAuth()
  const [concepts, setConcepts] = useState<LocalConcept[]>([])
  const [loading, setLoading] = useState(true)
  
  // AI 요청 관련 상태
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<string>('')
  const [queryText, setQueryText] = useState('')
  const [requestCount, setRequestCount] = useState(10)
  const [isProcessing, setIsProcessing] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>('')

  useEffect(() => {
    if (user) {
      loadConcepts()
      loadDocuments()
    }
  }, [user])

  // 세션 스토리지에서 데이터 읽기
  useEffect(() => {
    if (typeof window !== 'undefined' && documents.length > 0) {
      const conceptMapDataStr = sessionStorage.getItem('conceptMapData')
      if (conceptMapDataStr) {
        try {
          const conceptMapData = JSON.parse(conceptMapDataStr)
          
          if (conceptMapData.documentId) {
            setSelectedDocument(conceptMapData.documentId)
          }
          
          if (conceptMapData.keyword) {
            setQueryText(`${conceptMapData.keyword}`)
          }
          
          // 데이터 사용 후 삭제
          sessionStorage.removeItem('conceptMapData')
        } catch (error) {
          console.error('세션 스토리지 데이터 파싱 실패:', error)
        }
      }
    }
  }, [documents]) // documents가 로드된 후에 실행

  const loadDocuments = async () => {
    try {
      if (!user?.id) return
      
      const documents = await db.getDocuments(user.id)
      setDocuments(documents || [])
    } catch (error) {
      console.error('문서 목록 로드 실패:', error)
    }
  }

  const loadConcepts = async () => {
    try {
      setLoading(true)
      
      // 기본 개념 제거 - 빈 상태로 시작
      setConcepts([])
    } catch (error) {
      console.error('개념 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocument(documentId)
  }

  const handleAIRequest = async () => {
    if (!queryText.trim() || !selectedDocument) {
      alert('문서를 선택하고 질의문을 입력해주세요.')
      return
    }

    setIsProcessing(true)
    
    try {
      // 키워드 추출 (질의문에서 핵심 키워드를 찾거나 기본값 사용)
      const keyword = extractKeywordFromQuery(queryText) || '개념'
      
      const requestData = {
        document_id: selectedDocument,
        keyword: keyword,
        max_chunks: requestCount // 요청 개수에 따른 청크 수 조정
      }

      console.log('FastAPI로 전송할 데이터:', requestData)
      
      // FastAPI 요청
      const res = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_BASE_URL}/concept-map`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      })

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()
      console.log('FastAPI 응답 데이터:', data)
      
      // 응답 데이터를 개념 맵 형태로 변환
      const newConcepts = processConceptMapData(data, requestCount)
      setConcepts(newConcepts)
      
      const selectedDoc = documents.find(doc => doc.id === selectedDocument)
      setSuccessMessage(`✅ 개념 연결맵 생성 완료! 📚 ${selectedDoc?.title || selectedDoc?.file_name} 🔍 키워드: ${keyword} 🎯 ${newConcepts.length}개 개념`)
      
      // 3초 후 성공 메시지 자동 제거
      setTimeout(() => setSuccessMessage(''), 3000)
      
    } catch (error) {
      console.error('AI 요청 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '네트워크 연결을 확인해주세요.'
      alert(`❌ AI 요청 중 오류가 발생했습니다.\n${errorMessage}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // 질의문에서 키워드 추출하는 헬퍼 함수
  const extractKeywordFromQuery = (query: string): string => {
    // 간단한 키워드 추출 로직
    const keywords = query.replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && !['개념', '연결', '관계', '분석', '핵심', '요소', '관련'].includes(word))
    
    return keywords[0] || '개념'
  }

  // FastAPI 응답 데이터를 개념 맵 형태로 변환하는 헬퍼 함수
  const processConceptMapData = (data: any, maxConcepts: number): LocalConcept[] => {
    try {
      // similarities 데이터가 있는 경우 벡터 형태로 처리
      if (data.similarities && Array.isArray(data.similarities)) {
        const similarities: SimilarityData[] = data.similarities
        
        // 전체 뷰포트 중심 (더 넓은 공간 활용)
        const centerX = 500
        const centerY = 350
        
        // similarity를 벡터 길이로 사용 (역비례: 높은 similarity = 가까운 거리)
        const processedConcepts = similarities.slice(0, maxConcepts).map((item, index) => {
          const angle = (index * 2 * Math.PI) / Math.min(similarities.length, maxConcepts)
          
          // similarity를 거리로 역변환 (높은 similarity = 짧은 거리)
          const minSimilarity = 0.75
          const maxSimilarity = 1.0
          const minRadius = 150  // 가장 가까운 거리 (높은 similarity)
          const maxRadius = 450  // 가장 먼 거리 (낮은 similarity)
          
          // 역비례 계산: similarity가 높을수록 짧은 거리
          const normalizedSimilarity = (item.similarity - minSimilarity) / (maxSimilarity - minSimilarity)
          const radius = maxRadius - (normalizedSimilarity * (maxRadius - minRadius))
          
          const x = centerX + Math.cos(angle) * radius
          const y = centerY + Math.sin(angle) * radius
          
          return {
            id: `chunk-${item.chunk_index}`,
            name: `Chunk ${item.chunk_index}`,
            description: `Page ${item.page} | Similarity: ${(item.similarity * 100).toFixed(1)}%`,
            position_x: Math.max(30, Math.min(970, x)),
            position_y: Math.max(30, Math.min(670, y)),
            connections: [],
            similarity: item.similarity,
            page: item.page,
            chunk_index: item.chunk_index
          }
        })
        
        return processedConcepts
      }
      
      // 기존 데이터 구조 처리 (nodes/concepts)
      let concepts: any[] = []
      
      if (data.concepts && Array.isArray(data.concepts)) {
        concepts = data.concepts
      } else if (data.nodes && Array.isArray(data.nodes)) {
        concepts = data.nodes
      } else if (Array.isArray(data)) {
        concepts = data
      } else {
        console.warn('예상치 못한 데이터 구조:', data)
        return []
      }

      // 개념들을 원형으로 배치
      const centerX = 400
      const centerY = 300
      const radius = 200
      const angleStep = (2 * Math.PI) / Math.min(concepts.length, maxConcepts)

      const processedConcepts = concepts.slice(0, maxConcepts).map((concept, index) => {
        const angle = index * angleStep
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius

        return {
          id: concept.id || `concept-${index}`,
          name: concept.name || concept.title || concept.concept || `개념 ${index + 1}`,
          description: concept.description || concept.summary || concept.content || '관련 개념',
          position_x: Math.max(50, Math.min(750, x)),
          position_y: Math.max(50, Math.min(550, y)),
          connections: concept.connections || concept.related || []
        }
      })

      // 연결 관계가 없는 경우 자동으로 생성
      if (processedConcepts.length > 1) {
        processedConcepts.forEach((concept, index) => {
          if (concept.connections.length === 0) {
            // 인접한 개념들과 연결
            const nextIndex = (index + 1) % processedConcepts.length
            const prevIndex = (index - 1 + processedConcepts.length) % processedConcepts.length
            
            concept.connections = [
              processedConcepts[nextIndex].id,
              ...(processedConcepts.length > 2 ? [processedConcepts[prevIndex].id] : [])
            ]
          }
        })
      }

      return processedConcepts
    } catch (error) {
      console.error('데이터 처리 중 오류:', error)
      return []
    }
  }

  if (loading) {
    return (
      <div className="h-screen library-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center mx-auto shadow-lg animate-pulse">
            <Map className="w-8 h-8 text-amber-50" />
          </div>
          <h2 className="library-title text-xl">지식 연결망 로딩 중...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex library-background book-open-animation">
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 p-6">
          <div className="book-card rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Map className="w-6 h-6 text-purple-50" />
                </div>
                <div>
                  <h2 className="library-title text-2xl">🧠 AI 개념 연결망 생성</h2>
                  <p className="library-text opacity-70 text-sm">문서를 분석하여 지식의 연결 관계를 시각화합니다</p>
                </div>
              </div>
            </div>

            {/* AI 요청 섹션 */}
            <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-2xl py-2.5 px-8 border border-blue-100/50 shadow-lg backdrop-blur-sm">

              {/* 성공 메시지 */}
              {successMessage && (
                <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-green-800">{successMessage}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col lg:flex-row gap-6 h-20">
                {/* 문서 선택 - 25% */}
                <div className="lg:w-[25%] space-y-2 h-full">
                  <label className="block text-sm font-bold text-gray-800 flex items-center space-x-2">
                    <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span>📚 문서 선택</span>
                  </label>
                  
                  <div className="h-full flex flex-col">
                    {documents.length === 0 ? (
                      <div className="h-12 bg-white rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <FileText className="w-4 h-4 mx-auto mb-1 opacity-50" />
                          <p className="text-xs font-medium text-gray-600">문서 없음</p>
                        </div>
                      </div>
                    ) : (
                      <select
                        value={selectedDocument}
                        onChange={(e) => handleDocumentSelect(e.target.value)}
                        className="w-full h-12 p-2 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm shadow-sm transition-all duration-200"
                      >
                        <option value="">문서를 선택하세요</option>
                        {documents.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.title || doc.file_name}
                          </option>
                        ))}
                      </select>
                    )}
                    
                  </div>
                </div>

                {/* 질의문 입력 - 40% */}
                <div className="lg:w-[40%] space-y-2 h-full">
                  <label className="block text-sm font-bold text-gray-800 flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <span>💬 질의문</span>
                  </label>
                  
                  <div className="relative">
                    <textarea
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      placeholder="어떤 개념들의 연결 관계를 분석하고 싶나요?&#10;예: '머신러닝과 딥러닝의 핵심 개념', '마케팅 전략의 주요 요소들'"
                      className="w-full h-12 p-2 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm leading-4 transition-all duration-200 shadow-sm overflow-hidden"
                      maxLength={50}
                      rows={2}
                    />
                    <div className="absolute bottom-2 right-2 flex items-center space-x-2">
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        queryText.length > 450 ? 'bg-red-100 text-red-600' :
                        queryText.length > 300 ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {queryText.length}/50
                      </div>
                    </div>
                  </div>
                  
                </div>

                {/* 개념 개수 - 15% */}
                <div className="lg:w-[15%] space-y-2 h-full">
                  <label className="block text-sm font-bold text-gray-800 flex items-center space-x-2">
                    <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                      </svg>
                    </div>
                    <span>🔢 개념 개수</span>
                  </label>
                  
                  <select
                    value={requestCount}
                    onChange={(e) => setRequestCount(Number(e.target.value))}
                    className="w-full h-12 p-2 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-medium shadow-sm transition-all duration-200"
                  >
                    <option value={3}>🔸 3개</option>
                    <option value={5}>🔹 5개</option>
                    <option value={8}>🔶 8개</option>
                    <option value={10}>🔷 10개</option>
                    <option value={15}>💎 15개</option>
                  </select>
                </div>

                {/* AI 요청 버튼 - 20% */}
                <div className="lg:w-[20%] space-y-2 h-full flex flex-col">
                  <label className="block text-sm font-bold text-gray-800 flex items-center space-x-2">
                    <div className="w-6 h-6 bg-pink-100 rounded-lg flex items-center justify-center">
                      <Send className="w-3 h-3 text-pink-600" />
                    </div>
                    <span>🚀 실행</span>
                  </label>

                  <div className="flex-1 flex items-center" style={{marginTop: 0}}>
                    <button
                      onClick={handleAIRequest}
                      disabled={!queryText.trim() || !selectedDocument || isProcessing}
                      className={`w-full h-12 px-3 py-1 rounded-xl font-bold text-xs transition-all duration-300 flex items-center justify-center space-x-2 ${
                        !queryText.trim() || !selectedDocument || isProcessing
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                          : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-transparent'
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>분석 중...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>🤖 AI 요청</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 모바일용 요약 정보 */}
              {selectedDocument && queryText.trim() && (
                <div className="lg:hidden bg-gradient-to-r from-emerald-50 to-blue-50 p-3 rounded-xl border border-emerald-200 mt-4">
                  <p className="text-xs font-bold text-gray-700 mb-2">📋 요청 준비</p>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p>• 문서: 선택됨</p>
                    <p>• 개념: {requestCount}개</p>
                    <p>• 질의: {queryText.length}자</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 빈 상태 메시지 */}
          {!loading && concepts.length === 0 && (
            <div className="text-center max-w-md mx-auto py-8">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Map className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="library-title text-xl text-gray-600 mb-3">조회된 데이터가 없습니다</h3>
              <p className="library-text text-sm text-gray-500 leading-relaxed mb-4">
                문서를 선택하고 질의문을 입력한 후<br />
                AI 요청 버튼을 클릭하여<br />
                개념 연결망을 생성해보세요
              </p>
              <div className="flex items-center justify-center space-x-2 text-gray-400">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse delay-200"></div>
              </div>
            </div>
          )}

          {/* 개념 맵 영역 - 로딩이 완료되고 개념이 있을 때만 표시 */}
          {!loading && concepts.length > 0 && (
            <div className="relative h-full">
              <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
                <defs>
                  <linearGradient id="vectorGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8" />
                  </linearGradient>
                  <radialGradient id="centralGradient">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                    <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
                  </radialGradient>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#8b5cf6" />
                  </marker>
                </defs>
                
                {/* 중앙 노드 - 전체 페이지를 커버하는 큰 원 */}
                <circle cx="500" cy="350" r="100" fill="url(#centralGradient)" />
                <circle cx="500" cy="350" r="60" fill="#8b5cf6" opacity="0.2" />
                <circle cx="500" cy="350" r="40" fill="#8b5cf6" opacity="0.4" />
                <circle cx="500" cy="350" r="20" fill="#8b5cf6" opacity="0.6" />
                <circle cx="500" cy="350" r="10" fill="#8b5cf6" opacity="0.8" />
                
                {/* 중앙 텍스트 - 검색어 표시 */}
                <text
                  x="500"
                  y="345"
                  fontSize="16"
                  fill="#6b21a8"
                  textAnchor="middle"
                  fontWeight="700"
                >
                  {queryText || '검색 키워드'}
                </text>
                <text
                  x="500"
                  y="365"
                  fontSize="12"
                  fill="#9333ea"
                  textAnchor="middle"
                  fontWeight="500"
                >
                  Vector Similarity Map
                </text>
                
                {/* 벡터 선 - 중앙에서 각 노드로 */}
                {concepts.map((concept) => {
                  const targetX = concept.position_x + 72
                  const targetY = concept.position_y + 40
                  
                  // similarity 값에 따른 선 굵기 (높을수록 굵음)
                  const strokeWidth = concept.similarity 
                    ? 1 + (concept.similarity - 0.75) * 16
                    : 3
                  
                  // similarity 값에 따른 색상 투명도
                  const opacity = concept.similarity 
                    ? 0.4 + (concept.similarity - 0.75) * 2
                    : 0.6
                  
                  // 선의 중간 지점 계산
                  const midX = (500 + targetX) / 2
                  const midY = (350 + targetY) / 2
                  
                  // 거리 계산
                  const distance = Math.sqrt(Math.pow(targetX - 500, 2) + Math.pow(targetY - 350, 2))
                  
                  return (
                    <g key={concept.id}>
                      {/* 벡터 선 */}
                      <line
                        x1="500"
                        y1="350"
                        x2={targetX}
                        y2={targetY}
                        stroke="url(#vectorGradient)"
                        strokeWidth={strokeWidth}
                        opacity={opacity}
                        markerEnd="url(#arrowhead)"
                      />
                      
                      {/* similarity 값 표시 (배경) */}
                      {concept.similarity && (
                        <>
                          <rect
                            x={midX - 28}
                            y={midY - 14}
                            width="56"
                            height="20"
                            rx="10"
                            fill="white"
                            opacity="0.9"
                            stroke="#8b5cf6"
                            strokeWidth="1.5"
                          />
                          <text
                            x={midX}
                            y={midY}
                            fontSize="11"
                            fill="#6b21a8"
                            textAnchor="middle"
                            fontWeight="700"
                            dominantBaseline="middle"
                          >
                            {(concept.similarity * 100).toFixed(1)}%
                          </text>
                        </>
                      )}
                      
                      {/* 거리 표시 (선 시작 부분) */}
                      {concept.similarity && (
                        <text
                          x={500 + (targetX - 500) * 0.2}
                          y={350 + (targetY - 350) * 0.2}
                          fontSize="9"
                          fill="#9ca3af"
                          textAnchor="middle"
                          fontWeight="500"
                          opacity="0.7"
                        >
                          {Math.round(distance)}px
                        </text>
                      )}
                    </g>
                  )
                })}
                
                {/* 기존 연결선 (connections가 있는 경우) */}
                {concepts.map((concept) =>
                  concept.connections?.map((connectionId) => {
                    const targetConcept = concepts.find(c => c.id === connectionId)
                    if (!targetConcept) return null
                    
                    return (
                      <line
                        key={`${concept.id}-${connectionId}`}
                        x1={concept.position_x + 60}
                        y1={concept.position_y + 30}
                        x2={targetConcept.position_x + 60}
                        y2={targetConcept.position_y + 30}
                        stroke="#f59e0b"
                        strokeWidth="2"
                        strokeDasharray="4,4"
                        opacity="0.4"
                      />
                    )
                  })
                )}
              </svg>

              <div className="relative" style={{ zIndex: 2 }}>
                {concepts.map((concept, index) => {
                  // similarity 값에 따른 색상 선택
                  const getSimilarityColor = (similarity?: number) => {
                    if (!similarity) return index % 4
                    if (similarity >= 0.85) return 0 // blue
                    if (similarity >= 0.82) return 1 // green
                    if (similarity >= 0.80) return 2 // purple
                    return 3 // orange
                  }
                  
                  const colorIndex = getSimilarityColor(concept.similarity)
                  
                  return (
                    <div
                      key={concept.id}
                      className="absolute w-36 book-card cursor-pointer transition-all duration-300 hover:scale-105 rounded-xl p-4 hover:shadow-lg"
                      style={{ left: concept.position_x, top: concept.position_y }}
                    >
                      <div className="flex items-start space-x-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          colorIndex === 0 ? 'bg-blue-100' :
                          colorIndex === 1 ? 'bg-green-100' :
                          colorIndex === 2 ? 'bg-purple-100' : 'bg-orange-100'
                        }`}>
                          <BookOpen className={`w-4 h-4 ${
                            colorIndex === 0 ? 'text-blue-600' :
                            colorIndex === 1 ? 'text-green-600' :
                            colorIndex === 2 ? 'text-purple-600' : 'text-orange-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="library-title text-sm font-semibold mb-1 leading-tight">
                            {concept.name}
                          </h3>
                          <p className="library-text text-xs opacity-70 line-clamp-3">
                            {concept.description}
                          </p>
                        </div>
                      </div>
                      
                      {/* similarity 정보 또는 connections 표시 */}
                      {concept.similarity ? (
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <div className={`w-2 h-2 rounded-full ${
                              concept.similarity >= 0.85 ? 'bg-blue-500' :
                              concept.similarity >= 0.82 ? 'bg-green-500' :
                              concept.similarity >= 0.80 ? 'bg-purple-500' : 'bg-orange-500'
                            }`}></div>
                            <span className="text-xs library-text font-semibold">
                              {(concept.similarity * 100).toFixed(1)}%
                            </span>
                          </div>
                          {concept.page && (
                            <span className="text-xs library-text opacity-60">
                              p.{concept.page}
                            </span>
                          )}
                        </div>
                      ) : concept.connections && concept.connections.length > 0 && (
                        <div className="mt-2 flex items-center space-x-1">
                          <Link className="w-3 h-3 text-amber-600" />
                          <span className="text-xs library-text opacity-60">
                            {concept.connections.length}개 연결
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}