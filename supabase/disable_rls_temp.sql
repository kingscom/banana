-- 임시로 documents 테이블의 RLS 비활성화
-- 개발 중에만 사용하고 나중에 다시 활성화하세요

ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

-- 또는 모든 작업을 허용하는 정책 추가
DROP POLICY IF EXISTS "Allow all operations on documents" ON documents;
CREATE POLICY "Allow all operations on documents" ON documents
  FOR ALL USING (true) WITH CHECK (true);

-- 나중에 다시 활성화하려면:
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- DROP POLICY "Allow all operations on documents" ON documents;