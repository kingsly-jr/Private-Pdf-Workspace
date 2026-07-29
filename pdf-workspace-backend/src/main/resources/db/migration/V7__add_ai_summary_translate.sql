-- Seed AI Summarizer and Translate Feature Flags
INSERT INTO feature_flags (tool_key, name, description, category, enabled) VALUES
('ai-summary', 'AI Summarizer', 'Analyze PDF text and generate Executive Summary, Bullet Points, Keywords, and Action Items.', 'INTELLIGENCE', true),
('translate', 'Translate PDF', 'Extract PDF text and translate document into target languages.', 'INTELLIGENCE', true)
ON CONFLICT (tool_key) DO NOTHING;
