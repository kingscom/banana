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
  Hash,
  ChevronRight
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
        // 문서 로딩 완료
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
    // 문서 선택됨
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
      <header className="bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 shadow-sm">
        <div className="mx-auto px-4 sm:px-6 lg:px-8" style={{ maxWidth: '1440px' }}>
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-4">
                {/* 로고 */}
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                    <Target className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="library-title text-2xl text-amber-900">
                    나만의 AI 스터디룸
                  </h1>
                  <p className="library-text text-xs opacity-70">
                    AI와 함께하는 개인 지식 도서관
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                {/* User Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold shadow-lg">
                    {userProfile?.avatar_url ? (
                      <img
                        src={userProfile.avatar_url}
                        alt="Profile"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg">
                        {(userProfile?.display_name || user?.user_metadata?.name || user?.email || '사용자')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>

                {/* User Info - Clickable */}
                <button
                  onClick={() => setShowUserProfileModal(true)}
                  className="text-left hover:bg-amber-100 p-3 rounded-xl transition-colors group"
                >
                  <div className="text-sm font-semibold library-text text-amber-900 group-hover:text-amber-800">
                    {userProfile?.display_name || '사용자'}
                  </div>
                  {userProfile?.department && (
                    <div className="text-xs library-text opacity-70 group-hover:opacity-80">
                      {userProfile.department}
                    </div>
                  )}
                  <div className="text-xs library-text opacity-50 group-hover:opacity-70 mt-1 flex items-center space-x-1">
                    <Settings className="w-3 h-3" />
                    <span>프로필 설정</span>
                  </div>
                </button>
              </div>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="flex items-center space-x-2 library-text text-amber-800 hover:text-amber-900 hover:bg-amber-100 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut size={18} />
                <span className="font-medium">{loading ? '로그아웃 중...' : '로그아웃'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ maxWidth: '1600px' }}>
        <div className="flex space-x-8">
          {/* Sidebar */}
          <div className="w-72 space-y-3">
            <div className="library-card rounded-xl p-6 bg-white shadow-md">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center">
                  <Hash className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="library-title text-lg text-amber-900">탐색 메뉴</h3>
                  <p className="library-text text-xs opacity-70">지식 여정을 시작하세요</p>
                </div>
              </div>
              <div className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 shadow-sm'
                          : 'library-text hover:bg-amber-50 hover:text-amber-800'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        activeTab === tab.id
                          ? 'bg-white shadow-sm'
                          : 'bg-amber-50'
                      }`}>
                        <Icon size={18} className={activeTab === tab.id ? 'text-amber-700' : 'text-amber-600'} />
                      </div>
                      <span className="font-medium">{tab.name}</span>
                    </button>
                  )
                })}
              </div>
               {/* PDF Upload */}
            <div className="library-card rounded-xl p-6 bg-gradient-to-br from-white to-amber-50 shadow-md">
              <div className="text-center">
                <label className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-3 rounded-xl cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg font-medium">
                  <Upload size={18} />
                  <span>문서 업로드</span>
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handlePDFUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            </div>
           

            {/* 최근 문서들 */}
            {documents.length > 0 && (
              <div className="library-card rounded-xl p-6 bg-white shadow-md">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="library-title text-lg text-amber-900">최근 문서</h3>
                    <p className="library-text text-xs opacity-70">빠른 접근</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {documents.slice(0, 5).map((doc, index) => (
                    <button
                      key={doc.id}
                      className="w-full flex items-center space-x-3 px-3 py-3 library-text hover:bg-amber-50 hover:text-amber-800 cursor-pointer rounded-lg transition-all"
                      onClick={() => handleDocumentSelect(doc)}
                    >
                      <div className="w-6 h-6 bg-amber-100 rounded flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-xs opacity-60">
                          {new Date(doc.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-amber-400 opacity-60" />
                    </button>
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
              <HighlightAnalytics 
                onNavigateToHighlight={handleNavigateToHighlight}
                onNavigateToConceptMap={() => setActiveTab('concept')}
                onNavigateToCourses={(searchKeyword) => {
                  setActiveTab('recommendations')
                  // 추천 강좌 컴포넌트에 검색 키워드 전달하는 이벤트 발생
                  setTimeout(() => {
                    const event = new CustomEvent('searchCourses', { 
                      detail: { keyword: searchKeyword } 
                    })
                    window.dispatchEvent(event)
                  }, 300) // 컴포넌트가 완전히 마운트된 후 실행
                }}
              />
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
    <div className="space-y-8">
      <div className="library-card rounded-xl p-8 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 shadow-lg">
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center shadow-inner">
              <BookOpen className="w-10 h-10 text-amber-700" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <Target className="w-3 h-3 text-white" />
            </div>
          </div>
          <div>
            <h2 className="library-title text-4xl mb-3 text-amber-900">대시보드</h2>
            <p className="library-text text-lg opacity-90 leading-relaxed">
              📚 AI와 함께하는 개인 학습 공간에 오신 것을 환영합니다
            </p>
            <p className="library-text text-sm opacity-70 mt-2">
              지식을 체계적으로 관리하고 깊이있게 탐구하는 스마트한 연구실입니다
            </p>
          </div>
        </div>
      </div>

      {/* 도서관 현황 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="library-card rounded-xl p-6 bg-white shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-700" />
                </div>
                <p className="library-text text-sm font-semibold text-blue-900">소장 도서</p>
              </div>
              <p className="text-3xl font-bold library-title text-blue-800">{documents.length}</p>
              <p className="text-xs library-text opacity-60 mt-1">개의 문서가 보관중</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="library-card rounded-xl p-6 bg-white shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-yellow-700" />
                </div>
                <p className="library-text text-sm font-semibold text-yellow-900">필사 기록</p>
              </div>
              <p className="text-3xl font-bold library-title text-yellow-800">{highlights.length}</p>
              <p className="text-xs library-text opacity-60 mt-1">개의 중요 구절 발견</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-full flex items-center justify-center">
              <Lightbulb className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="library-card rounded-xl p-6 bg-white shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-purple-700" />
                </div>
                <p className="library-text text-sm font-semibold text-purple-900">보관 용량</p>
              </div>
              <p className="text-3xl font-bold library-title text-purple-800">
                {documents.length > 0 
                  ? (documents.reduce((acc, doc) => acc + doc.file_size, 0) / 1024 / 1024).toFixed(1)
                  : '0'}
              </p>
              <p className="text-xs library-text opacity-60 mt-1">MB의 지식 저장소</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-purple-50 to-purple-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
        
      </div>

      {/* 서적 컬렉션 */}
      <div className="library-card rounded-xl bg-white shadow-md">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center shadow-inner">
                <BookOpen className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="library-title text-2xl text-amber-900">서적 컬렉션</h3>
                <p className="library-text text-sm opacity-70">나만의 디지털 서재</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-amber-800">{documents.length}권 소장</div>
              <div className="text-xs text-amber-600 opacity-70">체계적 관리</div>
            </div>
          </div>
          {documents.length === 0 ? (
            <div className="text-center py-20">
              <div className="relative mb-8">
                <div className="w-28 h-28 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <BookOpen className="w-14 h-14 text-amber-700" />
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
              </div>
              <h4 className="library-title text-3xl text-amber-900 mb-4">텅 빈 서재를 채워보세요</h4>
              <p className="library-text text-lg opacity-80 leading-relaxed mb-6">
                📖 첫 번째 PDF 문서를 업로드하여<br/>
                개인 맞춤형 지식 도서관의 여정을 시작해보세요<br/>
              </p>
              <p className="library-text text-sm opacity-60">
                AI가 여러분의 학습을 도와드립니다
              </p>
              <div className="mt-6 flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse delay-200"></div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {/* Book Collection */}
              {documents.map((doc, index) => (
                <div 
                  key={doc.id} 
                  className="group cursor-pointer"
                  onClick={(e) => {
                    // 액션 버튼 영역 클릭이 아닐 때만 문서 선택
                    const target = e.target as HTMLElement
                    if (!target.closest('.action-buttons')) {
                      onDocumentSelect(doc)
                    }
                  }}
                >
                  {/* Book Cover with subtle color */}
                  <div className="relative transform transition-all duration-200 hover:scale-105 hover:-translate-y-1">
                    <div className={`h-48 w-full rounded-lg shadow-md hover:shadow-xl relative overflow-hidden border-l-4 
                      ${index % 6 === 0 ? 'bg-red-50 border-l-red-400' :
                        index % 6 === 1 ? 'bg-blue-50 border-l-blue-400' :
                        index % 6 === 2 ? 'bg-green-50 border-l-green-400' :
                        index % 6 === 3 ? 'bg-purple-50 border-l-purple-400' :
                        index % 6 === 4 ? 'bg-orange-50 border-l-orange-400' :
                        'bg-teal-50 border-l-teal-400'
                      }
                    `}>
                      {/* Simple book spine effect */}
                      <div className="absolute top-0 left-0 w-3 h-full bg-gradient-to-r from-black/5 to-transparent"></div>
                      
                      {/* Book content */}
                      <div className="p-4 pl-6 h-full flex flex-col justify-between text-gray-800 relative">
                        <div>
                          {/* Action buttons - appear on hover */}
                          <div className="action-buttons absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1 pointer-events-auto z-10">
                            <button
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation()
                                e.preventDefault()
                                console.log('공유 버튼 클릭됨:', doc.title)
                                onDocumentShare?.(doc, e)
                              }}
                              className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded-full shadow-md transition-colors duration-200 pointer-events-auto z-20 relative"
                              title="문서 공유"
                            >
                              <Share2 size={12} />
                            </button>
                            <button
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation()
                                e.preventDefault()
                                console.log('삭제 버튼 클릭됨:', doc.title)
                                onDocumentDelete?.(doc, e)
                              }}
                              className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md transition-colors duration-200 pointer-events-auto z-20 relative"
                              title="문서 삭제"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {/* Status indicator */}
                          {doc.is_shared && (
                            <div className="absolute top-2 right-2 group-hover:opacity-0 transition-opacity duration-200 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                              <Users size={10} />
                              <span>공유</span>
                            </div>
                          )}
                          
                          <div className="flex items-center mb-3">
                            <FileText size={16} className="text-gray-600" />
                          </div>
                          
                          <h4 className="text-sm font-bold leading-tight line-clamp-3 mb-3 text-gray-900">
                            {doc.title}
                          </h4>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500 font-medium">
                            {new Date(doc.created_at).toLocaleDateString('ko-KR')}
                          </div>
                          <div className="text-xs text-gray-400">
                            {(doc.file_size / 1024 / 1024).toFixed(1)} MB
                          </div>
                        </div>
                      </div>
                      
                      {/* Subtle shadow for depth */}
                      <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-black/5"></div>
                    </div>
                    
                    {/* Book base shadow */}
                    <div className="absolute -bottom-1 left-1 right-1 h-2 bg-black/10 rounded-full blur-sm group-hover:bg-black/20 transition-colors duration-200"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 최근 학습 활동 */}
      <div className="library-card rounded-xl bg-white shadow-md">
        <div className="p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center shadow-inner">
              <Hash className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <h3 className="library-title text-2xl text-amber-900">최근 학습 활동</h3>
              <p className="library-text text-sm opacity-70">지식 여정의 발자취</p>
            </div>
          </div>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-amber-600" />
              </div>
              <p className="library-text opacity-70 text-lg">
                첫 번째 문서를 업로드하면<br/>
                학습 활동 기록이 시작됩니다
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.slice(0, 5).map((doc, index) => (
                <div key={doc.id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <FileText size={18} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="library-text font-semibold text-amber-900 truncate">
                      {doc.title}
                    </p>
                    <p className="library-text text-sm opacity-70">
                      새로운 문서가 도서관에 추가되었습니다
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="library-text text-xs opacity-60">
                      {new Date(doc.created_at).toLocaleDateString('ko-KR')}
                    </p>
                    <p className="library-text text-xs opacity-50">
                      {new Date(doc.created_at).toLocaleTimeString('ko-KR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}