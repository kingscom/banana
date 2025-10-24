'use client'

import { useState, useEffect } from 'react'

interface Course {
  id: string
  title: string
  description: string
  provider: string
  level: 'beginner' | 'intermediate' | 'advanced'
  duration: string
  rating: number
  tags: string[]
  imageUrl?: string
}

export default function CourseRecommendation() {
  const [courses, setCourses] = useState<Course[]>([
    {
      id: '1',
      title: 'AI 기초와 머신러닝',
      description: '인공지능의 기본 개념부터 실제 적용까지 학습할 수 있는 종합 과정입니다.',
      provider: 'AI Academy',
      level: 'beginner',
      duration: '8주',
      rating: 4.5,
      tags: ['AI', '머신러닝', '파이썬']
    },
    {
      id: '2',
      title: 'React와 Node.js로 풀스택 개발',
      description: '현대적인 웹 개발 기술을 활용한 풀스택 애플리케이션 개발 과정입니다.',
      provider: 'Web Dev Pro',
      level: 'intermediate',
      duration: '12주',
      rating: 4.8,
      tags: ['React', 'Node.js', '풀스택']
    },
    {
      id: '3',
      title: 'PDF 처리와 문서 분석',
      description: 'PDF 문서를 활용한 데이터 추출 및 자동화 기법을 학습합니다.',
      provider: 'Document Masters',
      level: 'intermediate',
      duration: '6주',
      rating: 4.3,
      tags: ['PDF', '문서처리', '자동화']
    },
    {
      id: '4',
      title: '자연어 처리 심화',
      description: '텍스트 분석과 언어 모델을 활용한 고급 NLP 기법을 다룹니다.',
      provider: 'NLP Institute',
      level: 'advanced',
      duration: '10주',
      rating: 4.7,
      tags: ['NLP', '텍스트분석', '언어모델']
    }
  ])

  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')

  const filteredCourses = courses.filter(course => {
    const levelMatch = selectedLevel === 'all' || course.level === selectedLevel
    const tagMatch = selectedTag === 'all' || course.tags.some(tag => tag === selectedTag)
    const searchMatch = searchTerm === '' || 
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return levelMatch && tagMatch && searchMatch
  })

  const allTags = Array.from(new Set(courses.flatMap(course => course.tags)))

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">추천 강좌</h2>
        <p className="text-gray-600">
          학습 이력과 관심사를 바탕으로 맞춤형 강의를 추천해드립니다.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-60">
            <input
              type="text"
              placeholder="강의 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
        </div>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map(course => (
          <div key={course.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            {/* Course Image Placeholder */}
            <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-t-lg flex items-center justify-center">
              <div className="text-white text-center">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="font-semibold text-lg">{course.title}</h3>
              </div>
            </div>

            <div className="p-4">
              {/* Course Info */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getLevelColor(course.level)}`}>
                    {getLevelText(course.level)}
                  </span>
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-sm text-gray-600">{course.rating}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{course.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                  <span>{course.provider}</span>
                  <span>{course.duration}</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {course.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Action Button */}
              <button className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                강의 보기
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">검색 결과가 없습니다</h3>
            <p className="mt-2 text-sm text-gray-500">
              다른 검색어나 필터 조건을 시도해보세요.
            </p>
          </div>
        </div>
      )}

      {/* AI Recommendation Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              AI 맞춤 추천
            </h3>
            <p className="text-gray-700 mb-3">
              당신의 학습 패턴을 분석한 결과, <strong>React와 Node.js</strong> 관련 강의를 
              추천드립니다. PDF 처리 기능에 관심을 보이셨군요!
            </p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors">
              개인화 추천 받기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}