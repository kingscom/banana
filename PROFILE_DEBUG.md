# 프로필 설정 디버그 가이드

## 문제 해결 단계

### 1. 브라우저 개발자 도구 확인
1. F12 → Console 탭 열기
2. Google 로그인 후 다음 로그 확인:
```
🔍 Loading user profile for ID: [user-id]
✅ User profile loaded: {...} 또는
🆕 No profile found - creating initial profile
```

### 2. 프로필 설정 시 로그 확인
프로필 설정 폼 작성 후 제출 시:
```
🔄 Updating user profile for: [user-id]
📝 Form data: {displayName: "...", department: "..."}
✅ Profile updated successfully: [...]
```

### 3. Supabase 테이블 직접 확인
1. Supabase 대시보드 접속: https://supabase.com/dashboard/project/yyntizkazvpntnfngltl
2. Table Editor → `user_profiles` 테이블 확인
3. 해당 사용자 ID로 레코드가 존재하는지 확인

### 4. 수동 SQL 쿼리 실행
Supabase SQL Editor에서 다음 쿼리 실행:

```sql
-- 모든 사용자 프로필 확인
SELECT * FROM user_profiles ORDER BY created_at DESC LIMIT 10;

-- 특정 사용자 확인 (user_id 교체 필요)
SELECT * FROM user_profiles WHERE id = 'your-user-id-here';

-- auth.users와 연결 확인
SELECT 
  u.id, u.email, u.created_at as auth_created,
  p.display_name, p.department, p.is_profile_completed, p.created_at as profile_created
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;
```

### 5. 트리거 작동 확인
```sql
-- 트리거 존재 확인
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 함수 존재 확인
SELECT * FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';
```

### 6. 수동 프로필 생성 (임시 해결책)
```sql
-- 사용자 ID와 이메일을 실제 값으로 교체
INSERT INTO user_profiles (id, email, display_name, provider, is_profile_completed)
VALUES (
  'your-user-id-here',
  'your-email@example.com', 
  'Your Name',
  'google',
  false
);
```

### 7. 대시보드 생성 확인
```sql
-- 대시보드 테이블 확인
SELECT * FROM dashboards ORDER BY created_at DESC LIMIT 10;

-- 특정 사용자 대시보드 확인
SELECT * FROM dashboards WHERE user_id = 'your-user-id-here';
```

## 일반적인 문제들

### 문제 1: 트리거가 실행되지 않음
- 해결: 스키마를 다시 실행하여 트리거 재생성

### 문제 2: RLS 정책 문제
- 해결: 임시로 RLS 비활성화 후 테스트
```sql
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
```

### 문제 3: 권한 문제
- 해결: 함수를 SECURITY DEFINER로 설정 (이미 되어있음)

### 문제 4: 프로필은 생성되지만 업데이트 안됨
- 해결: upsert 대신 update 쿼리 확인

## 강제 해결 방법

만약 자동 생성이 안된다면 수동으로 생성:

```javascript
// 브라우저 콘솔에서 실행
const user = JSON.parse(localStorage.getItem('supabase.auth.token'))?.user;
console.log('Current user:', user);

if (user) {
  // 수동 프로필 생성 API 호출 구현 필요
}
```