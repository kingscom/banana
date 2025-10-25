'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string
  display_name: string | null
  department: string | null
  avatar_url: string | null
  provider: string
  is_profile_completed: boolean
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  needsProfileSetup: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshUserProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  needsProfileSetup: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshUserProfile: async () => {}
})

export const useAuth = () => useContext(AuthContext)

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await loadUserProfile(session.user.id)
      }
      
      setLoading(false)
    }

    init()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // 중요한 이벤트만 로깅
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          console.log('� Auth event:', event)
        }
        
        setUser(session?.user ?? null)
        setLoading(false)

        // 로그인 시 사용자 프로필 로드 (단, 로그아웃 중이 아니고 프로필이 없을 때만)
        if (event === 'SIGNED_IN' && session?.user && !isSigningOut && !userProfile) {
          await loadUserProfile(session.user.id)
        } else if (event === 'SIGNED_OUT' || (!session && user)) {
          setUserProfile(null)
          setNeedsProfileSetup(false)
          setLoading(false)
          
          // 로그아웃 플래그 초기화
          setIsSigningOut(false)
          
          // 로그아웃 시에만 리디렉트 (현재 대시보드에 있을 때)
          if (window.location.pathname.startsWith('/dashboard')) {
            console.log('🏠 Redirecting from dashboard to home...')
            window.location.replace('/')
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        setNeedsProfileSetup(true)
      }
      return
    }

    setUserProfile(profile)
    setNeedsProfileSetup(!profile.is_profile_completed)
  }

  // Dashboard 존재 확인 및 생성
  const ensureDashboardExists = async (userId: string) => {
    try {
      console.log('🏠 Checking dashboard for user:', userId)
      
      const { data: dashboard, error: dashboardError } = await supabase
        .from('dashboards')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (dashboardError && dashboardError.code === 'PGRST116') {
        // Dashboard가 없으면 생성
        console.log('🏗️ Creating dashboard for user:', userId)
        
        const { data: newDashboard, error: createError } = await supabase
          .from('dashboards')
          .insert({
            user_id: userId,
            title: '나의 학습 대시보드',
            settings: {
              theme: 'light',
              widgets: ['documents', 'progress', 'recent_activity'],
              layout: 'grid'
            }
          })
          .select()
          .single()
        
        if (createError) {
          console.error('❌ Error creating dashboard:', createError)
        } else {
          console.log('✅ Dashboard created:', newDashboard)
        }
      } else if (dashboard) {
        console.log('✅ Dashboard already exists:', dashboard.title)
      }
    } catch (error) {
      console.error('💥 Error in ensureDashboardExists:', error)
    }
  }

  // 사용자 프로필 새로고침
  const refreshUserProfile = async () => {
    if (!user) return
    await loadUserProfile(user.id)
  }

  const signInWithGoogle = async () => {
    setLoading(true)
    try {
      const redirectUrl = `${window.location.origin}/auth/callback`
      console.log('🔗 Redirect URL:', redirectUrl)
      console.log('🌐 Window location origin:', window.location.origin)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) {
        console.error('Error signing in with Google:', error)
        throw error
      }

      // OAuth 리다이렉트가 시작되면 로딩 상태 유지
      // 실제 로그인은 콜백에서 처리됨
    } catch (error) {
      console.error('Error in signInWithGoogle:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    console.log('🚪 Starting sign out process...')
    setLoading(true)
    setIsSigningOut(true)
    
    // try {
    //   // Supabase 세션 완전히 정리
    //   await supabase.auth.signOut()
    //   console.log('✅ Supabase session cleared')
    // } catch (error) {
    //   console.warn('⚠️ Supabase signOut error:', error)
    // }
    
    // 로컬 스토리지 정리
    localStorage.clear()
    sessionStorage.clear()
    
    // 로컬 상태 정리
    setUser(null)
    setUserProfile(null)
    setNeedsProfileSetup(false)
    
    console.log('✅ Sign out completed - all state cleared')
    
    setLoading(false)
    
    // 홈으로 리다이렉트
    window.location.replace('/')
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      loading, 
      needsProfileSetup, 
      signInWithGoogle, 
      signOut, 
      refreshUserProfile 
    }}>
      {children}
    </AuthContext.Provider>
  )
}