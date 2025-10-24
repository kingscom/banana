-- Supabase 테이블 상태 확인 쿼리

-- 1. 현재 테이블 목록 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('documents', 'highlights', 'user_profiles', 'dashboards');

-- 2. highlights 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'highlights' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. highlights 테이블의 제약조건 확인
SELECT 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'highlights' AND tc.table_schema = 'public';

-- 4. RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'highlights';

-- 5. 현재 사용자 ID 확인 (테스트용)
SELECT auth.uid() as current_user_id;

-- 6. highlights 테이블 데이터 개수 확인
SELECT COUNT(*) as highlight_count FROM highlights;