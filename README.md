# 🚀 AI Knowledge Factory

AI 기반 문서 요약 및 질의응답을 통한 체계적인 지식 정리 플랫폼

## 📋 프로젝트 개요

**AI Knowledge Factory**는 PDF 문서를 중심으로 AI가 요약, 질의응답, 하이라이트, 노트 작성 기능을 통합 제공하여 학습자가 스스로 지식을 탐구하고 정리할 수 있는 'AI 기반 개인 지식 창고'입니다.

## ✨ 주요 기능

### 🎯 대시보드
- 학습 진행 현황, 하이라이트 통계, 추천 강좌를 한눈에 확인
- AI가 요약한 주요 개념 및 학습 포인트 표시

### 📖 PDF 리더
- PDF 내 하이라이트, 노트, 질문 기능 통합
- 특정 문단에 대한 **AI 요약 및 질의응답 지원**
- 실시간 텍스트 선택 및 하이라이트 기능

### 🧠 개념 연결맵
- 문서 내 개념 간 관계를 **AI가 자동 분석 및 시각화**
- 유사 개념 및 선행/후행 개념 연결
- 사용자 노트와 연동하여 **개인화된 지식 그래프 구축**

### 🎓 추천 강좌
- 학습 패턴과 노트 기반으로 관련 강의, 문서, 링크 추천
- AI가 학습 이력에 따라 맞춤형 학습 경로 제안

## 🛠️ 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Google OAuth)
- **AI Integration**: OpenAI API
- **PDF Processing**: React-PDF, PDF-lib
- **Icons**: Lucide React

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

3. **개발 서버 실행**
   ```bash
   npm run dev
   ```

4. **브라우저에서 확인**
   
   http://localhost:3000 (또는 3001)에서 애플리케이션을 확인할 수 있습니다.

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
├── app/                    # Next.js 13+ App Router
│   ├── api/               # API Routes
│   │   └── summarize/     # AI 요약 API
│   ├── globals.css        # 글로벌 스타일
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx          # 메인 페이지
├── components/            # React 컴포넌트
│   ├── AuthWrapper.tsx    # 인증 래퍼
│   ├── ConceptMap.tsx     # 개념 연결맵
│   ├── CourseRecommendation.tsx  # 강좌 추천
│   ├── Dashboard.tsx      # 대시보드
│   ├── LoginForm.tsx      # 로그인 폼
│   ├── PDFReader.tsx      # PDF 리더
│   └── Providers.tsx      # Context Providers
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

프로젝트에 필요한 테이블들:
- **documents**: PDF 문서 정보
- **highlights**: 하이라이트 데이터
- **notes**: 사용자 노트
- **concepts**: 개념 맵 데이터
- **concept_connections**: 개념 간 연결
- **learning_progress**: 학습 진행률

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

### 1. 로그인
- Google 계정으로 간편 로그인 (Supabase Auth)

### 2. PDF 업로드
- 사이드바에서 "PDF 업로드" 버튼 클릭
- 여러 PDF 파일 동시 업로드 가능
- 업로드된 문서는 Supabase에 자동 저장

### 3. 문서 읽기 및 학습
- PDF 리더에서 텍스트 선택 후 하이라이트 추가
- "AI 요약" 버튼으로 즉시 요약 생성
- 질문 입력으로 AI와 상호작용
- 모든 하이라이트와 노트는 실시간으로 데이터베이스에 저장

### 4. 개념 정리
- 개념 연결맵에서 학습 내용 시각화
- 개념 간 관계 설정 및 편집
- 개념 맵은 사용자별로 개별 저장 및 관리

### 5. 맞춤 학습
- 추천 강좌에서 관련 콘텐츠 탐색
- AI 기반 개인화된 학습 경로 확인
- 학습 진행률 자동 추적 및 저장

## 🚨 알려진 제한사항

- PDF 뷰어는 브라우저 호환성에 따라 성능이 달라질 수 있습니다
- AI 기능은 OpenAI API 키가 있을 때 완전히 작동합니다
- Supabase 프로젝트 설정이 필요하며, 환경 변수 미설정 시 오류가 발생할 수 있습니다
- 대용량 PDF 파일의 경우 업로드 및 처리 시간이 오래 걸릴 수 있습니다

## 📊 데이터베이스 구조

### 주요 테이블
- `documents`: 업로드된 PDF 문서 메타데이터
- `highlights`: 사용자가 생성한 하이라이트
- `notes`: 페이지별 노트 및 메모
- `concepts`: 개념 맵의 개념 노드
- `concept_connections`: 개념 간 연결 관계
- `learning_progress`: 문서별 학습 진행률
- `user_profiles`: 사용자 프로필 및 설정

### Row Level Security (RLS)
모든 테이블에 RLS가 적용되어 사용자는 본인의 데이터만 접근할 수 있습니다.

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

---

**Made with ❤️ by AI Knowledge Factory Team**