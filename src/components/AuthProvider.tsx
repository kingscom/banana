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

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
        } else {
          setUser(session?.user ?? null)
          // 사용자가 있으면 프로필도 로드
          if (session?.user) {
            await loadUserProfile(session.user.id)
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth event:', event)
        console.log('📊 Session state:', session ? 'EXISTS' : 'NULL')
        
        if (session?.user) {
          console.log('👤 User info:', {
            id: session.user.id,
            email: session.user.email,
            created_at: session.user.created_at,
            metadata: session.user.user_metadata
          })
        }
        
        setUser(session?.user ?? null)
        setLoading(false)

        // 로그인 시 사용자 프로필 로드
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('🚀 Loading profile for signed in user...')
          await loadUserProfile(session.user.id)
        } else if (event === 'SIGNED_OUT' || (!session && user)) {
          console.log('👋 User signed out - clearing all state')
          setUserProfile(null)
          setNeedsProfileSetup(false)
          setLoading(false)
          
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

  // 사용자 프로필 로드
  const loadUserProfile = async (userId: string) => {
    try {
      console.log('🔍 Loading user profile for ID:', userId)
      
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('❌ Error loading user profile:', error)
        
        // 프로필이 없는 경우 (PGRST116 = no rows returned)
        if (error.code === 'PGRST116') {
          console.log('🆕 No profile found - creating initial profile')
          setNeedsProfileSetup(true)
          
          // 초기 프로필 생성 시도
          try {
            const { data: newProfile, error: createError } = await supabase
              .from('user_profiles')
              .insert({
                id: userId,
                email: user?.email || '',
                display_name: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '',
                avatar_url: user?.user_metadata?.avatar_url || user?.user_metadata?.picture,
                provider: 'google',
                is_profile_completed: false
              })
              .select()
              .single()

            if (createError) {
              console.error('❌ Error creating initial profile:', createError)
            } else {
              console.log('✅ Initial profile created:', newProfile)
              setUserProfile(newProfile)
              
              // Dashboard도 생성되었는지 확인하고 없으면 생성
              await ensureDashboardExists(userId)
            }
          } catch (createError) {
            console.error('💥 Failed to create initial profile:', createError)
          }
        }
        return null
      }

      console.log('✅ User profile loaded:', profile)
      
      // 빈 필드가 있으면 Google 메타데이터로 업데이트
      if (!profile.email || !profile.display_name) {
        console.log('🔄 Updating empty profile fields with Google metadata')
        
        const updateData = {
          email: profile.email || user?.email || '',
          display_name: profile.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
          avatar_url: profile.avatar_url || user?.user_metadata?.avatar_url || null
        }
        
        console.log('📝 Update data:', updateData)
        
        const { data: updatedProfile, error: updateError } = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('id', userId)
          .select()
          .single()
        
        if (updateError) {
          console.error('❌ Error updating profile fields:', updateError)
        } else {
          console.log('✅ Profile fields updated:', updatedProfile)
          // 업데이트된 프로필로 교체
          setUserProfile(updatedProfile)
          return updatedProfile
        }
      }
      
      setUserProfile(profile)
      setNeedsProfileSetup(!profile.is_profile_completed)
      
      // Dashboard 존재 확인
      await ensureDashboardExists(userId)
      
      if (!profile.is_profile_completed) {
        console.log('📝 Profile setup needed for user:', profile.email)
      } else {
        console.log('🎉 Profile is complete for user:', profile.email)
      }
      
      return profile
    } catch (error) {
      console.error('💥 Error in loadUserProfile:', error)
      return null
    }
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
    if (user) {
      await loadUserProfile(user.id)
    }
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
    
    try {
      // Supabase 로그아웃 먼저 시도
      console.log('📡 Attempting Supabase sign out...')
      await supabase.auth.signOut()
      console.log('✅ Supabase sign out completed')
      
    } catch (error) {
      console.warn('⚠️ Supabase signOut error:', error)
      // 에러가 있어도 계속 진행
    }
    
    // 로컬 상태 정리는 auth state change에서 처리됨
    console.log('🔄 Waiting for auth state change...')
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