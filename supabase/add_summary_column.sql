-- Add summary column to documents table
-- This should be run in Supabase SQL Editor

ALTER TABLE documents 
ADD COLUMN summary TEXT;

-- Add index for better performance when searching summaries
CREATE INDEX idx_documents_summary ON documents(summary) WHERE summary IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN documents.summary IS 'AI-generated summary of the entire document';