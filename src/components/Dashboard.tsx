'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { db, supabase } from '@/lib/supabase'
import PDFReader from './PDFReader'
import ConceptMap from './ConceptMap'
import CourseRecommendation from './CourseRecommendation'
import HighlightAnalytics from './HighlightAnalytics'
import ProfileSetup from './ProfileSetup'
import UserProfileModal from './UserProfileModal'
import { 
  BookOpen, 
  Upload, 
  BarChart3, 
  Settings, 
  LogOut,
  FileText,
  Lightbulb,
  Target,
  Trash2,
  Share2,
  Users,
  CheckCircle,
  X,
  AlertCircle,
  Hash
} from 'lucide-react'

export default function Dashboard() {
  const { user, userProfile, needsProfileSetup, loading, signOut, refreshUserProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [uploadedPDFs, setUploadedPDFs] = useState<Array<{id: string, name: string, file: File}>>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [highlights, setHighlights] = useState<any[]>([])
  const [learningProgress, setLearningProgress] = useState<any[]>([])
  const [selectedDocument, setSelectedDocument] = useState<any>(null)
  const [showProfileSetup, setShowProfileSetup] = useState(false)
  const [showUserProfileModal, setShowUserProfileModal] = useState(false)
  const [deleteModalDocument, setDeleteModalDocument] = useState<any>(null)
  const [shareModalDocument, setShareModalDocument] = useState<any>(null)
  const [shareTargetEmail, setShareTargetEmail] = useState('')
  const [shareTargetUser, setShareTargetUser] = useState<any>(null)
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [isSharing, setIsSharing] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [targetPage, setTargetPage] = useState<number | undefined>(undefined)
  const [targetHighlightId, setTargetHighlightId] = useState<string | undefined>(undefined)

  // Load user data from Supabase (한 번만)
  useEffect(() => {
    if (user && !loading) {
      loadUserData()
    }
  }, [user?.id]) // user.id만 의존성으로 설정하여 불필요한 재호출 방지

  // Check if profile setup is needed
  useEffect(() => {
    if (needsProfileSetup) {
      setShowProfileSetup(true)
    }
  }, [needsProfileSetup])

  const handleProfileSetupComplete = async () => {
    console.log('✅ Profile setup completed - refreshing user profile')
    setShowProfileSetup(false)
    
    // 프로필 새로고침
    await refreshUserProfile()
    
    // 프로필이 제대로 업데이트되었는지 확인
    if (user) {
      try {
        console.log('🔍 Verifying profile update...')
        
        // 직접 프로필 조회하여 확인
        const { data: updatedProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('❌ Error verifying profile:', error)
        } else {
          console.log('✅ Updated profile verified:', updatedProfile)
        }

        // 대시보드도 확인
        const dashboard = await db.getUserDashboard(user.id)
        console.log('📊 User dashboard:', dashboard)
      } catch (error) {
        console.error('❌ Error in verification:', error)
      }
    }
  }

  const handleUserProfileUpdate = async () => {
    try {
      console.log('🔄 User profile updated - refreshing...')
      
      // 프로필 새로고침
      await refreshUserProfile()
      
      // 성공적으로 새로고침되었는지 확인
      setTimeout(async () => {
        if (user) {
          const { data: updatedProfile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (error) {
            console.error('❌ Error verifying updated profile:', error)
          } else {
            console.log('✅ Profile refresh verified:', updatedProfile)
          }
        }
      }, 500)
      
    } catch (error) {
      console.error('❌ Error in handleUserProfileUpdate:', error)
    }
  }

  const [isLoadingData, setIsLoadingData] = useState(false)

  const loadUserData = async () => {
    if (!user || isLoadingData) {
      console.log('사용자 데이터 로딩 스킵:', { hasUser: !!user, isLoading: isLoadingData })
      return
    }
    
    setIsLoadingData(true)
    
    try {
      console.log('📊 사용자 데이터 로딩 시작:', user.id)
      
      // documents 테이블에서 직접 데이터 가져오기
      const response = await fetch(`/api/documents?user_id=${user.id}`)
      const result = await response.json()
      
      if (response.ok) {
        console.log('📄 로드된 문서들:', result.data?.length || 0, '개')
        setDocuments(result.data || [])
        
        // 문서가 있으면 하이라이트도 로드 (병렬 처리 최적화)
        if (result.data && result.data.length > 0) {
          const allHighlights = await Promise.all(
            result.data.map(async (doc: any) => {
              try {
                const hlResponse = await fetch(`/api/highlights?document_id=${doc.id}&user_id=${user.id}`)
                const hlResult = await hlResponse.json()
                return hlResult.data || []
              } catch (error) {
                console.error(`하이라이트 로딩 실패 (${doc.id}):`, error)
                return []
              }
            })
          )
          setHighlights(allHighlights.flat() || [])
        } else {
          setHighlights([])
        }
      } else {
        console.error('문서 로딩 실패:', result.error)
        setDocuments([])
        setHighlights([])
      }
      
      setLearningProgress([])
    } catch (error) {
      console.error('사용자 데이터 로딩 중 오류:', error)
      setDocuments([])
      setHighlights([])
      setLearningProgress([])
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleLogout = async () => {
    // 이미 로그아웃 중이면 무시
    if (loading) {
      console.log('� Logout already in progress, ignoring...')
      return
    }
    
    console.log('🔄 Logout button clicked')
    await signOut()
  }

  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || !user) return

    const fileArray = Array.from(files)
    
    for (const file of fileArray) {
      try {
        console.log('파일 업로드 시작:', file.name)
        
        const formData = new FormData()
        formData.append('file', file)
        formData.append('userId', user.id)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const result = await response.json()
        console.log('업로드 성공:', result)

        // 문서 목록 새로고침 (데이터베이스에서 다시 로드)
        await loadUserData()
        
        // 업로드된 문서를 바로 선택하고 PDF Reader로 이동
        if (result.document) {
          setSelectedDocument(result.document)
          setActiveTab('reader')
          console.log('업로드된 문서 자동 선택:', result.document.title)
        }
        
        console.log('파일 업로드 및 데이터베이스 저장 완료:', result.document.title)
        
      } catch (error) {
        console.error('파일 업로드 실패:', error)
        alert(`파일 업로드 실패: ${file.name}`)
      }
    }

    // 파일 입력 초기화
    event.target.value = ''
  }

  const handleDocumentSelect = (document: any) => {
    // 타겟 상태 리셋 (일반적인 문서 선택 시)
    setTargetPage(undefined)
    setTargetHighlightId(undefined)
    
    // 선택된 문서 설정
    setSelectedDocument(document)
    console.log('선택된 문서:', document.title)
    // PDF Reader 탭으로 이동
    setActiveTab('reader')
  }

  const handleNavigateToHighlight = (documentId: string, pageNumber: number, highlightId: string) => {
    // 해당 문서 찾기
    const document = documents.find(doc => doc.id === documentId)
    if (document) {
      // 타겟 페이지와 하이라이트 설정
      setTargetPage(pageNumber)
      setTargetHighlightId(highlightId)
      
      // 문서 선택
      setSelectedDocument(document)
      // PDF Reader 탭으로 이동
      setActiveTab('reader')
      
      console.log('하이라이트로 이동:', {
        document: document.title,
        page: pageNumber,
        highlightId: highlightId
      })
      
      // 성공 메시지 표시
      setSuccessMessage(`"${document.title}" ${pageNumber}페이지의 하이라이트로 이동합니다.`)
      setTimeout(() => setSuccessMessage(''), 2000)
    }
  }

  const handleDocumentDelete = (document: any, event: React.MouseEvent) => {
    event.stopPropagation() // 문서 선택 이벤트 방지
    setDeleteModalDocument(document)
  }

  const confirmDocumentDelete = async () => {
    if (!deleteModalDocument || !user) return
    
    try {
      console.log('문서 삭제 시작:', deleteModalDocument.id)
      
      const response = await fetch(`/api/documents?id=${deleteModalDocument.id}&user_id=${user.id}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (response.ok) {
        console.log('문서 삭제 성공')
        // 문서 목록 새로고침
        await loadUserData()
        
        // 선택된 문서가 삭제된 경우 선택 해제
        if (selectedDocument?.id === deleteModalDocument.id) {
          setSelectedDocument(null)
          setActiveTab('dashboard')
        }
        
        setSuccessMessage(`"${deleteModalDocument.title}" 문서가 성공적으로 삭제되었습니다.`)
        setTimeout(() => setSuccessMessage(''), 3000)
        setDeleteModalDocument(null)
      } else {
        console.error('문서 삭제 실패:', result.error)
        setErrorMessage('문서 삭제에 실패했습니다: ' + result.error)
        setTimeout(() => setErrorMessage(''), 5000)
      }
    } catch (error) {
      console.error('문서 삭제 중 오류:', error)
      setErrorMessage('문서 삭제 중 오류가 발생했습니다.')
      setTimeout(() => setErrorMessage(''), 5000)
    }
  }

  const loadAvailableUsers = async () => {
    if (!user) return
    
    setIsLoadingUsers(true)
    try {
      const response = await fetch(`/api/users?currentUserId=${user.id}`)
      const result = await response.json()
      
      if (response.ok) {
        setAvailableUsers(result.users || [])
      } else {
        console.error('사용자 목록 로딩 실패:', result.error)
        setAvailableUsers([])
      }
    } catch (error) {
      console.error('사용자 목록 로딩 중 오류:', error)
      setAvailableUsers([])
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const handleDocumentShare = (document: any, event: React.MouseEvent) => {
    event.stopPropagation()
    setShareModalDocument(document)
    setShareTargetEmail('')
    setShareTargetUser(null)
    loadAvailableUsers()
  }

  const confirmDocumentShare = async () => {
    if (!shareModalDocument || !user || (!shareTargetUser && !shareTargetEmail.trim())) return
    
    setIsSharing(true)
    
    try {
      const targetEmail = shareTargetUser ? shareTargetUser.email : shareTargetEmail.trim()
      const targetLabel = shareTargetUser ? shareTargetUser.label : targetEmail
      
      console.log('문서 공유 시작:', shareModalDocument.id, '대상:', targetEmail)
      
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: shareModalDocument.id,
          targetUserEmail: targetEmail,
          userId: user.id
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        console.log('문서 공유 성공')
        setSuccessMessage(`문서가 ${targetLabel}에게 성공적으로 공유되었습니다!`)
        setShareModalDocument(null)
        setShareTargetEmail('')
        setShareTargetUser(null)
        
        // 3초 후 성공 메시지 자동 숨김
        setTimeout(() => {
          setSuccessMessage('')
        }, 3000)
      } else {
        console.error('문서 공유 실패:', result.error)
        setErrorMessage('문서 공유에 실패했습니다: ' + result.error)
        setTimeout(() => setErrorMessage(''), 5000)
      }
    } catch (error) {
      console.error('문서 공유 중 오류:', error)
      setErrorMessage('문서 공유 중 오류가 발생했습니다.')
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setIsSharing(false)
    }
  }

  const tabs = [
    { id: 'dashboard', name: '대시보드', icon: BarChart3 },
    { id: 'reader', name: 'PDF 리더', icon: BookOpen },
    { id: 'analytics', name: '하이라이트 빈도', icon: Hash },
    { id: 'concept', name: '개념 연결맵', icon: Lightbulb },
    { id: 'recommendations', name: '추천 강좌', icon: Target },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Setup Modal */}
      {showProfileSetup && (
        <ProfileSetup onComplete={handleProfileSetupComplete} />
      )}

      {/* User Profile Update Modal */}
      <UserProfileModal
        isOpen={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
        onUpdate={handleUserProfileUpdate}
      />

      {/* Delete Confirmation Modal */}
      {deleteModalDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">문서 삭제</h3>
                <p className="text-sm text-gray-500">이 작업은 되돌릴 수 없습니다</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                <strong>"{deleteModalDocument.title}"</strong>을(를) 삭제하시겠습니까?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ 관련된 모든 하이라이트와 노트도 함께 삭제됩니다.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setDeleteModalDocument(null)}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmDocumentDelete}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Document Modal */}
      {shareModalDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <Share2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">문서 공유</h3>
                <p className="text-sm text-gray-500">다른 사용자와 문서를 공유하세요</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                <strong>"{shareModalDocument.title}"</strong>을(를) 공유합니다
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  대상 사용자 선택
                </label>
                {isLoadingUsers ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-gray-500">사용자 목록 로딩 중...</span>
                  </div>
                ) : (
                  <select
                    value={shareTargetUser?.id || ''}
                    onChange={(e) => {
                      const selectedUser = availableUsers.find(u => u.id === e.target.value)
                      setShareTargetUser(selectedUser || null)
                      setShareTargetEmail(selectedUser?.email || '')
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">사용자를 선택하세요</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.label}
                      </option>
                    ))}
                  </select>
                )}
                
                {availableUsers.length === 0 && !isLoadingUsers && (
                  <p className="text-sm text-gray-500 mt-2">
                    공유 가능한 사용자가 없습니다.
                  </p>
                )}
              </div>
              
              {/* 수동 이메일 입력 옵션 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  또는 이메일 직접 입력
                </label>
                <input
                  type="email"
                  value={shareTargetEmail}
                  onChange={(e) => {
                    setShareTargetEmail(e.target.value)
                    setShareTargetUser(null) // 직접 입력 시 선택 해제
                  }}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-800">
                  📋 문서와 모든 하이라이트가 함께 공유됩니다
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => {
                  setShareModalDocument(null)
                  setShareTargetEmail('')
                  setShareTargetUser(null)
                }}
                disabled={isSharing}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={confirmDocumentShare}
                disabled={(!shareTargetUser && !shareTargetEmail.trim()) || isSharing}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSharing ? '공유 중...' : '공유하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message Modal */}
      {successMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl animate-bounce">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">공유 완료!</h3>
                  <p className="text-sm text-gray-500">문서가 성공적으로 공유되었습니다</p>
                </div>
              </div>
              <button
                onClick={() => setSuccessMessage('')}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
              <p className="text-green-800 text-sm">
                {successMessage}
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setSuccessMessage('')}
                className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message Modal */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">오류 발생</h3>
                  <p className="text-sm text-gray-500">작업을 완료할 수 없습니다</p>
                </div>
              </div>
              <button
                onClick={() => setErrorMessage('')}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-red-800 text-sm">
                {errorMessage}
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setErrorMessage('')}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="mx-auto px-4 sm:px-6 lg:px-8" style={{ maxWidth: '1440px' }}>
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {/* 로고 */}
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">
                  나만의 AI 스터디룸
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {/* User Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                  {userProfile?.avatar_url ? (
                    <img
                      src={userProfile.avatar_url}
                      alt="Profile"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm">
                      {(userProfile?.display_name || user?.user_metadata?.name || user?.email || '사용자')[0].toUpperCase()}
                    </span>
                  )}
                </div>

                {/* User Info - Clickable */}
                <button
                  onClick={() => setShowUserProfileModal(true)}
                  className="text-right hover:bg-gray-100 p-2 rounded-lg transition-colors group"
                >
                  <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                    {userProfile?.display_name || user?.user_metadata?.name || user?.email}
                  </div>
                  {userProfile?.department && (
                    <div className="text-xs text-gray-500 group-hover:text-blue-500">
                      {userProfile.department}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 group-hover:text-blue-400 mt-1">
                    프로필 수정
                  </div>
                </button>
              </div>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut size={18} />
                <span>{loading ? '로그아웃 중...' : '로그아웃'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ maxWidth: '1600px' }}>
        <div className="flex space-x-6">
          {/* Sidebar */}
          <div className="w-64 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  <span>{tab.name}</span>
                </button>
              )
            })}
            
            {/* PDF Upload */}
            <div className="pt-4 border-t">
              <label className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors">
                <Upload size={20} />
                <span>PDF 업로드</span>
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handlePDFUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* 업로드된 문서들 */}
            {documents.length > 0 && (
              <div className="pt-2">
                <h3 className="px-4 text-sm font-medium text-gray-900 mb-2">
                  내 문서들
                </h3>
                <div className="space-y-1">
                  {documents.slice(0, 5).map((doc) => (
                    <div
                      key={doc.id}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer truncate"
                      onClick={() => handleDocumentSelect(doc)}
                    >
                      <div className="flex items-center space-x-2">
                        <FileText size={16} />
                        <span className="truncate">{doc.title}</span>
                      </div>
                    </div>
                  ))}
                  {documents.length > 5 && (
                    <div className="px-4 py-2 text-xs text-gray-500">
                      +{documents.length - 5}개 더
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'dashboard' && (
              <DashboardContent 
                pdfs={uploadedPDFs} 
                documents={documents}
                highlights={highlights}
                learningProgress={learningProgress}
                onDocumentSelect={handleDocumentSelect}
                onDocumentDelete={handleDocumentDelete}
                onDocumentShare={handleDocumentShare}
                user={user}
              />
            )}
            {activeTab === 'reader' && selectedDocument && <PDFReader 
              pdfs={[{
                id: selectedDocument.id,
                name: selectedDocument.title,
                file: null, // 서버에서 로드할 파일
                document: selectedDocument
              }]} 
              initialPage={targetPage}
              targetHighlightId={targetHighlightId}
            />}
            {activeTab === 'reader' && !selectedDocument && (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">문서를 선택하세요</h3>
                  <p className="text-gray-500">대시보드에서 읽고 싶은 문서를 클릭하세요.</p>
                </div>
              </div>
            )}
            {activeTab === 'analytics' && (
              <HighlightAnalytics onNavigateToHighlight={handleNavigateToHighlight} />
            )}
            {activeTab === 'concept' && <ConceptMap />}
            {activeTab === 'recommendations' && <CourseRecommendation />}
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardContent({ pdfs, documents, highlights, learningProgress, onDocumentSelect, onDocumentDelete, onDocumentShare, user }: { 
  pdfs: Array<{id: string, name: string, file: File}>
  documents: any[]
  highlights: any[]
  learningProgress: any[]
  onDocumentSelect: (document: any) => void
  onDocumentDelete?: (document: any, event: React.MouseEvent) => void
  onDocumentShare?: (document: any, event: React.MouseEvent) => void
  user: any
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">대시보드</h2>
        <p className="text-gray-600">AI 기반 학습 현황을 한눈에 확인하세요</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">업로드된 문서</p>
              <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">하이라이트</p>
              <p className="text-2xl font-bold text-gray-900">{highlights.length}</p>
            </div>
            <Lightbulb className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 업로드 용량</p>
              <p className="text-2xl font-bold text-gray-900">
                {documents.length > 0 
                  ? (documents.reduce((acc, doc) => acc + doc.file_size, 0) / 1024 / 1024).toFixed(1) + ' MB'
                  : '0 MB'}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
      </div>

      {/* Document List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">문서 목록</h3>
          {documents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              PDF 문서를 업로드하여 AI 학습을 시작하세요!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Database documents */}
              {documents.map((doc) => (
                <div 
                  key={doc.id} 
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer hover:bg-gray-50 relative group"
                  onClick={() => onDocumentSelect(doc)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex items-center space-x-2">
                      <FileText size={20} className="text-blue-600 mt-1" />
                      {/* 공유됨 표시 */}
                      {doc.is_shared && (
                        <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                          <Users size={12} />
                          <span>공유됨</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {doc.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(doc.created_at).toLocaleDateString('ko-KR')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {(doc.file_size / 1024 / 1024).toFixed(1)} MB
                      </p>
                      {/* 공유 정보 */}
                      {doc.is_shared && doc.shared_by_user_id && (
                        <p className="text-xs text-green-600 mt-1">
                          다른 사용자가 공유한 문서
                        </p>
                      )}
                    </div>
                    
                    {/* 액션 버튼들 */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1">
                      {/* 공유 버튼 (자신이 만든 문서만) */}
                      {!doc.is_shared && onDocumentShare && (
                        <button
                          onClick={(e) => onDocumentShare(doc, e)}
                          className="p-1 rounded-full hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition-all"
                          title="문서 공유"
                        >
                          <Share2 size={16} />
                        </button>
                      )}
                      
                      {/* 삭제 버튼 */}
                      <button
                        onClick={(e) => onDocumentDelete && onDocumentDelete(doc, e)}
                        className="p-1 rounded-full hover:bg-red-100 text-red-600 hover:text-red-800 transition-all"
                        title="문서 삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 활동</h3>
          {documents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              아직 활동이 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {documents.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                  <FileText size={16} className="text-gray-600" />
                  <span className="text-sm text-gray-900">
                    {doc.title} 업로드됨
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(doc.created_at).toLocaleString('ko-KR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}