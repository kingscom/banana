'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

interface ProfileSetupProps {
  onComplete: () => void
}

export default function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    displayName: user?.user_metadata?.name || user?.email || '',
    department: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!user) throw new Error('사용자 정보가 없습니다.')

      // 통합된 upsert 로직 - UserProfileModal과 동일
      const profileData: any = {
        id: user.id,
        email: user.email || '',
        display_name: formData.displayName.trim(),
        department: formData.department.trim(),
        is_profile_completed: true,
        provider: 'google',
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData, {
          onConflict: 'id'
        })

      if (error) {
        throw error
      }

      onComplete()
    } catch (error: any) {
      console.error('프로필 설정 오류:', error)
      setError(`프로필 설정 실패: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            프로필 설정
          </h2>
          <p className="text-gray-600">
            AI Knowledge Factory에 오신 것을 환영합니다!<br />
            프로필 정보를 입력해주세요.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
              사용자 이름 *
            </label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              required
              value={formData.displayName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="이름을 입력하세요"
            />
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
              부서명 *
            </label>
            <input
              type="text"
              id="department"
              name="department"
              list="departments"
              required
              value={formData.department}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="부서명을 입력하세요"
            />
            <datalist id="departments">
              <option value="개발팀" />
              <option value="디자인팀" />
              <option value="기획팀" />
              <option value="마케팅팀" />
              <option value="영업팀" />
              <option value="인사팀" />
              <option value="재무팀" />
              <option value="경영진" />
              <option value="운영팀" />
              <option value="품질관리팀" />
              <option value="고객서비스팀" />
              <option value="연구개발팀" />
            </datalist>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading || !formData.displayName || !formData.department}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '설정 중...' : '완료'}
            </button>
          </div>
        </form>

        <div className="mt-4 text-xs text-gray-500 text-center">
          * 모든 필드는 필수입니다
        </div>

        {/* 디버깅 버튼 (개발 환경에서만) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={async () => {
                if (!user) return;
                try {
                  const { data, error } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', user.id);
                  console.log('🔍 Current profile in DB:', data, error);
                } catch (err) {
                  console.error('❌ Debug query failed:', err);
                }
              }}
              className="w-full text-xs text-gray-400 hover:text-gray-600 underline"
            >
              [DEBUG] 현재 프로필 상태 확인
            </button>
          </div>
        )}
      </div>
    </div>
  )
}