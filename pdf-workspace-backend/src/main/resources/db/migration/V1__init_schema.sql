-- V1 Initial Database Schema Migration for PDF Workspace

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Admin Users Table (Only for /admin authentication)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'ROLE_ADMIN',
    must_change_password BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Feature Flags Table (Manages the 28 PDF tools)
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_key VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    max_file_size_mb INT NOT NULL DEFAULT 100,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Anonymous Tool Run History (No user association)
CREATE TABLE IF NOT EXISTS tool_run_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_key VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'SUCCESS', 'FAILED', 'REJECTED'
    file_count INT NOT NULL DEFAULT 1,
    input_size_bytes BIGINT DEFAULT 0,
    output_size_bytes BIGINT DEFAULT 0,
    duration_ms BIGINT DEFAULT 0,
    error_code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Application Settings Table
CREATE TABLE IF NOT EXISTS app_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for history queries
CREATE INDEX idx_tool_run_history_tool_key ON tool_run_history(tool_key);
CREATE INDEX idx_tool_run_history_created_at ON tool_run_history(created_at);
CREATE INDEX idx_tool_run_history_status ON tool_run_history(status);

-- Seed Initial App Settings
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
('max_upload_size_mb', '100', 'Maximum allowed upload size per file in MB'),
('temp_file_ttl_minutes', '15', 'Minutes before temporary working files are cleaned up'),
('site_title', 'Roriri Workspace', 'Public application header title'),
('maintenance_mode', 'false', 'Global site maintenance toggle')
ON CONFLICT (setting_key) DO NOTHING;

-- Seed initial 28 PDF Tools in Feature Flags
INSERT INTO feature_flags (tool_key, name, description, category, enabled) VALUES
-- Group A: Page Operations
('merge', 'Merge PDF', 'Combine multiple PDFs into a single cohesive document in your desired order.', 'PAGE_OPERATIONS', true),
('split', 'Split PDF', 'Extract selected pages, split by range, or split into individual page files.', 'PAGE_OPERATIONS', true),
('rotate', 'Rotate PDF', 'Rotate specific or all pages in your PDF document.', 'PAGE_OPERATIONS', true),
('delete-pages', 'Delete Pages', 'Remove unwanted pages from your PDF file.', 'PAGE_OPERATIONS', true),
('organize', 'Organize PDF', 'Reorder, rotate, delete, or insert blank pages in your PDF.', 'PAGE_OPERATIONS', true),
('crop', 'Crop PDF', 'Trim margins or crop specific areas of your PDF pages.', 'PAGE_OPERATIONS', true),
('resize', 'Resize PDF', 'Adjust page dimensions, margins, and scaling factors.', 'PAGE_OPERATIONS', true),
('extract-images', 'Extract Images', 'Pull all embedded high-resolution images out of your PDF as a ZIP archive.', 'PAGE_OPERATIONS', true),

-- Group B: Conversion
('pdf-to-word', 'PDF to Word', 'Convert PDF documents to editable Microsoft Word (.docx) files.', 'CONVERSION', true),
('word-to-pdf', 'Word to PDF', 'Convert Microsoft Word (.docx) documents into clean PDF files.', 'CONVERSION', true),
('pdf-to-excel', 'PDF to Excel', 'Extract tabular data from PDF into Microsoft Excel (.xlsx) spreadsheets.', 'CONVERSION', true),
('excel-to-pdf', 'Excel to PDF', 'Transform Excel (.xlsx) sheets into standard PDF documents.', 'CONVERSION', true),
('pdf-to-powerpoint', 'PDF to PowerPoint', 'Convert PDF pages into editable PowerPoint (.pptx) presentations.', 'CONVERSION', true),
('powerpoint-to-pdf', 'PowerPoint to PDF', 'Turn PowerPoint (.pptx) slide decks into PDF files.', 'CONVERSION', true),
('pdf-to-jpg', 'PDF to JPG', 'Render each PDF page as a high-quality JPG image.', 'CONVERSION', true),
('jpg-to-pdf', 'JPG to PDF', 'Combine multiple JPG/PNG images into a single PDF document.', 'CONVERSION', true),
('extract-text', 'Extract Text', 'Extract all raw readable text from PDF into TXT or Word format.', 'CONVERSION', true),

-- Group C: Security & Integrity
('protect', 'Protect PDF', 'Secure PDF documents with passwords and restricted permissions.', 'SECURITY', true),
('unlock', 'Unlock PDF', 'Remove password restrictions from protected PDF files.', 'SECURITY', true),
('redact', 'Redact PDF', 'Permanently sanitize and purge sensitive text or content regions.', 'SECURITY', true),
('repair', 'Repair PDF', 'Recover readable content from damaged or corrupted PDF files.', 'SECURITY', true),
('compare', 'Compare PDF', 'Compare two PDF documents side-by-side and highlight structural differences.', 'SECURITY', true),
('ocr', 'OCR PDF', 'Perform optical character recognition to make scanned PDFs searchable.', 'SECURITY', true),
('metadata-editor', 'Metadata Editor', 'Edit title, author, subject, keywords, and creator metadata fields.', 'SECURITY', true),

-- Group D: Annotation
('watermark', 'Watermark PDF', 'Apply text or image watermarks with custom positioning and opacity.', 'ANNOTATION', true),
('page-numbers', 'Page Numbers', 'Add customizable page numbers to header or footer regions.', 'ANNOTATION', true),
('sign-pdf', 'Sign PDF', 'Place drawn, typed, or image signatures anywhere on your document.', 'ANNOTATION', true),

-- Group E: Compression
('compress', 'Compress PDF', 'Optimize and compress PDF file size while maintaining visual quality.', 'COMPRESSION', true)
ON CONFLICT (tool_key) DO NOTHING;
