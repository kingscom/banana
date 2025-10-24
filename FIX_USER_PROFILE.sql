-- 사용자 2834c021-a12e-4bd1-8a89-54578205233f의 프로필 수정
-- Supabase SQL Editor에서 실행하세요

-- 1. 현재 상태 확인
SELECT * FROM user_profiles 
WHERE id = '2834c021-a12e-4bd1-8a89-54578205233f';

-- 2. 빈 필드 업데이트 (즉시 실행)
UPDATE user_profiles 
SET 
  email = 'kingscom85@gmail.com',
  display_name = 'woo',
  avatar_url = 'https://lh3.googleusercontent.com/a/ACg8ocLcpgHYn0Brze0BgtiCD7z3c9VbdyqoK0Egu43dwJ1v7afHIgLI=s96-c',
  updated_at = NOW()
WHERE id = '2834c021-a12e-4bd1-8a89-54578205233f';

-- 3. 업데이트 결과 확인
SELECT * FROM user_profiles 
WHERE id = '2834c021-a12e-4bd1-8a89-54578205233f';

-- 4. Dashboard 존재 여부 확인
SELECT * FROM dashboards 
WHERE user_id = '2834c021-a12e-4bd1-8a89-54578205233f';

-- 5. Dashboard가 없으면 생성
INSERT INTO dashboards (user_id, title, settings)
SELECT 
  '2834c021-a12e-4bd1-8a89-54578205233f',
  '나의 학습 대시보드',
  '{
    "theme": "light",
    "widgets": ["documents", "progress", "recent_activity"],
    "layout": "grid"
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM dashboards 
  WHERE user_id = '2834c021-a12e-4bd1-8a89-54578205233f'
);

-- 6. 모든 사용자 프로필 상태 확인 (선택사항)
SELECT 
  p.id, p.email, p.display_name, p.is_profile_completed, p.created_at,
  d.id as dashboard_id, d.title as dashboard_title
FROM user_profiles p
LEFT JOIN dashboards d ON p.id = d.user_id
ORDER BY p.created_at DESC;