-- AI Knowledge Factory - Simplified Database Schema
-- 외래 키 제약조건을 완화한 버전

-- ====================================
-- DROP ALL EXISTING TABLES AND OBJECTS
-- ====================================

-- Drop ALL triggers first (including old ones)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_dashboards_updated_at ON dashboards;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;

-- Drop ALL tables (including old ones) with CASCADE to force removal
DROP TABLE IF EXISTS dashboards CASCADE;
DROP TABLE IF EXISTS highlights CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop functions with CASCADE to remove all dependencies
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS user_role CASCADE;

-- Drop ALL indexes (including old ones)
DROP INDEX IF EXISTS idx_dashboards_user_id;
DROP INDEX IF EXISTS idx_highlights_page_number;
DROP INDEX IF EXISTS idx_highlights_user_id;
DROP INDEX IF EXISTS idx_highlights_document_id;
DROP INDEX IF EXISTS idx_documents_user_id;
DROP INDEX IF EXISTS idx_documents_created_at;

-- ====================================
-- CREATE FRESH SCHEMA
-- ====================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin');

-- Documents table (간소화 + 공유 기능)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,  -- UUID 대신 TEXT 사용
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_path TEXT, -- 서버에 저장된 파일 경로
  summary TEXT, -- AI-generated summary of the entire document
  original_document_id TEXT, -- 원본 문서 ID (공유된 문서인 경우)
  shared_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 공유한 사용자 ID
  is_shared BOOLEAN DEFAULT FALSE, -- 공유된 문서 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Highlights table (외래 키 제약조건 완화, user_id 제거)
CREATE TABLE IF NOT EXISTS highlights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_id TEXT NOT NULL,  -- 외래 키 제약조건 제거
  page_number INTEGER NOT NULL,
  selected_text TEXT NOT NULL,
  note TEXT DEFAULT '',
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  position_width FLOAT NOT NULL,
  position_height FLOAT NOT NULL,
  rectangles TEXT, -- JSON string containing array of rectangles for polygon highlights
  color TEXT DEFAULT '#fde047', -- 하이라이트 색상 (기본값: 노란색)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  department TEXT,
  avatar_url TEXT,
  provider TEXT DEFAULT 'google',
  role user_role DEFAULT 'student',
  is_profile_completed BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard table
CREATE TABLE IF NOT EXISTS dashboards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'My Dashboard',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Courses table (추천강좌 - 모든 사용자 공유)
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL, -- 강의명
  category TEXT NOT NULL, -- 강의 구분 (예: 프로그래밍, 디자인, 마케팅 등)
  description TEXT, -- 강의 설명
  image_url TEXT, -- 이미지 URL (없으면 기본 이미지 사용)
  course_url TEXT NOT NULL, -- 강의 URL
  tags TEXT[] DEFAULT '{}', -- 태그 배열 (검색용)
  instructor_name TEXT, -- 강사명
  duration TEXT, -- 강의 시간 (예: "2시간 30분", "10주 과정")
  difficulty_level TEXT DEFAULT 'beginner', -- 난이도 (beginner, intermediate, advanced)
  platform TEXT, -- 유튜브, 유데미, 패스트캠퍼스, 인프런, KT지니어스, 기타
  language TEXT DEFAULT 'ko', -- 언어 (ko, en, etc.)
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 등록한 사용자 (추적용, 필수 아님)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_original_id ON documents(original_document_id);
CREATE INDEX IF NOT EXISTS idx_documents_shared_by ON documents(shared_by_user_id);
CREATE INDEX IF NOT EXISTS idx_documents_is_shared ON documents(is_shared);
CREATE INDEX IF NOT EXISTS idx_documents_summary ON documents(summary) WHERE summary IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_highlights_document_id ON highlights(document_id);
CREATE INDEX IF NOT EXISTS idx_highlights_page_number ON highlights(page_number);

-- Courses table indexes for search and performance
CREATE INDEX IF NOT EXISTS idx_courses_tags ON courses USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON courses(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_platform ON courses(platform);

-- Row Level Security (RLS) policies - DISABLED for development
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE highlights DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY; -- 모든 사용자가 접근 가능

-- RLS policies are DISABLED for development
-- All policies are commented out since RLS is disabled

/*
-- Documents policies (더 관대한 정책)
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users can create their own documents" ON documents;
CREATE POLICY "Users can create their own documents" ON documents
  FOR INSERT WITH CHECK (user_id IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
CREATE POLICY "Users can delete their own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- Highlights policies
DROP POLICY IF EXISTS "Users can view their own highlights" ON highlights;
CREATE POLICY "Users can view their own highlights" ON highlights
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own highlights" ON highlights;
CREATE POLICY "Users can create their own highlights" ON highlights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own highlights" ON highlights;
CREATE POLICY "Users can update their own highlights" ON highlights
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own highlights" ON highlights;
CREATE POLICY "Users can delete their own highlights" ON highlights
  FOR DELETE USING (auth.uid() = user_id);

-- User profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
CREATE POLICY "Users can create their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Dashboard policies
DROP POLICY IF EXISTS "Users can view their own dashboard" ON dashboards;
CREATE POLICY "Users can view their own dashboard" ON dashboards
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own dashboard" ON dashboards;
CREATE POLICY "Users can create their own dashboard" ON dashboards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own dashboard" ON dashboards;
CREATE POLICY "Users can update their own dashboard" ON dashboards
  FOR UPDATE USING (auth.uid() = user_id);
*/

-- Function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dashboards_updated_at ON dashboards;
CREATE TRIGGER update_dashboards_updated_at 
  BEFORE UPDATE ON dashboards 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at 
  BEFORE UPDATE ON courses 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile and dashboard automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile (incomplete initially)
  INSERT INTO public.user_profiles (id, email, display_name, avatar_url, provider, is_profile_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    'google',
    FALSE
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Create default dashboard
  INSERT INTO public.dashboards (user_id, title, settings)
  VALUES (
    NEW.id,
    '나의 학습 대시보드',
    '{
      "theme": "light",
      "widgets": ["documents", "progress", "recent_activity"],
      "layout": "grid"
    }'::jsonb
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample course data for testing
INSERT INTO courses (
  title, category, description, image_url, course_url, tags, 
  instructor_name, duration, difficulty_level, platform, language
) VALUES 
(
  'React 완벽 가이드 - 처음부터 실전까지',
  '프로그래밍',
  'React의 기초부터 고급 개념까지 완벽하게 학습할 수 있는 강의입니다. 실제 프로젝트를 통해 실무 경험을 쌓을 수 있습니다.',
  NULL,
  'https://www.udemy.com/course/react-the-complete-guide',
  ARRAY['React', 'JavaScript', '프론트엔드', '웹개발', 'JSX', 'Hooks'],
  '김개발',
  '40시간',
  'beginner',
  '유데미',
  'ko'
),
(
  'Python 데이터 분석 마스터',
  '데이터사이언스',
  'Python을 활용한 데이터 분석의 모든 것을 배웁니다. Pandas, NumPy, Matplotlib을 이용한 실전 데이터 분석 프로젝트를 진행합니다.',
  NULL,
  'https://www.coursera.org/learn/python-data-analysis',
  ARRAY['Python', '데이터분석', 'Pandas', 'NumPy', 'Matplotlib', '머신러닝'],
  '박데이터',
  '25시간',
  'intermediate',
  '코세라',
  'ko'
),
(
  'UI/UX 디자인 기초부터 실무까지',
  '디자인',
  'Figma를 활용한 UI/UX 디자인의 기초 이론부터 실제 앱 디자인까지 단계별로 학습합니다.',
  NULL,
  'https://www.inflearn.com/course/ui-ux-design',
  ARRAY['UI디자인', 'UX디자인', 'Figma', '프로토타이핑', '디자인시스템'],
  '이디자인',
  '30시간',
  'beginner',
  '인프런',
  'ko'
),
(
  'Node.js 백엔드 개발 완주',
  '프로그래밍',
  'Node.js와 Express를 이용한 서버 개발부터 데이터베이스 연동, API 개발까지 백엔드 개발의 모든 것을 학습합니다.',
  NULL,
  'https://www.udemy.com/course/nodejs-express-mongodb',
  ARRAY['Node.js', 'Express', 'MongoDB', '백엔드', 'API', 'JavaScript'],
  '최백엔드',
  '35시간',
  'intermediate',
  '유데미',
  'ko'
),
(
  '딥러닝 기초와 TensorFlow 실습',
  '인공지능',
  'TensorFlow를 활용한 딥러닝 모델 구축과 실제 프로젝트 적용 방법을 배웁니다. CNN, RNN 등 다양한 신경망을 다룹니다.',
  NULL,
  'https://www.coursera.org/learn/tensorflow-deep-learning',
  ARRAY['딥러닝', 'TensorFlow', '신경망', 'CNN', 'RNN', '머신러닝', 'AI'],
  '정인공지능',
  '50시간',
  'advanced',
  '코세라',
  'ko'
),
(
  'JavaScript 기초부터 고급까지',
  '프로그래밍',
  'JavaScript의 기본 문법부터 고급 개념, ES6+ 문법까지 체계적으로 학습합니다.',
  NULL,
  'https://www.youtube.com/watch?v=wcsVjmHrUQg',
  ARRAY['JavaScript', 'ES6', '프론트엔드', '웹개발', '함수형프로그래밍'],
  '생활코딩',
  '15시간',
  'beginner',
  '유튜브',
  'ko'
),
(
  'Figma UI 디자인 시스템 구축',
  '디자인',
  '체계적인 디자인 시스템을 구축하고 팀 협업을 위한 컴포넌트 라이브러리를 만들어봅니다.',
  NULL,
  'https://www.fastcampus.co.kr/dev_online_figma',
  ARRAY['Figma', '디자인시스템', 'UI디자인', '컴포넌트', '협업'],
  '패스트캠퍼스',
  '20시간',
  'intermediate',
  '패스트캠퍼스',
  'ko'
)
ON CONFLICT DO NOTHING;