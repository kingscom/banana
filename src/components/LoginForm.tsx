'use client'

import { useAuth } from './AuthProvider'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Library, Key, Sparkles, ArrowRight } from 'lucide-react'

export default function LoginForm() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsVisible(true)
  }, [])

  // 이미 로그인된 사용자는 대시보드로 리디렉트 (로딩 완료 후)
  useEffect(() => {
    if (user && !authLoading) {
      console.log('🔄 User already logged in, redirecting to dashboard...')
      // replace 사용으로 히스토리 스택 오염 방지
      router.replace('/dashboard')
    }
  }, [user, authLoading, router])

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Login failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen library-background flex items-center justify-center p-4">
      {/* Floating books decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 animate-bounce delay-100">
          <BookOpen className="w-8 h-8 text-amber-600 opacity-20" />
        </div>
        <div className="absolute top-40 right-20 animate-bounce delay-300">
          <Library className="w-6 h-6 text-amber-700 opacity-15" />
        </div>
        <div className="absolute bottom-32 left-1/4 animate-bounce delay-500">
          <BookOpen className="w-7 h-7 text-amber-500 opacity-25" />
        </div>
        <div className="absolute bottom-48 right-1/3 animate-bounce delay-700">
          <Sparkles className="w-5 h-5 text-amber-600 opacity-20" />
        </div>
      </div>

      <div className={`
        relative max-w-md w-full
        transition-all duration-700 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}>
        {/* Main login card */}
        <div className="book-card p-8 rounded-2xl relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-2 library-shelf"></div>
          <div className="absolute -top-1 -left-1 w-4 h-4 bg-amber-600 rounded-full shadow-md"></div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-600 rounded-full shadow-md"></div>

          {/* Header */}
          <div className="text-center mb-8 space-y-4">
            {/* Library logo */}
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-600 to-amber-800 rounded-xl flex items-center justify-center shadow-xl mb-6 book-open-animation">
              <Library className="w-10 h-10 text-amber-50" />
            </div>

            <div className="space-y-2">
              <h1 className="library-title text-4xl mb-2">
                지식의 정원
              </h1>
              <p className="text-lg library-accent-text font-medium">
                AI Knowledge Library
              </p>
              <p className="library-text text-sm opacity-80">
                인공지능과 함께하는 개인 도서관에 입장하세요
              </p>
            </div>
          </div>

          {/* Features preview */}
          <div className="mb-8 space-y-3">
            <div className="flex items-center space-x-3 text-sm library-text opacity-80">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span>PDF 문서 업로드 및 AI 분석</span>
            </div>
            <div className="flex items-center space-x-3 text-sm library-text opacity-80">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span>스마트 하이라이팅 및 노트 작성</span>
            </div>
            <div className="flex items-center space-x-3 text-sm library-text opacity-80">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span>개념 연결맵 자동 생성</span>
            </div>
          </div>
          
          {/* Login button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full library-fab text-white font-medium py-4 px-6 rounded-xl flex items-center justify-center space-x-3 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>도서관 입장 중...</span>
              </>
            ) : (
              <>
                <Key className="w-5 h-5" />
                <span>Google로 입장하기</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>

          {/* Footer text */}
          <div className="mt-6 text-center">
            <p className="text-xs library-text opacity-60">
              개인 정보는 안전하게 보호됩니다
            </p>
          </div>
        </div>

        {/* Decorative shelf */}
        <div className="mt-4 h-3 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 rounded-full shadow-lg"></div>
      </div>
    </div>
  )
}