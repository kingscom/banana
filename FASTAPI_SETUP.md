# FastAPI AI 요약 서비스 연동 가이드

## 개요
이 프로젝트는 외부 FastAPI 서버를 통해 PDF 페이지 AI 요약 기능을 제공합니다.

## 설정 방법

### 1. 환경변수 설정
`.env.local` 파일에 FastAPI 서버 엔드포인트를 설정하세요:

```bash
# FastAPI Configuration for AI Summary
FASTAPI_BASE_URL=http://localhost:8000
```

### 2. 다른 서버 사용 시
외부 또는 다른 포트의 FastAPI 서버를 사용하는 경우:

```bash
# 예시: 다른 포트 사용
FASTAPI_BASE_URL=http://localhost:9000

# 예시: 외부 서버 사용
FASTAPI_BASE_URL=https://your-api-server.com

# 예시: 로컬 Docker 컨테이너
FASTAPI_BASE_URL=http://host.docker.internal:8000
```

## API 엔드포인트 요구사항

FastAPI 서버는 다음 엔드포인트를 제공해야 합니다:

### 1. POST `/summarize-pdf` (페이지별 요약)
- **파라미터**: 
  - `file`: PDF 파일 (multipart/form-data)
  - `page_number`: 페이지 번호 (string)
  - `user_id`: 사용자 ID (string)
  - `document_id`: 문서 ID (string, optional)

- **응답 형식**:
```json
{
  "success": true,
  "summary": "요약 내용...",
  "page_number": 1,
  "document_id": "doc-123",
  "user_id": "user-456",
  "processing_time": 2.5,
  "model_used": "gpt-3.5-turbo",
  "confidence": 0.85
}
```

### 2. POST `/summarize-full-document` (전체 문서 요약)
- **파라미터**:
  - `file`: PDF 파일 (multipart/form-data)
  - `user_id`: 사용자 ID (string)
  - `document_id`: 문서 ID (string)

- **응답 형식**:
```json
{
  "success": true,
  "summary": "전체 문서 요약 내용...",
  "document_id": "doc-123",
  "user_id": "user-456",
  "processing_time": 15.2,
  "model_used": "gpt-3.5-turbo",
  "confidence": 0.92,
  "total_pages": 10,
  "word_count": 1500
}
```

## 사용 방법

### 페이지별 요약
1. FastAPI 서버가 실행 중인지 확인
2. `.env.local`에 올바른 `FASTAPI_BASE_URL` 설정
3. Next.js 앱에서 PDF를 열고 "AI 요약" 버튼 클릭
4. 현재 페이지가 추출되어 FastAPI 서버로 전송됨
5. AI 요약 결과를 받아 화면에 표시

### 전체 문서 요약 (자동)
1. PDF 파일을 업로드
2. 업로드 완료 후 백그라운드에서 자동으로 전체 문서 요약 처리
3. 요약 완료 시 `documents` 테이블의 `summary` 컬럼에 저장
4. FastAPI 서버에 연결할 수 없는 경우 자동으로 스킵 (UI 영향 없음)

## 오류 처리

- **연결 실패**: FastAPI 서버가 실행 중이지 않거나 URL이 잘못된 경우
- **타임아웃**: 30초 내에 응답이 없는 경우
- **서버 오류**: FastAPI 서버에서 처리 중 오류가 발생한 경우

모든 오류는 사용자에게 친화적인 메시지로 표시됩니다.