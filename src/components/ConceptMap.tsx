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
            setQueryText(`${conceptMapData.keyword} 관련 개념들의 연결 관계 분석`)
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
      
      const demoConcepts: LocalConcept[] = [
        {
          id: '1',
          name: 'AI 학습',
          description: '인공지능 기반 문서 학습',
          position_x: 200,
          position_y: 150,
          connections: ['2', '3']
        },
        {
          id: '2',
          name: 'PDF 처리',
          description: '문서 업로드 및 분석',
          position_x: 400,
          position_y: 100,
          connections: ['1', '4']
        },
        {
          id: '3',
          name: '요약 기능',
          description: 'AI 기반 자동 요약',
          position_x: 100,
          position_y: 300,
          connections: ['1', '4']
        },
        {
          id: '4',
          name: '하이라이트',
          description: '중요 부분 표시 및 노트',
          position_x: 400,
          position_y: 300,
          connections: ['2', '3']
        }
      ]
      setConcepts(demoConcepts)
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
      const requestData = {
        documents: [selectedDocument],
        query: queryText,
        count: requestCount
      }

      console.log('FastAPI로 전송할 데이터:', requestData)
      
      // FastAPI 요청 (실제 구현 시 사용)
      // const response = await fetch('http://localhost:8000/api/concept-map', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(requestData)
      // })
      
      // 임시 처리 - 실제로는 FastAPI 응답을 처리
      setTimeout(() => {
        const selectedDoc = documents.find(doc => doc.id === selectedDocument)
        alert(`요청 완료!\n선택된 문서: ${selectedDoc?.title || selectedDoc?.file_name}\n질의문: ${queryText}\n요청 개수: ${requestCount}개`)
        setIsProcessing(false)
      }, 2000)
      
    } catch (error) {
      console.error('AI 요청 실패:', error)
      alert('AI 요청 중 오류가 발생했습니다.')
      setIsProcessing(false)
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
                  <h2 className="library-title text-2xl">지식 연결망</h2>
                  <p className="library-text opacity-70 text-sm">개념 간의 관계를 시각화하여 학습 효과를 높여보세요</p>
                </div>
              </div>
            </div>

            {/* AI 요청 섹션 */}
            <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-2xl p-8 border border-blue-100/50 shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                    <Send className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="library-title text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      🧠 AI 개념 연결망 생성
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">문서를 분석하여 지식의 연결 관계를 시각화합니다</p>
                  </div>
                </div>
                
                {selectedDocument && queryText.trim() && (
                  <div className="hidden lg:block">
                    <div className="bg-gradient-to-r from-emerald-50 to-blue-50 px-4 py-2 rounded-full border border-emerald-200">
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className="text-gray-700">문서 선택됨</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-gray-700">개념 {requestCount}개</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span className="text-gray-700">{queryText.length}자</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 h-36">
                {/* 문서 선택 - 20% */}
                <div className="lg:col-span-2 space-y-4 h-full">
                  <label className="block text-sm font-bold text-gray-800 flex items-center space-x-2">
                    <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span>📚 문서 선택</span>
                  </label>
                  
                  <div className="h-full flex flex-col">
                    {documents.length === 0 ? (
                      <div className="flex-1 bg-white rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-center">
                        <div className="text-center py-4 text-gray-500">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-xs font-medium text-gray-600">문서 없음</p>
                          <p className="text-xs text-gray-500">PDF 업로드 필요</p>
                        </div>
                      </div>
                    ) : (
                      <select
                        value={selectedDocument}
                        onChange={(e) => handleDocumentSelect(e.target.value)}
                        className="w-full h-24 p-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm shadow-sm transition-all duration-200"
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

                {/* 질의문 입력 - 60% */}
                <div className="lg:col-span-6 space-y-4 h-full">
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
                      className="w-full h-24 p-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm leading-5 transition-all duration-200 shadow-sm overflow-hidden"
                      maxLength={500}
                      rows={3}
                    />
                    <div className="absolute bottom-2 right-2 flex items-center space-x-2">
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        queryText.length > 450 ? 'bg-red-100 text-red-600' :
                        queryText.length > 300 ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {queryText.length}/500
                      </div>
                    </div>
                  </div>
                  
                </div>

                {/* 설정 및 실행 버튼 - 20% */}
                <div className="lg:col-span-2 h-full flex flex-col">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 flex items-center space-x-2 mb-2">
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
                      className="mt-3 w-full h-10 pl-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-medium shadow-sm transition-all duration-200 mb-1"
                    >
                      <option value={3}>🔸 3개</option>
                      <option value={5}>🔹 5개</option>
                      <option value={8}>🔶 8개</option>
                      <option value={10}>🔷 10개</option>
                      <option value={15}>💎 15개</option>
                    </select>
                  </div>

                  <div className="relative">
                    <button
                      onClick={handleAIRequest}
                      disabled={!queryText.trim() || !selectedDocument || isProcessing}
                      className={`w-full h-10 px-4 py-2 rounded-xl font-bold text-xs transition-all duration-300 flex items-center justify-center space-x-2 ${
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
                          <Send className="w-3 h-3" />
                          <span>🤖 AI 요청</span>
                        </>
                      )}
                    </button>
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
            </div>
          </div>

          <div className="relative h-full">
            <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
              <defs>
                <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#d97706" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#92400e" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              {concepts.map((concept) =>
                concept.connections.map((connectionId) => {
                  const targetConcept = concepts.find(c => c.id === connectionId)
                  if (!targetConcept) return null
                  
                  return (
                    <line
                      key={`${concept.id}-${connectionId}`}
                      x1={concept.position_x + 60}
                      y1={concept.position_y + 30}
                      x2={targetConcept.position_x + 60}
                      y2={targetConcept.position_y + 30}
                      stroke="url(#connectionGradient)"
                      strokeWidth="3"
                      strokeDasharray="8,4"
                    />
                  )
                })
              )}
            </svg>

            <div className="relative" style={{ zIndex: 2 }}>
              {concepts.map((concept, index) => (
                <div
                  key={concept.id}
                  className="absolute w-36 book-card cursor-pointer transition-all duration-300 hover:scale-105 rounded-xl p-4 hover:shadow-lg"
                  style={{ left: concept.position_x, top: concept.position_y }}
                >
                  <div className="flex items-start space-x-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      index % 4 === 0 ? 'bg-blue-100' :
                      index % 4 === 1 ? 'bg-green-100' :
                      index % 4 === 2 ? 'bg-purple-100' : 'bg-orange-100'
                    }`}>
                      <BookOpen className={`w-4 h-4 ${
                        index % 4 === 0 ? 'text-blue-600' :
                        index % 4 === 1 ? 'text-green-600' :
                        index % 4 === 2 ? 'text-purple-600' : 'text-orange-600'
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
                  
                  {concept.connections.length > 0 && (
                    <div className="mt-2 flex items-center space-x-1">
                      <Link className="w-3 h-3 text-amber-600" />
                      <span className="text-xs library-text opacity-60">
                        {concept.connections.length}개 연결
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}