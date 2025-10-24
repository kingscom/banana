# 사용자 2834c021-a12e-4bd1-8a89-54578205233f 프로필 확인

## 1. Supabase 대시보드에서 확인

1. https://supabase.com/dashboard/project/yyntizkazvpntnfngltl 접속
2. Table Editor → user_profiles 테이블 클릭
3. 필터에서 id = '2834c021-a12e-4bd1-8a89-54578205233f' 검색

## 2. SQL Editor에서 직접 쿼리

```sql
-- 해당 사용자 프로필 확인
SELECT * FROM user_profiles 
WHERE id = '2834c021-a12e-4bd1-8a89-54578205233f';

-- auth.users에는 있는지 확인
SELECT id, email, created_at 
FROM auth.users 
WHERE id = '2834c021-a12e-4bd1-8a89-54578205233f';

-- 조인해서 확인
SELECT 
  u.id, u.email, u.created_at as auth_created,
  p.display_name, p.department, p.is_profile_completed, 
  p.created_at as profile_created
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
WHERE u.id = '2834c021-a12e-4bd1-8a89-54578205233f';
```

## 3. 프로필이 없다면 수동 생성

```sql
-- 프로필 수동 생성
INSERT INTO user_profiles (
  id, 
  email, 
  display_name, 
  provider, 
  is_profile_completed,
  created_at,
  updated_at
) VALUES (
  '2834c021-a12e-4bd1-8a89-54578205233f',
  'kingscom85@gmail.com',
  'woo',
  'google',
  false,
  NOW(),
  NOW()
);
```

## 4. RLS 정책 확인

```sql
-- 현재 RLS 정책 상태 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 트리거 작동 확인
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```