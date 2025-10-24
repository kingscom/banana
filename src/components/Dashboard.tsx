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
  Target
} from 'lucide-react'

export default function Dashboard() {
  const { user, userProfile, needsProfileSetup, loading, signOut, refreshUserProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [uploadedPDFs, setUploadedPDFs] = useState<Array<{id: string, name: string, file: File}>>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [highlights, setHighlights] = useState<any[]>([])
  const [learningProgress, setLearningProgress] = useState<any[]>([])
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
      // 실제 Supabase가 연결되지 않은 경우 데모 데이터 사용
      if (user.id.startsWith('demo-user-')) {
        setDocuments([])
        setHighlights([])
        setLearningProgress([])
        return
      }
      
      const [docs, progress] = await Promise.all([
        db.getDocuments(user.id),
        db.getLearningProgress(user.id)
      ])
      
      setDocuments(docs || [])
      setLearningProgress(progress || [])
      
      // 문서가 있으면 하이라이트도 로드
      if (docs && docs.length > 0) {
        const allHighlights = await Promise.all(
          docs.map(doc => db.getHighlights(doc.id))
        )
        setHighlights(allHighlights.flat() || [])
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      // 에러 시 빈 배열로 초기화
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

  const handlePDFUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newPDFs = Array.from(files).map(file => ({
        id: Date.now() + Math.random().toString(36),
        name: file.name,
        file
      }))
      setUploadedPDFs(prev => [...prev, ...newPDFs])
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                AI Knowledge Factory
              </h1>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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

            {/* Uploaded PDFs */}
            {uploadedPDFs.length > 0 && (
              <div className="pt-2">
                <h3 className="px-4 text-sm font-medium text-gray-900 mb-2">
                  업로드된 문서
                </h3>
                <div className="space-y-1">
                  {uploadedPDFs.map((pdf) => (
                    <div
                      key={pdf.id}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer truncate"
                      onClick={() => setActiveTab('reader')}
                    >
                      <div className="flex items-center space-x-2">
                        <FileText size={16} />
                        <span className="truncate">{pdf.name}</span>
                      </div>
                    </div>
                  ))}
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
              />
            )}
            {activeTab === 'reader' && <PDFReader pdfs={uploadedPDFs} />}
            {activeTab === 'concept' && <ConceptMap />}
            {activeTab === 'recommendations' && <CourseRecommendation />}
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardContent({ pdfs, documents, highlights, learningProgress }: { 
  pdfs: Array<{id: string, name: string, file: File}>
  documents: any[]
  highlights: any[]
  learningProgress: any[]
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">대시보드</h2>
        <p className="text-gray-600">AI 기반 학습 현황을 한눈에 확인하세요</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">업로드된 문서</p>
              <p className="text-2xl font-bold text-gray-900">{documents.length + pdfs.length}</p>
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
              <p className="text-sm text-gray-600">학습 진행률</p>
              <p className="text-2xl font-bold text-gray-900">
                {learningProgress.length > 0 
                  ? Math.round(learningProgress.reduce((acc, p) => acc + p.progress_percentage, 0) / learningProgress.length)
                  : 0}%
              </p>
            </div>
            <Target className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 활동</h3>
          {pdfs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              PDF 문서를 업로드하여 AI 학습을 시작하세요!
            </p>
          ) : (
            <div className="space-y-3">
              {pdfs.slice(0, 5).map((pdf) => (
                <div key={pdf.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                  <FileText size={16} className="text-gray-600" />
                  <span className="text-sm text-gray-900">{pdf.name} 업로드됨</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}