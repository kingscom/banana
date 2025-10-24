'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthProvider'
import { ExternalLink, Star, Clock, User, BookOpen, Plus, Edit3, Trash2, Search, Filter, X, CheckCircle, AlertTriangle, XCircle, AlertCircle, Hash, FileText } from 'lucide-react'

interface Course {
  id: string
  title: string
  category: string
  description: string
  image_url: string | null
  course_url: string
  tags: string[]
  instructor_name: string
  duration: string
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  platform?: string
  language: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export default function CourseRecommendation() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  
  // 토스트 알림 상태
  const [toast, setToast] = useState<{
    show: boolean
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
  }>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  })

  // 확인 모달 상태
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    title: string
    message: string
    onConfirm: () => void
    onCancel: () => void
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  })
  const [sortBy, setSortBy] = useState<string>('created_at')

  // 강의 목록 로드
  const loadCourses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        category: selectedCategory === 'all' ? '' : selectedCategory,
        difficulty: selectedLevel === 'all' ? '' : selectedLevel,
        sort_by: sortBy,
        limit: '100'
      })

      const response = await fetch(`/api/courses?${params}`)
      const result = await response.json()

      if (response.ok) {
        setCourses(result.data || [])
      } else {
        console.error('강의 로드 실패:', result.error)
      }
    } catch (error) {
      console.error('강의 로드 중 오류:', error)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, selectedCategory, selectedLevel, sortBy])

  // 검색 및 필터링
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      loadCourses()
    }, 300)

    return () => clearTimeout(delayedSearch)
  }, [loadCourses])

  // 외부에서 검색 키워드가 전달되는 이벤트 리스너
  useEffect(() => {
    const handleSearchCourses = (event: any) => {
      const keyword = event.detail?.keyword
      if (keyword) {
        // 필터 초기화 (더 정확한 검색을 위해)
        setSelectedCategory('all')
        setSelectedLevel('all')
        setSelectedTag('all')
        setSearchTerm(keyword)
        
        // 검색어 설정 후 즉시 검색 실행
        setTimeout(() => {
          loadCourses()
        }, 100)
      }
    }

    window.addEventListener('searchCourses', handleSearchCourses)
    return () => window.removeEventListener('searchCourses', handleSearchCourses)
  }, [loadCourses])

  // 토스트 표시 함수
  const showToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setToast({ show: true, type, title, message })
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }))
    }, 4000)
  }

  // 확인 모달 표시 함수
  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      show: true,
      title,
      message,
      onConfirm: () => {
        onConfirm()
        setConfirmModal(prev => ({ ...prev, show: false }))
      },
      onCancel: () => {
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  const filteredCourses = courses.filter(course => {
    const tagMatch = selectedTag === 'all' || course.tags.some(tag => tag === selectedTag)
    return tagMatch
  })

  const allTags = Array.from(new Set(courses.flatMap(course => course.tags)))
  const allCategories = Array.from(new Set(courses.map(course => course.category)))

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner':
        return '초급'
      case 'intermediate':
        return '중급'
      case 'advanced':
        return '고급'
      default:
        return level
    }
  }

  const handleCourseClick = (course: Course) => {
    // 새 탭에서 강의 페이지 열기
    window.open(course.course_url, '_blank')
  }

  const handleDelete = async (courseId: string) => {
    showConfirm(
      '강의 삭제',
      '정말로 이 강의를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      async () => {
        try {
          const response = await fetch(`/api/courses?id=${courseId}`, {
            method: 'DELETE'
          })

          if (response.ok) {
            loadCourses()
            showToast('success', '삭제 완료', '강의가 성공적으로 삭제되었습니다.')
          } else {
            const result = await response.json()
            showToast('error', '삭제 실패', result.error || '알 수 없는 오류가 발생했습니다.')
          }
        } catch (error) {
          console.error('강의 삭제 중 오류:', error)
          showToast('error', '삭제 오류', '강의 삭제 중 오류가 발생했습니다.')
        }
      }
    )
  }

  const handleCreate = async (courseData: any) => {
    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(courseData)
      })

      if (response.ok) {
        loadCourses()
        showToast('success', '추가 완료', '새로운 강의가 성공적으로 추가되었습니다.')
      } else {
        const result = await response.json()
        showToast('error', '추가 실패', result.error || '알 수 없는 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('강의 추가 중 오류:', error)
      showToast('error', '추가 오류', '강의 추가 중 오류가 발생했습니다.')
    }
  }

  const handleUpdate = async (courseData: any) => {
    try {
      const response = await fetch(`/api/courses?id=${courseData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(courseData)
      })

      if (response.ok) {
        loadCourses()
        showToast('success', '수정 완료', '강의 정보가 성공적으로 수정되었습니다.')
      } else {
        const result = await response.json()
        showToast('error', '수정 실패', result.error || '알 수 없는 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('강의 수정 중 오류:', error)
      showToast('error', '수정 오류', '강의 수정 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">추천 강좌</h2>
          <p className="text-gray-600">
            모든 사용자가 공유하는 강의 목록입니다. 누구나 강의를 추가하고 관리할 수 있습니다.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span>강의 추가</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-60 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="강의명, 강사명, 태그로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 카테고리</option>
              {allCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 난이도</option>
              <option value="beginner">초급</option>
              <option value="intermediate">중급</option>
              <option value="advanced">고급</option>
            </select>
          </div>

          {/* Tag Filter */}
          <div>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 태그</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          {/* Sort Filter */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="created_at">최신순</option>
              <option value="title">제목순</option>
              <option value="category">카테고리순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Course Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <div key={course.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow group">
              {/* Course Image */}
              <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                {course.image_url ? (
                  <img
                    src={course.image_url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-white text-center p-4">
                    <BookOpen className="w-16 h-16 mx-auto mb-2" />
                    <p className="font-semibold text-sm line-clamp-2">{course.title}</p>
                  </div>
                )}
                
                {/* Action buttons overlay */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                  <button
                    onClick={() => {
                      setEditingCourse(course)
                      setShowEditModal(true)
                    }}
                    className="p-1 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-all"
                    title="수정"
                  >
                    <Edit3 size={14} className="text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(course.id)}
                    className="p-1 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-all"
                    title="삭제"
                  >
                    <Trash2 size={14} className="text-red-600" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                {/* Course Info */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getLevelColor(course.difficulty_level)}`}>
                      {getLevelText(course.difficulty_level)}
                    </span>
                    <div className="flex items-center space-x-2">
                      {course.platform && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {course.platform}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{course.description}</p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <div className="flex items-center space-x-1">
                      <User size={14} />
                      <span>{course.instructor_name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock size={14} />
                      <span>{course.duration}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {course.category}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {course.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                  {course.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs">
                      +{course.tags.length - 3}
                    </span>
                  )}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleCourseClick(course)}
                  className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <span>강의 보기</span>
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">강의가 없습니다</h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchTerm || selectedCategory !== 'all' || selectedLevel !== 'all' || selectedTag !== 'all'
                ? '다른 검색어나 필터 조건을 시도해보세요.'
                : '첫 번째 강의를 추가해보세요!'}
            </p>
            <button
              onClick={() => setShowAddModal(true)}  
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
            >
              강의 추가하기
            </button>
          </div>
        </div>
      )}

      {/* Statistics */}
      {!loading && courses.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{courses.length}</div>
              <div className="text-sm text-gray-600">총 강의 수</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{allCategories.length}</div>
              <div className="text-sm text-gray-600">카테고리</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{allTags.length}</div>
              <div className="text-sm text-gray-600">태그</div>
            </div>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddModal && (
        <CourseModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreate}
        />
      )}

      {/* Edit Course Modal */}
      {showEditModal && editingCourse && (
        <CourseModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingCourse(null)
          }}
          onSubmit={handleUpdate}
          initialData={editingCourse}
          isEditing
        />
      )}

      {/* 토스트 알림 */}
      {toast.show && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      )}

      {/* 확인 모달 */}
      {confirmModal.show && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}
    </div>
  )
}

// Course Modal Component
interface CourseModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  initialData?: Course
  isEditing?: boolean
}

function CourseModal({ isOpen, onClose, onSubmit, initialData, isEditing = false }: CourseModalProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    category: initialData?.category || '',
    description: initialData?.description || '',
    image_url: initialData?.image_url || '',
    course_url: initialData?.course_url || '',
    instructor_name: initialData?.instructor_name || '',
    duration: initialData?.duration || '',
    difficulty_level: (initialData?.difficulty_level || 'beginner') as 'beginner' | 'intermediate' | 'advanced',
    platform: initialData?.platform || '',
    language: initialData?.language || 'ko',
    tags: initialData?.tags?.join(', ') || ''
  })

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const submitData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      }

      if (isEditing && initialData) {
        await onSubmit({ ...submitData, id: initialData.id })
      } else {
        await onSubmit(submitData)
      }
      onClose()
    } catch (error) {
      console.error('Error submitting course:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-modal-in">
        <div className="sticky top-0 bg-white rounded-t-xl border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${isEditing ? 'bg-blue-100' : 'bg-green-100'}`}>
                {isEditing ? (
                  <Edit3 className={`w-6 h-6 ${isEditing ? 'text-blue-600' : 'text-green-600'}`} />
                ) : (
                  <Plus className="w-6 h-6 text-green-600" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {isEditing ? '강의 수정' : '새 강의 추가'}
                </h3>
                <p className="text-sm text-gray-600">
                  {isEditing ? '강의 정보를 수정해주세요' : '새로운 강의를 추가해주세요'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="p-6">

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <BookOpen className="w-4 h-4" />
                  <span>강의명 *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="강의 제목을 입력하세요"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <Hash className="w-4 h-4" />
                  <span>카테고리 *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="예: 프로그래밍, 디자인, 마케팅"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <User className="w-4 h-4" />
                  <span>강사명 *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.instructor_name}
                  onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="강사 이름을 입력하세요"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <Star className="w-4 h-4" />
                  <span>난이도 *</span>
                </label>
                <select
                  required
                  value={formData.difficulty_level}
                  onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value as 'beginner' | 'intermediate' | 'advanced' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="beginner">🟢 초급</option>
                  <option value="intermediate">🟡 중급</option>
                  <option value="advanced">🔴 고급</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <Clock className="w-4 h-4" />
                  <span>수강 시간</span>
                </label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="예: 4시간, 2주, 20강"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <ExternalLink className="w-4 h-4" />
                  <span>플랫폼</span>
                </label>
                <input
                  type="text"
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="유튜브, 유데미, 인프런, 코세라 등"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <FileText className="w-4 h-4" />
                <span>강의 설명 *</span>
              </label>
              <textarea
                required
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="강의에 대한 간단한 설명을 입력하세요..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>이미지 URL</span>
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <ExternalLink className="w-4 h-4" />
                  <span>강의 URL *</span>
                </label>
                <input
                  type="url"
                  required
                  value={formData.course_url}
                  onChange={(e) => setFormData({ ...formData, course_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="https://example.com/course"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Hash className="w-4 h-4" />
                <span>태그 (쉼표로 구분)</span>
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="React, JavaScript, Frontend, 웹개발"
              />
              <p className="text-xs text-gray-500">관련 키워드를 쉼표로 구분하여 입력하세요</p>
            </div>



            <div className="flex justify-end space-x-4 pt-8 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-3 text-white rounded-lg font-medium transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isEditing 
                    ? 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500' 
                    : 'bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-500'
                }`}
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                )}
                {isEditing ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{loading ? '처리 중...' : (isEditing ? '수정 완료' : '강의 추가')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// 토스트 알림 컴포넌트
interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  onClose: () => void
}

function Toast({ type, title, message, onClose }: ToastProps) {
  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-300',
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          titleColor: 'text-green-800',
          messageColor: 'text-green-700'
        }
      case 'error':
        return {
          bg: 'bg-red-50 border-red-300',
          icon: <XCircle className="w-5 h-5 text-red-600" />,
          titleColor: 'text-red-800',
          messageColor: 'text-red-700'
        }
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-300',
          icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
          titleColor: 'text-yellow-800',
          messageColor: 'text-yellow-700'
        }
      case 'info':
      default:
        return {
          bg: 'bg-blue-50 border-blue-300',
          icon: <AlertCircle className="w-5 h-5 text-blue-600" />,
          titleColor: 'text-blue-800',
          messageColor: 'text-blue-700'
        }
    }
  }

  const styles = getToastStyles()

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-in-down">
      <div className={`w-96 ${styles.bg} border-2 rounded-xl shadow-xl p-4`}>
        <div className="flex items-start">
          <div className="flex-shrink-0 mt-0.5">
            {styles.icon}
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className={`text-sm font-semibold ${styles.titleColor}`}>
              {title}
            </p>
            <p className={`mt-0.5 text-sm ${styles.messageColor}`}>
              {message}
            </p>
          </div>
          <div className="ml-3 flex-shrink-0">
            <button
              onClick={onClose}
              className={`inline-flex p-1 rounded-md ${styles.titleColor} hover:bg-black hover:bg-opacity-10 transition-colors`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 확인 모달 컴포넌트
interface ConfirmModalProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmModal({ title, message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
        <div className="p-6">
          {/* 아이콘과 제목 */}
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
            </div>
          </div>

          {/* 메시지 */}
          <div className="mb-6">
            <p className="text-gray-600">
              {message}
            </p>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}