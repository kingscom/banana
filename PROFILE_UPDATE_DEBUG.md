# 프로필 업데이트 문제 해결 가이드

## 🔍 문제 진단 단계

### 1. 브라우저 개발자 도구 확인
1. F12 → Console 탭
2. 프로필 업데이트 시도 시 다음 로그 확인:

```
📋 Form submitted with data: {...}
🔄 Starting profile update process...
👤 User ID: [user-id]
📧 User email: [email]
🔍 Checking current profile state...
📊 Current profile: {...}
💾 Updating profile...
📤 Sending update: {...}
```

### 2. 가능한 오류들

#### A. 권한 오류 (RLS 정책)
```
❌ Profile update error: { code: "42501", message: "permission denied" }
```

#### B. 프로필 없음
```
❌ Error fetching current profile: { code: "PGRST116" }
```

#### C. 네트워크 오류
```
❌ Profile update error: { message: "Network error" }
```

## 🛠️ 해결 방법

### 방법 1: Supabase RLS 정책 확인/수정

Supabase SQL Editor에서 실행:

```sql
-- 현재 RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- UPDATE 정책 다시 생성
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
```

### 방법 2: 직접 SQL로 업데이트 테스트

```sql
-- 현재 사용자 확인
SELECT auth.uid();

-- 현재 프로필 확인 (user_id 교체 필요)
SELECT * FROM user_profiles WHERE id = 'your-user-id-here';

-- 수동 업데이트 테스트 (실제 값으로 교체)
UPDATE user_profiles 
SET 
  display_name = '새로운이름',
  department = '새로운부서',
  updated_at = NOW()
WHERE id = 'your-user-id-here';
```

### 방법 3: RLS 임시 비활성화 (테스트용)

```sql
-- 임시로 RLS 비활성화 (테스트 후 다시 활성화할 것)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 테스트 후 다시 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
```

### 방법 4: 새로운 UPDATE 정책 생성

```sql
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- 더 관대한 정책 생성
CREATE POLICY "Users can update profile" ON user_profiles
  FOR UPDATE 
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);
```

## 🧪 디버깅 방법

### 1. DEBUG 버튼 사용
- 프로필 모달에서 "[DEBUG] 현재 상태 확인" 버튼 클릭
- Console에서 출력 확인

### 2. 수동 쿼리 테스트

브라우저 Console에서:
```javascript
// 현재 사용자 정보 확인
console.log('Current user:', JSON.parse(localStorage.getItem('supabase.auth.token')))

// 직접 Supabase 쿼리
import { supabase } from './src/lib/supabase'
const { data, error } = await supabase.from('user_profiles').select('*').limit(1)
console.log('Direct query:', data, error)
```

## 🚨 긴급 해결책

만약 계속 문제가 있다면:

1. **브라우저 새로고침**
2. **로그아웃 후 재로그인**
3. **시크릿/프라이빗 모드에서 테스트**
4. **Supabase 대시보드에서 수동 업데이트**

## 📞 추가 도움

문제가 지속되면 다음 정보와 함께 문의:
1. Console 로그 전체 복사
2. Supabase 프로젝트 ID
3. 사용자 ID
4. 오류 메시지 스크린샷