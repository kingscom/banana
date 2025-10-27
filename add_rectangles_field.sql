-- Add rectangles field to highlights table for polygon highlight support
ALTER TABLE highlights ADD COLUMN rectangles TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN highlights.rectangles IS 'JSON string containing array of rectangles for polygon highlights';