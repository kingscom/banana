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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_original_id ON documents(original_document_id);
CREATE INDEX IF NOT EXISTS idx_documents_shared_by ON documents(shared_by_user_id);
CREATE INDEX IF NOT EXISTS idx_documents_is_shared ON documents(is_shared);
CREATE INDEX IF NOT EXISTS idx_highlights_document_id ON highlights(document_id);
CREATE INDEX IF NOT EXISTS idx_highlights_page_number ON highlights(page_number);

-- Row Level Security (RLS) policies - DISABLED for development
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE highlights DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards DISABLE ROW LEVEL SECURITY;

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