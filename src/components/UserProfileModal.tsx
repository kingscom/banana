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
  
  // 최초 프로필 설정인지 확인
  const isFirstTimeSetup = !userProfile?.display_name || !userProfile?.department

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 입력 검증
    if (!formData.displayName.trim()) {
      setError('사용자 이름을 입력해주세요.')
      return
    }
    
    if (!formData.department.trim()) {
      setError('부서명을 입력해주세요.')
      return
    }
    
    if (!user) {
      setError('사용자 정보가 없습니다.')
      return
    }
    
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (isFirstTimeSetup) {
        // 최초 프로필 생성
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert([{
            id: user.id,
            email: user.email || '',
            display_name: formData.displayName.trim(),
            department: formData.department.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          
        if (insertError) {
          throw insertError
        }
        
        setSuccess('프로필이 생성되었습니다!')
      } else {
        // 기존 프로필 업데이트 (upsert 사용)
        const { error: upsertError } = await supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            email: user.email || '',
            display_name: formData.displayName.trim(),
            department: formData.department.trim(),
            updated_at: new Date().toISOString()
          })
          
        if (upsertError) {
          throw upsertError
        }
        
        setSuccess('프로필이 업데이트되었습니다!')
      }
      
      // 잠시 후 모달 닫기
      setTimeout(() => {
        onUpdate()
        onClose()
      }, 1000)

    } catch (error: any) {
      setError(`${isFirstTimeSetup ? '프로필 생성' : '프로필 업데이트'} 실패: ${error.message}`)
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-8">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <User className="w-5 h-5 mr-2" />
            {isFirstTimeSetup ? '프로필 설정' : '프로필 수정'}
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
              {loading ? (isFirstTimeSetup ? '생성 중...' : '업데이트 중...') : (isFirstTimeSetup ? '프로필 생성' : '프로필 업데이트')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}