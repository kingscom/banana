'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { db } from '@/lib/supabase'
import type { Concept as DBConcept, ConceptConnection } from '@/lib/supabase'

interface LocalConcept {
  id: string
  user_id: string
  name: string
  description: string
  position_x: number
  position_y: number
  created_at: string
  updated_at: string
  connections: string[]
}

export default function ConceptMap() {
  const { user } = useAuth()
  const [concepts, setConcepts] = useState<LocalConcept[]>([])
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load concepts and connections from database
  useEffect(() => {
    if (user) {
      loadConcepts()
    }
  }, [user])

  const loadConcepts = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      // 데모 사용자인 경우 기본 개념들 제공
      if (user.id.startsWith('demo-user-')) {
        const demoConcepts: LocalConcept[] = [
          {
            id: '1',
            user_id: user.id,
            name: 'AI 학습',
            description: '인공지능 기반 문서 학습',
            position_x: 200,
            position_y: 150,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            connections: ['2', '3']
          },
          {
            id: '2',
            user_id: user.id,
            name: 'PDF 처리',
            description: '문서 업로드 및 분석',
            position_x: 400,
            position_y: 100,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            connections: ['1', '4']
          },
          {
            id: '3',
            user_id: user.id,
            name: '요약 기능',
            description: 'AI 기반 자동 요약',
            position_x: 100,
            position_y: 300,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            connections: ['1', '4']
          },
          {
            id: '4',
            user_id: user.id,
            name: '하이라이트',
            description: '중요 부분 표시 및 노트',
            position_x: 400,
            position_y: 300,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            connections: ['2', '3']
          }
        ]
        setConcepts(demoConcepts)
        return
      }
      
      const [conceptsData, connectionsData] = await Promise.all([
        db.getConcepts(user.id),
        db.getConceptConnections(user.id)
      ])

      // Map connections to concepts
      const conceptsWithConnections: LocalConcept[] = (conceptsData || []).map(concept => ({
        ...concept,
        connections: (connectionsData || [])
          .filter(conn => conn.from_concept_id === concept.id)
          .map(conn => conn.to_concept_id)
      }))

      setConcepts(conceptsWithConnections)
    } catch (error) {
      console.error('Error loading concepts:', error)
      setConcepts([])
    } finally {
      setLoading(false)
    }
  }

  const createConcept = async (conceptData: Omit<LocalConcept, 'id' | 'created_at' | 'updated_at' | 'connections'>) => {
    if (!user) return
    
    try {
      const newConcept = await db.createConcept(conceptData)
      setConcepts(prev => [...prev, { ...newConcept, connections: [] }])
    } catch (error) {
      console.error('Error creating concept:', error)
    }
  }

  const updateConcept = async (id: string, updates: Partial<LocalConcept>) => {
    if (!user) return
    
    try {
      const updatedConcept = await db.updateConcept(id, updates)
      setConcepts(prev => prev.map(c => 
        c.id === id ? { ...c, ...updatedConcept } : c
      ))
    } catch (error) {
      console.error('Error updating concept:', error)
    }
  }

  const deleteConcept = async (id: string) => {
    if (!user) return
    
    try {
      await db.deleteConcept(id)
      setConcepts(prev => prev.filter(c => c.id !== id))
    } catch (error) {
      console.error('Error deleting concept:', error)
    }
  }

  const addConnection = async (fromId: string, toId: string) => {
    if (!user) return
    
    try {
      await db.createConceptConnection({
        user_id: user.id,
        from_concept_id: fromId,
        to_concept_id: toId
      })
      
      // Update local state
      setConcepts(prev => prev.map(c => 
        c.id === fromId 
          ? { ...c, connections: [...c.connections, toId] }
          : c
      ))
    } catch (error) {
      console.error('Error adding connection:', error)
    }
  }

  const removeConnection = async (fromId: string, toId: string) => {
    if (!user) return
    
    try {
      await db.deleteConceptConnection(fromId, toId)
      
      // Update local state
      setConcepts(prev => prev.map(c => 
        c.id === fromId 
          ? { ...c, connections: c.connections.filter(id => id !== toId) }
          : c
      ))
    } catch (error) {
      console.error('Error removing connection:', error)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex">
      {/* Concept Map Canvas */}
      <div className="flex-1 relative bg-gray-50 overflow-hidden">
        <div className="absolute inset-0 p-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">개념 연결맵</h2>
          
          {/* SVG Canvas for connections */}
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
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
                    stroke="#e5e7eb"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                )
              })
            )}
          </svg>

          {/* Concept Nodes */}
          <div className="relative" style={{ zIndex: 2 }}>
            {concepts.map((concept) => (
              <div
                key={concept.id}
                className={`absolute w-32 p-3 bg-white rounded-lg shadow-md border-2 cursor-pointer transition-all hover:shadow-lg ${
                  selectedConcept === concept.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
                style={{ left: concept.position_x, top: concept.position_y }}
                onClick={() => setSelectedConcept(concept.id)}
              >
                <h3 className="font-semibold text-sm text-gray-900 mb-1">
                  {concept.name}
                </h3>
                <p className="text-xs text-gray-600">
                  {concept.description}
                </p>
              </div>
            ))}
          </div>

          {/* Add New Concept Button */}
          <button
            className="absolute bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            onClick={() => {
              if (user) {
                createConcept({
                  user_id: user.id,
                  name: '새 개념',
                  description: '설명을 입력하세요',
                  position_x: Math.random() * 400 + 100,
                  position_y: Math.random() * 300 + 100,
                })
              }
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sidebar for Concept Details */}
      {selectedConcept && (
        <div className="w-80 bg-white border-l p-4 overflow-y-auto">
          {(() => {
            const concept = concepts.find(c => c.id === selectedConcept)
            if (!concept) return null
            
            return (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">개념 상세</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      개념명
                    </label>
                    <input
                      type="text"
                      value={concept.name}
                      onChange={(e) => {
                        const newName = e.target.value
                        setConcepts(prev => prev.map(c => 
                          c.id === selectedConcept 
                            ? { ...c, name: newName }
                            : c
                        ))
                        updateConcept(selectedConcept, { name: newName })
                      }}
                      className="w-full p-2 border rounded-md text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      설명
                    </label>
                    <textarea
                      value={concept.description}
                      onChange={(e) => {
                        const newDescription = e.target.value
                        setConcepts(prev => prev.map(c => 
                          c.id === selectedConcept 
                            ? { ...c, description: newDescription }
                            : c
                        ))
                        updateConcept(selectedConcept, { description: newDescription })
                      }}
                      className="w-full p-2 border rounded-md text-sm"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      연결된 개념
                    </label>
                    <div className="space-y-2">
                      {concept.connections.map((connId) => {
                        const connectedConcept = concepts.find(c => c.id === connId)
                        return connectedConcept ? (
                          <div key={connId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-900">
                              {connectedConcept.name}
                            </span>
                            <button
                              onClick={() => {
                                removeConnection(selectedConcept, connId)
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : null
                      })}
                      
                      {concept.connections.length === 0 && (
                        <p className="text-sm text-gray-500">연결된 개념이 없습니다.</p>
                      )}
                    </div>
                    
                    <select
                      className="w-full mt-2 p-2 border rounded-md text-sm"
                      onChange={(e) => {
                        const targetId = e.target.value
                        if (targetId && !concept.connections.includes(targetId)) {
                          addConnection(selectedConcept, targetId)
                        }
                        e.target.value = ''
                      }}
                    >
                      <option value="">개념 연결 추가...</option>
                      {concepts
                        .filter(c => c.id !== selectedConcept && !concept.connections.includes(c.id))
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))
                      }
                    </select>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <button
                      onClick={() => {
                        if (selectedConcept) {
                          deleteConcept(selectedConcept)
                          setSelectedConcept(null)
                        }
                      }}
                      className="w-full bg-red-500 text-white py-2 rounded-md text-sm hover:bg-red-600"
                    >
                      개념 삭제
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}