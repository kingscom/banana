'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { X, User, Building } from 'lucide-react'

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export default function UserProfileModal({ isOpen, onClose, onUpdate }: UserProfileModalProps) {
  const { user, userProfile } = useAuth()
  const [formData, setFormData] = useState({
    displayName: userProfile?.display_name || user?.user_metadata?.name || user?.email || '',
    department: userProfile?.department || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('📋 Form submitted with data:', formData)
    
    // 입력 검증
    if (!formData.displayName.trim()) {
      setError('사용자 이름을 입력해주세요.')
      return
    }
    
    if (!formData.department.trim()) {
      setError('부서명을 입력해주세요.')
      return
    }
    
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (!user) throw new Error('사용자 정보가 없습니다.')

      console.log('🔄 Starting profile update process...')
      console.log('👤 User ID:', user.id)
      console.log('📧 User email:', user.email)
      console.log('📝 Update data:', formData)

      // 먼저 현재 프로필 상태 확인
      console.log('🔍 Checking current profile state...')
      const { data: currentProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (fetchError) {
        console.error('❌ Error fetching current profile:', fetchError)
        if (fetchError.code === 'PGRST116') {
          throw new Error('프로필이 존재하지 않습니다. 다시 로그인해주세요.')
        }
        throw fetchError
      }

      console.log('📊 Current profile:', currentProfile)

      // 사용자 프로필 업데이트
      console.log('💾 Updating profile...')
      const updateData = {
        display_name: formData.displayName.trim(),
        department: formData.department.trim(),
        updated_at: new Date().toISOString()
      }
      
      console.log('📤 Sending update:', updateData)

      const { data, error: updateError } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()

      if (updateError) {
        console.error('❌ Profile update error:', updateError)
        console.error('🔍 Error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        })
        throw updateError
      }

      console.log('✅ Profile updated successfully:', data)
      
      if (!data || data.length === 0) {
        throw new Error('업데이트는 성공했지만 반환된 데이터가 없습니다.')
      }

      setSuccess('프로필이 성공적으로 업데이트되었습니다!')
      
      // 1초 후 모달 닫기 및 상태 새로고침
      setTimeout(() => {
        console.log('🔄 Calling onUpdate callback...')
        onUpdate()
        onClose()
      }, 1000)

    } catch (error) {
      console.error('💥 프로필 업데이트 오류:', error)
      setError(error instanceof Error ? error.message : '프로필 업데이트 중 오류가 발생했습니다.')
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <User className="w-5 h-5 mr-2" />
            사용자 정보 수정
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 inline mr-1" />
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
                <Building className="w-4 h-4 inline mr-1" />
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

            {/* 현재 정보 표시 */}
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600 mb-1">현재 정보:</p>
              <p className="text-sm"><strong>이메일:</strong> {user?.email}</p>
              <p className="text-sm"><strong>가입일:</strong> {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString('ko-KR') : '-'}</p>
              <p className="text-sm"><strong>최근 업데이트:</strong> {userProfile?.updated_at ? new Date(userProfile.updated_at).toLocaleDateString('ko-KR') : '-'}</p>
            </div>
          </div>

          {/* 디버깅 섹션 (개발 환경에서만) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={async () => {
                  if (!user) return;
                  try {
                    console.log('🔍 Debug: Current user:', user)
                    console.log('🔍 Debug: Current userProfile:', userProfile)
                    
                    const { data, error } = await supabase
                      .from('user_profiles')
                      .select('*')
                      .eq('id', user.id)
                    
                    console.log('🔍 Debug: DB Profile data:', data, error)
                    
                    // 권한 테스트
                    const { data: testData, error: testError } = await supabase
                      .from('user_profiles')
                      .select('count')
                      .eq('id', user.id)
                    
                    console.log('🔍 Debug: Permission test:', testData, testError)
                  } catch (err) {
                    console.error('🔍 Debug error:', err)
                  }
                }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 underline mb-2"
              >
                [DEBUG] 현재 상태 확인
              </button>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !formData.displayName.trim() || !formData.department.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '업데이트 중...' : '업데이트'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}