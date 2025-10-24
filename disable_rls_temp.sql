-- 임시로 RLS 비활성화 (테스트용)
-- Supabase SQL Editor에서 실행

ALTER TABLE highlights DISABLE ROW LEVEL SECURITY;

-- 다시 활성화하려면:
-- ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;