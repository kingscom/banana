'use client'

import { useAuth } from './AuthProvider'
import LoginForm from './LoginForm'
import { useState, useEffect } from 'react'
import { BookOpen, Loader2 } from 'lucide-react'

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (!loading) {
      setIsTransitioning(true)
      const timer = setTimeout(() => {
        setShowContent(true)
        setIsTransitioning(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [loading, user])

  if (loading) {
    return (
      <div className="min-h-screen library-background flex items-center justify-center">
        <div className="text-center space-y-6">
          {/* Library-themed loading */}
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-600 to-amber-800 rounded-lg flex items-center justify-center shadow-xl">
              <BookOpen className="w-10 h-10 text-amber-100" />
            </div>
            <div className="absolute inset-0 animate-pulse">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg opacity-50"></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="library-title text-2xl">지식의 정원 열람 중...</h2>
            <div className="flex items-center justify-center space-x-2 library-text">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">도서관 준비 중</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const content = !user ? <LoginForm /> : children

  return (
    <div className="min-h-screen library-background">
      <div 
        className={`
          transition-all duration-500 ease-in-out
          ${isTransitioning ? 'page-turn-exit' : showContent ? 'page-turn-enter' : ''}
        `}
      >
        {content}
      </div>
    </div>
  )
}