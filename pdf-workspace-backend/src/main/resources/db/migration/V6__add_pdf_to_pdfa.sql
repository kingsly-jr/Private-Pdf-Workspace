-- Seed PDF to PDF/A Feature Flag
INSERT INTO feature_flags (tool_key, name, description, category, enabled) VALUES
('pdf-to-pdfa', 'PDF to PDF/A', 'Convert uploaded PDF documents to PDF/A-1b ISO archival standard format.', 'CONVERSION', true)
ON CONFLICT (tool_key) DO NOTHING;
