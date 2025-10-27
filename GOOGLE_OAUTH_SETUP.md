# Google OAuth 설정 가이드

## 1. Google Cloud Console 설정

### 1단계: Google Cloud Console 프로젝트 생성
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. 프로젝트 이름: `AI Knowledge Factory` (또는 원하는 이름)

### 2단계: OAuth 2.0 설정
1. **API 및 서비스** → **사용자 인증 정보** 메뉴로 이동
2. **+ 사용자 인증 정보 만들기** → **OAuth 2.0 클라이언트 ID** 클릭
3. **OAuth 동의 화면** 먼저 구성 (아직 안했다면):
   - 사용자 유형: **외부** 선택
   - 앱 이름: `AI Knowledge Factory`
   - 사용자 지원 이메일: 본인 이메일
   - 개발자 연락처 정보: 본인 이메일
   - 저장 후 계속

### 3단계: OAuth 클라이언트 ID 생성
1. **애플리케이션 유형**: 웹 애플리케이션
2. **이름**: `AI Knowledge Factory Web Client`
3. **승인된 JavaScript 원본**:
   ```
   http://localhost:3000
   ```
4. **승인된 리디렉션 URI**:
   ```
   http://localhost:3000/auth/callback
   ```
5. **만들기** 클릭

### 4단계: 클라이언트 정보 복사
생성 완료 후 표시되는 팝업에서:
- **클라이언트 ID** 복사
- **클라이언트 보안 비밀** 복사

## 2. Supabase 설정

### 1단계: Supabase 대시보드 설정
1. [Supabase 대시보드](https://supabase.com/dashboard) 접속
2. 프로젝트 선택: `yyntizkazvpntnfngltl`
3. **Authentication** → **Providers** → **Google** 클릭

### 2단계: Google OAuth 활성화
1. **Enable Google provider** 토글 ON
2. **Client ID**: Google Cloud Console에서 복사한 클라이언트 ID 입력
3. **Client Secret**: Google Cloud Console에서 복사한 클라이언트 보안 비밀 입력
4. **Redirect URL** 확인: `https://yyntizkazvpntnfngltl.supabase.co/auth/v1/callback`
5. **Save** 클릭

### 3단계: Google Cloud Console에 Supabase 콜백 URL 추가
1. Google Cloud Console로 돌아가기
2. 생성한 OAuth 클라이언트 ID 편집
3. **승인된 리디렉션 URI**에 다음 모두 추가:
   ```
   https://yyntizkazvpntnfngltl.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   ```
4. **승인된 JavaScript 원본**에 다음 추가:
   ```
   http://localhost:3000
   ```
5. 저장

## 3. 환경 변수 설정

`.env.local` 파일에 다음 값들을 추가하세요:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Proxy Server Configuration (외부 접근용)
PROXY_HOST=10.37.173.52
PROXY_PORT=3001
PROXY_TARGET=http://localhost:3000
```

## 4. 테스트

### 방법 1: 프록시 서버 사용 (권장)
1. 프록시와 개발 서버 동시 실행: `npm run dev:both`
2. 환경변수에 설정된 주소로 접속: `http://{PROXY_HOST}:{PROXY_PORT}` (기본: http://10.37.173.52:3001)
3. "Google로 로그인" 버튼 클릭
4. Google 계정으로 로그인 테스트

### 방법 2: localhost만 사용
1. 개발 서버 실행: `npm run dev`
2. http://localhost:3000 접속
3. "Google로 로그인" 버튼 클릭
4. Google 계정으로 로그인 테스트

## 주의사항

- **로컬 개발**: Google OAuth는 `http://localhost:3000`만 사용, 외부 접근은 프록시(`http://10.37.173.52:3001`) 사용
- **배포 시**: 실제 도메인을 Google Cloud Console과 Supabase에 모두 추가 필요
- **보안**: `.env.local` 파일은 절대 Git에 커밋하지 않기
- **테스트 사용자**: Google OAuth 동의 화면에서 테스트 사용자 추가 가능

## 문제 해결

### 일반적인 오류들:
1. **redirect_uri_mismatch**: 리디렉션 URI가 정확히 일치하지 않음
2. **invalid_client**: 클라이언트 ID나 Secret이 잘못됨
3. **access_denied**: OAuth 동의 화면 설정 미완료

### 디버깅:
- 브라우저 개발자 도구 콘솔 확인
- Supabase 대시보드 → Authentication → Users에서 로그인 상태 확인
- Network 탭에서 OAuth 요청/응답 확인