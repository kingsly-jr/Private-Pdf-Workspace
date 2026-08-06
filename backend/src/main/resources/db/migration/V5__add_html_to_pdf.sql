-- Seed HTML to PDF Feature Flag
INSERT INTO feature_flags (tool_key, name, description, category, enabled) VALUES
('html-to-pdf', 'HTML to PDF', 'Convert HTML web pages, files, or website URLs into clean PDF documents.', 'CONVERSION', true)
ON CONFLICT (tool_key) DO NOTHING;
