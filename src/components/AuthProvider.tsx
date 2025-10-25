'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id: string
  email: string
  display_name: string
  department: string
  avatar_url?: string
  is_profile_completed: boolean
  provider: string
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  needsProfileSetup: boolean
  signOut: () => Promise<void>
  refreshUserProfile: () => Promise<void>
  signInWithGoogle: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  needsProfileSetup: false,
  signOut: async () => {},
  refreshUserProfile: async () => {},
  signInWithGoogle: async () => {}
})

export const useAuth = () => useContext(AuthContext)

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false)

  useEffect(() => {
    // 초기 로딩
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await loadUserProfile(session.user.id)
      }
      
      setLoading(false)
    }

    init()

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        
        if (event === 'SIGNED_OUT') {
          setUserProfile(null)
          setNeedsProfileSetup(false)
          if (window.location.pathname.startsWith('/dashboard')) {
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

  const refreshUserProfile = async () => {
    if (user) {
      await loadUserProfile(user.id)
    }
  }

  const signInWithGoogle = async () => {
    setLoading(true)
    try {
      const redirectUrl = `${window.location.origin}/auth/callback`
      
      const { error } = await supabase.auth.signInWithOAuth({
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
        throw error
      }
    } catch (error) {
      console.error('Google login error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      needsProfileSetup,
      signOut,
      refreshUserProfile,
      signInWithGoogle
    }}>
      {children}
    </AuthContext.Provider>
  )
}