'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { Map, BookOpen, Link } from 'lucide-react'

interface LocalConcept {
  id: string
  name: string
  description: string
  position_x: number
  position_y: number
  connections: string[]
}

export default function ConceptMap() {
  const { user } = useAuth()
  const [concepts, setConcepts] = useState<LocalConcept[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadConcepts()
    }
  }, [user])

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