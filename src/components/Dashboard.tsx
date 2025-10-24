'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { db, supabase } from '@/lib/supabase'
import PDFReader from './PDFReader'
import ConceptMap from './ConceptMap'
import CourseRecommendation from './CourseRecommendation'
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
  Trash2
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

  // Load user data from Supabase
  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user])

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

  const loadUserData = async () => {
    if (!user) return
    
    try {
      console.log('📊 사용자 데이터 로딩 시작:', user.id)
      
      // documents 테이블에서 직접 데이터 가져오기
      const response = await fetch(`/api/documents?user_id=${user.id}`)
      const result = await response.json()
      
      if (response.ok) {
        console.log('📄 로드된 문서들:', result.data)
        setDocuments(result.data || [])
        
        // 문서가 있으면 하이라이트도 로드
        if (result.data && result.data.length > 0) {
          const allHighlights = await Promise.all(
            result.data.map(async (doc: any) => {
              const hlResponse = await fetch(`/api/highlights?document_id=${doc.id}&user_id=${user.id}`)
              const hlResult = await hlResponse.json()
              return hlResult.data || []
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
    // 선택된 문서 설정
    setSelectedDocument(document)
    console.log('선택된 문서:', document.title)
    // PDF Reader 탭으로 이동
    setActiveTab('reader')
  }

  const handleDocumentDelete = async (document: any, event: React.MouseEvent) => {
    event.stopPropagation() // 문서 선택 이벤트 방지
    
    if (!user) return
    
    const confirmDelete = window.confirm(`"${document.title}"을(를) 삭제하시겠습니까?\n관련된 모든 하이라이트도 함께 삭제됩니다.`)
    
    if (!confirmDelete) return
    
    try {
      console.log('문서 삭제 시작:', document.id)
      
      const response = await fetch(`/api/documents?id=${document.id}&user_id=${user.id}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (response.ok) {
        console.log('문서 삭제 성공')
        // 문서 목록 새로고침
        await loadUserData()
        alert('문서가 성공적으로 삭제되었습니다.')
      } else {
        console.error('문서 삭제 실패:', result.error)
        alert('문서 삭제에 실패했습니다: ' + result.error)
      }
    } catch (error) {
      console.error('문서 삭제 중 오류:', error)
      alert('문서 삭제 중 오류가 발생했습니다.')
    }
  }

  const tabs = [
    { id: 'dashboard', name: '대시보드', icon: BarChart3 },
    { id: 'reader', name: 'PDF 리더', icon: BookOpen },
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
                user={user}
              />
            )}
            {activeTab === 'reader' && selectedDocument && <PDFReader pdfs={[{
              id: selectedDocument.id,
              name: selectedDocument.title,
              file: null, // 서버에서 로드할 파일
              document: selectedDocument
            }]} />}
            {activeTab === 'reader' && !selectedDocument && (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">문서를 선택하세요</h3>
                  <p className="text-gray-500">대시보드에서 읽고 싶은 문서를 클릭하세요.</p>
                </div>
              </div>
            )}
            {activeTab === 'concept' && <ConceptMap />}
            {activeTab === 'recommendations' && <CourseRecommendation />}
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardContent({ pdfs, documents, highlights, learningProgress, onDocumentSelect, onDocumentDelete, user }: { 
  pdfs: Array<{id: string, name: string, file: File}>
  documents: any[]
  highlights: any[]
  learningProgress: any[]
  onDocumentSelect: (document: any) => void
  onDocumentDelete?: (document: any, event: React.MouseEvent) => Promise<void>
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
                    <FileText size={20} className="text-blue-600 mt-1" />
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
                    </div>
                    {/* 삭제 버튼 */}
                    <button
                      onClick={(e) => onDocumentDelete && onDocumentDelete(doc, e)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-red-100 text-red-600 hover:text-red-800 transition-all"
                      title="문서 삭제"
                    >
                      <Trash2 size={16} />
                    </button>
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