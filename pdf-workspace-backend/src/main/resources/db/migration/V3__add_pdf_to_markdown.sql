-- Seed PDF to Markdown Feature Flag
INSERT INTO feature_flags (tool_key, name, description, category, enabled) VALUES
('pdf-to-markdown', 'PDF to Markdown', 'Extract PDF document text into structured Markdown (.md) format.', 'CONVERSION', true)
ON CONFLICT (tool_key) DO NOTHING;
