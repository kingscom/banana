# GitHub 저장소 연결 및 업로드 가이드

## 1. GitHub에서 새 저장소 만들기
1. GitHub.com 접속
2. 우측 상단 '+' 버튼 클릭
3. "New repository" 선택
4. Repository name: `ai-knowledge-factory` (또는 원하는 이름)
5. Description: `AI-powered document summarization and Q&A platform`
6. Public/Private 선택
7. **⚠️ 중요: README, .gitignore, license 추가하지 말 것** (이미 있음)
8. "Create repository" 클릭

## 2. 원격 저장소 연결
GitHub에서 제공하는 명령어를 사용하거나, 아래 명령어 실행:

```bash
# 원격 저장소 추가 (YOUR_USERNAME을 실제 GitHub 사용자명으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/ai-knowledge-factory.git

# 기본 브랜치 설정
git branch -M main

# 첫 번째 푸시
git push -u origin main
```

## 3. 현재 상태
✅ 로컬 Git 저장소 초기화됨
✅ 첫 번째 커밋 완료 (35개 파일, 13,304줄 추가)
✅ .gitignore 설정으로 .env.local 등 민감한 파일 제외됨
✅ 전체 프로젝트 구조 커밋됨

## 4. 포함된 주요 기능
- ✅ Next.js 14 + TypeScript + Tailwind CSS
- ✅ Supabase 데이터베이스 스키마
- ✅ Google OAuth 인증 시스템
- ✅ 사용자 프로필 및 대시보드 자동 생성
- ✅ PDF 처리 및 하이라이트 시스템
- ✅ 개념 맵핑 기능
- ✅ 보안 정책 (RLS) 구현

## 5. 환경 변수 설정 (배포 시)
배포 환경에서 다음 환경 변수들을 설정해야 합니다:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `OPENAI_API_KEY` (선택사항)