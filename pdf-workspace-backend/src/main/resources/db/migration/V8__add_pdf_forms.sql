-- Seed PDF Forms Feature Flag
INSERT INTO feature_flags (tool_key, name, description, category, enabled) VALUES
('pdf-forms', 'PDF Forms', 'Add interactive fillable text fields and checkboxes into PDF documents.', 'INTELLIGENCE', true)
ON CONFLICT (tool_key) DO NOTHING;
