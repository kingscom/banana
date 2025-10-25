# � 나만의 AI 스터디룸

AI와 함께하는 개인 학습 공간으로, PDF 문서를 기반으로 한 스마트한 지식 관리 및 학습 플랫폼

## 📋 프로젝트 개요

**나만의 AI 스터디룸**은 PDF 문서를 중심으로 하이라이트, 노트 작성, AI 요약, 개념 연결맵, 학습 분석 등의 기능을 통합 제공하여 사용자가 체계적으로 지식을 관리하고 깊이 있게 학습할 수 있는 개인 맞춤형 디지털 도서관입니다.

## ✨ 주요 기능

### � 통합 대시보드
- **서적 컬렉션**: 업로드된 PDF 문서들을 도서관 스타일로 관리
- **학습 현황**: 소장 도서 수, 필사 기록, 보관 용량을 한눈에 확인
- **최근 활동**: 문서 업로드 이력과 학습 진행 상황 추적
- **개인 맞춤형 대시보드**: 사용자별 학습 패턴 분석 및 시각화

### 📖 고급 PDF 리더
- **스마트 하이라이트**: 텍스트 선택 후 클릭 한 번으로 하이라이트 생성
- **페이지 네비게이션**: 직접 페이지 번호 입력으로 빠른 이동
- **부드러운 페이지 전환**: 자연스러운 슬라이드 애니메이션
- **하이라이트 관리**: 실시간 저장 및 사이드바에서 통합 관리
- **AI 요약 기능**: 문서 내용에 대한 즉석 요약 생성

### 📊 하이라이트 분석 (Analytics)
- **하이라이트 빈도 분석**: 가장 많이 하이라이트된 키워드 발견
- **학습 패턴 분석**: 시간대별, 문서별 학습 활동 시각화
- **키워드 트렌드**: 학습 관심사의 변화 추적
- **빠른 네비게이션**: 하이라이트 클릭으로 해당 페이지로 즉시 이동

### 🧠 개념 연결맵
- **지식 네트워크 시각화**: 학습한 개념들 간의 관계도 생성
- **개념 클러스터 분석**: 관련 개념들을 그룹화하여 체계적 학습
- **인터랙티브 맵**: 드래그 앤 드롭으로 개념 관계 편집
- **학습 경로 추천**: 개념 맵 기반 다음 학습 주제 제안

### 🎓 맞춤형 강좌 추천
- **AI 기반 추천**: 하이라이트와 노트 분석을 통한 관련 강좌 추천
- **학습 수준 고려**: 현재 학습 진도에 맞는 난이도 조절
- **다양한 플랫폼 연동**: 주요 온라인 강의 플랫폼 정보 제공
- **개인화된 학습 경로**: 장기적 학습 목표에 맞는 커리큘럼 제안

### 🔐 사용자 관리 시스템
- **Google OAuth 로그인**: 간편하고 안전한 소셜 로그인
- **프로필 관리**: 사용자 정보, 학습 목표, 관심 분야 설정
- **문서 공유**: 다른 사용자와 문서 및 하이라이트 공유
- **개인정보 보호**: Row Level Security로 개인 데이터 완전 격리

## 🛠️ 기술 스택

### Frontend
- **Next.js 14.0+**: App Router 기반 최신 React 프레임워크
- **React 18**: 함수형 컴포넌트와 Hooks 기반 개발
- **TypeScript**: 타입 안전성을 위한 정적 타입 언어
- **Tailwind CSS**: 유틸리티 퍼스트 CSS 프레임워크

### Backend & Database
- **Supabase**: PostgreSQL 기반 BaaS (Backend as a Service)
- **Supabase Auth**: Google OAuth 통합 인증 시스템
- **Row Level Security (RLS)**: 사용자별 데이터 접근 제어
- **Real-time Subscriptions**: 실시간 데이터 동기화

### PDF & File Processing
- **React-PDF 7.5.1**: PDF 렌더링 및 상호작용
- **PDF.js**: 브라우저 기반 PDF 처리 엔진
- **File Upload API**: 멀티파트 파일 업로드 처리
- **Supabase Storage**: 클라우드 파일 저장소

### UI/UX
- **Lucide React**: 모던하고 일관된 아이콘 시스템
- **Framer Motion**: 부드러운 애니메이션 (선택적)
- **Responsive Design**: 모바일 친화적 반응형 디자인
- **Dark/Light Mode**: 다크모드 지원 (준비 중)

### AI & Analytics
- **OpenAI API**: GPT 기반 문서 요약 및 질의응답
- **Custom Analytics**: 하이라이트 빈도 및 학습 패턴 분석
- **Data Visualization**: Chart.js/D3.js 기반 데이터 시각화

## 🚀 시작하기

### 필수 요구사항

- Node.js 18.0 이상
- npm 또는 yarn
- Supabase 프로젝트
- OpenAI API 키 (선택사항)

### 설치 및 실행

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **환경 변수 설정**
   
   `.env.example` 파일을 참고하여 `.env.local` 파일을 생성하고 다음 값들을 설정하세요:
   
   ```bash
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   
   # OpenAI Configuration (선택사항)
   OPENAI_API_KEY=your-openai-api-key-here
   
   # Application Settings
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **데이터베이스 스키마 설정**
   
   Supabase 프로젝트의 SQL Editor에서 `supabase/schema.sql` 파일의 내용을 실행하세요.

4. **개발 서버 실행**
   ```bash
   npm run dev
   ```

5. **브라우저에서 확인**
   
   http://localhost:3000에서 애플리케이션을 확인할 수 있습니다.
   (포트 3000이 사용 중이면 자동으로 3001 포트를 사용합니다)

## 🔧 빌드 및 배포

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# 린트 검사
npm run lint
```

## 📁 프로젝트 구조

```
src/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API Routes
│   │   ├── courses/       # 강좌 추천 API
│   │   ├── documents/     # 문서 관리 API
│   │   ├── files/         # 파일 서빙 API
│   │   ├── highlights/    # 하이라이트 API
│   │   ├── share/         # 문서 공유 API
│   │   ├── summarize/     # AI 요약 API
│   │   ├── upload/        # 파일 업로드 API
│   │   └── users/         # 사용자 관리 API
│   ├── auth/              # 인증 관련 라우트
│   │   └── callback/      # OAuth 콜백 처리
│   ├── globals.css        # 글로벌 스타일 & 애니메이션
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx          # 메인 페이지 (로그인)
├── components/            # React 컴포넌트
│   ├── AuthProvider.tsx   # 인증 컨텍스트 제공자
│   ├── AuthWrapper.tsx    # 인증 상태 확인 래퍼
│   ├── ConceptMap.tsx     # 개념 연결맵 시각화
│   ├── CourseRecommendation.tsx  # AI 기반 강좌 추천
│   ├── Dashboard.tsx      # 메인 대시보드 & 네비게이션
│   ├── HighlightAnalytics.tsx    # 하이라이트 분석 차트
│   ├── LoginForm.tsx      # Google OAuth 로그인
│   ├── PDFReader.tsx      # 고급 PDF 뷰어 & 하이라이트
│   ├── ProfileSetup.tsx   # 초기 프로필 설정
│   ├── Providers.tsx      # Context Providers 통합
│   └── UserProfileModal.tsx      # 사용자 프로필 관리
├── lib/
│   └── supabase.ts        # Supabase 클라이언트 & DB 헬퍼
└── middleware.ts          # Next.js 미들웨어 (인증)

supabase/                  # 데이터베이스 스키마 및 설정
├── schema.sql            # 전체 데이터베이스 스키마
├── schema_simple.sql     # 간소화된 스키마
└── test_queries.sql      # 테스트용 쿼리들
```

## 🔐 데이터베이스 및 인증 설정

### Supabase 설정 방법

1. [Supabase](https://supabase.com/)에서 새 프로젝트 생성
2. SQL 에디터에서 `supabase/schema.sql` 파일 내용 실행
3. Authentication → Providers → Google 활성화
4. 프로젝트 설정에서 API URL과 anon key를 `.env.local`에 입력

### Google OAuth 설정

Supabase Authentication에서 Google OAuth를 설정하려면:
1. Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성
2. Supabase Authentication 설정에서 Google Provider 구성
3. 승인된 리디렉션 URI에 Supabase 콜백 URL 추가

### 데이터베이스 스키마

프로젝트에 필요한 주요 테이블들:
- **user_profiles**: 사용자 프로필 및 설정 정보
- **documents**: PDF 문서 메타데이터 및 파일 정보
- **highlights**: 사용자가 생성한 하이라이트 데이터 (위치, 텍스트, 노트)
- **notes**: 페이지별 사용자 노트 및 메모
- **concepts**: 개념 맵의 개념 노드
- **concept_connections**: 개념 간 연결 관계
- **learning_progress**: 문서별 학습 진행률 및 통계
- **shared_documents**: 문서 공유 관리
- **course_recommendations**: AI 기반 강좌 추천 결과

## 🤖 AI 기능

### OpenAI API 설정

AI 요약 및 질의응답 기능을 사용하려면 OpenAI API 키가 필요합니다:

1. [OpenAI Platform](https://platform.openai.com/)에서 API 키 발급
2. `.env.local`에 `OPENAI_API_KEY` 설정
3. API 키가 없어도 시뮬레이션 모드로 동작 가능

### 지원하는 AI 기능

- 📄 **문서 요약**: PDF 내용을 주요 포인트별로 요약
- ❓ **질의응답**: 문서 내용에 대한 자연어 질문과 답변
- 🎯 **맞춤 추천**: 학습 패턴 기반 콘텐츠 추천

## 🎨 사용법

### 1. 시작하기
- **Google 계정 로그인**: Supabase Auth를 통한 간편 소셜 로그인
- **프로필 설정**: 초기 로그인 시 이름, 부서, 학습 목표 설정
- **대시보드 확인**: 개인 맞춤형 학습 현황 파악

### 2. 문서 관리
- **PDF 업로드**: 좌측 사이드바 "문서 추가" 섹션에서 여러 PDF 동시 업로드
- **서적 컬렉션**: 도서관 스타일 인터페이스로 업로드된 문서 관리
- **문서 공유**: 다른 사용자와 문서 및 하이라이트 공유
- **문서 삭제**: 불필요한 문서 및 관련 데이터 완전 삭제

### 3. 스마트 읽기 & 학습
- **PDF 뷰어**: 고급 PDF 리더로 문서 열람
- **페이지 네비게이션**: 상단 입력 필드로 원하는 페이지 직접 이동
- **텍스트 하이라이트**: 마우스로 텍스트 선택 후 하이라이트 버튼 클릭
- **사이드바 관리**: 우측에서 모든 하이라이트 통합 관리
- **AI 요약**: 문서 내용에 대한 즉석 AI 요약 생성

### 4. 학습 분석 & 인사이트
- **하이라이트 분석**: 가장 많이 하이라이트한 키워드 및 패턴 확인
- **학습 통계**: 문서별, 시간대별 학습 활동 시각화
- **빠른 네비게이션**: 분석 차트에서 하이라이트 클릭으로 해당 위치 즉시 이동
- **진행률 추적**: 개인 학습 진도 자동 측정 및 기록

### 5. 지식 네트워크 구축
- **개념 연결맵**: 학습한 개념들 간의 관계 시각적 표현
- **인터랙티브 편집**: 드래그 앤 드롭으로 개념 관계 수정
- **클러스터 분석**: 관련 개념들을 그룹화하여 체계적 이해
- **학습 경로 추천**: 개념 맵 분석 기반 다음 학습 주제 제안

### 6. 맞춤형 학습 경로
- **AI 강좌 추천**: 하이라이트 패턴 분석 기반 관련 강의 추천
- **다단계 추천**: 초급/중급/고급 수준별 콘텐츠 제공
- **외부 플랫폼 연동**: 주요 온라인 강의 사이트 링크 제공
- **장기 학습 계획**: 개인 목표에 맞는 커리큘럼 설계

## 🚨 알려진 제한사항

### 기술적 제약사항
- **PDF 뷰어**: 브라우저별 PDF.js 호환성에 따른 성능 차이 존재
- **파일 크기**: 대용량 PDF (50MB 이상) 업로드 시 처리 시간 지연 가능
- **브라우저 지원**: Chrome, Firefox, Safari, Edge 최신 버전 권장
- **모바일 지원**: 현재 데스크톱 우선 최적화 (모바일 개선 예정)

### 기능적 제약사항
- **AI 기능**: OpenAI API 키 없이는 시뮬레이션 모드로 제한 동작
- **실시간 협업**: 현재 개인 사용자 중심 (팀 협업 기능 개발 예정)
- **언어 지원**: 한국어/영어 PDF 최적화 (다국어 지원 확장 예정)
- **파일 형식**: PDF만 지원 (향후 EPUB, DOCX 등 확장 계획)

### 환경 요구사항
- **Supabase 설정**: 프로젝트 생성 및 환경 변수 필수 설정
- **Google OAuth**: Supabase Auth 설정 및 Google Cloud Console 연동 필요
- **네트워크**: 안정적인 인터넷 연결 (클라우드 기반 서비스)
- **저장 용량**: Supabase 무료 플랜 500MB 제한 (유료 플랜 권장)

## 📊 데이터베이스 구조

### 사용자 관련 테이블
```sql
-- 사용자 프로필 (확장된 사용자 정보)
user_profiles (id, display_name, avatar_url, department, learning_goals...)

-- Supabase Auth Users (기본 인증)
auth.users (id, email, created_at...)
```

### 문서 관리 테이블
```sql
-- 문서 메타데이터
documents (id, user_id, title, file_name, file_size, upload_date...)

-- 문서 공유 관리
shared_documents (id, document_id, shared_by, shared_with, permissions...)
```

### 학습 데이터 테이블
```sql
-- 하이라이트 (위치 정보 포함)
highlights (id, document_id, user_id, page_number, selected_text, 
           position_x, position_y, position_width, position_height...)

-- 사용자 노트
notes (id, document_id, user_id, page_number, content, position_x, position_y...)

-- 학습 진행률
learning_progress (id, user_id, document_id, pages_read, time_spent...)
```

### 지식 관리 테이블
```sql
-- 개념 노드
concepts (id, user_id, name, description, color, position_x, position_y...)

-- 개념 연결
concept_connections (id, user_id, source_concept_id, target_concept_id, relationship...)

-- AI 강좌 추천
course_recommendations (id, user_id, title, platform, url, relevance_score...)
```

### 보안 및 접근 제어
- **Row Level Security (RLS)**: 모든 테이블에 적용, 사용자별 데이터 완전 격리
- **실시간 구독**: Supabase Realtime으로 데이터 변경 즉시 반영
- **UUID 기반 ID**: 보안성 강화된 고유 식별자 사용
- **외래 키 제약**: 데이터 무결성 및 CASCADE 삭제 보장

## 🤝 기여하기

1. 이 저장소를 Fork
2. 새로운 브랜치 생성 (`git checkout -b feature/새기능`)
3. 변경사항 커밋 (`git commit -am '새 기능 추가'`)
4. 브랜치에 Push (`git push origin feature/새기능`)
5. Pull Request 생성

## 📝 라이센스

이 프로젝트는 MIT 라이센스 하에 있습니다.

## 🙋‍♂️ 지원 및 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 Issue를 생성해 주세요.

## 🔧 개발 환경 및 도구

### 개발 도구
- **VS Code**: 권장 개발 환경 + TypeScript/React 확장
- **Git**: 버전 관리 및 협업
- **Chrome DevTools**: 디버깅 및 성능 분석
- **Supabase Studio**: 데이터베이스 관리 및 모니터링

### 배포 환경
- **Vercel**: Next.js 최적화 호스팅 (권장)
- **Netlify**: 대안 호스팅 플랫폼
- **Supabase**: 데이터베이스 및 인증 서비스
- **Domain**: 커스텀 도메인 연결 가능

## 🚀 향후 개발 계획

### 단기 목표 (1-3개월)
- [ ] 모바일 반응형 최적화
- [ ] 다크 모드 지원
- [ ] PDF 내 검색 기능
- [ ] 하이라이트 색상 커스터마이징
- [ ] 문서 내 북마크 기능

### 중기 목표 (3-6개월)
- [ ] 팀 협업 기능 (팀 스페이스, 공동 하이라이트)
- [ ] 다국어 지원 (영어, 일본어, 중국어)
- [ ] EPUB, DOCX 파일 지원
- [ ] 음성 메모 및 TTS 기능
- [ ] 고급 AI 분석 (요약 품질 개선, 질의응답 정확도 향상)

### 장기 목표 (6개월 이상)
- [ ] 모바일 앱 개발 (React Native)
- [ ] 오프라인 모드 지원
- [ ] 플러그인 시스템 (서드파티 확장)
- [ ] 기업용 버전 (SSO, 고급 관리 기능)
- [ ] AI 튜터 기능 (개인화된 학습 코칭)

## 🤝 커뮤니티 및 지원

### 개발자 커뮤니티
- **GitHub Discussions**: 기능 제안 및 토론
- **Discord**: 실시간 개발자 채팅 (예정)
- **블로그**: 개발 과정 및 기술 공유
- **YouTube**: 튜토리얼 및 데모 영상

### 지원 채널
- **GitHub Issues**: 버그 리포트 및 기능 요청
- **이메일 지원**: 긴급 문의 및 기술 지원
- **문서**: 상세한 API 문서 및 가이드
- **FAQ**: 자주 묻는 질문과 답변

---

**Made with 💙 by AI Study Room Team**  
*AI와 함께하는 개인 학습 공간을 만들어갑니다*