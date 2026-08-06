-- Seed Scan to PDF Feature Flag
INSERT INTO feature_flags (tool_key, name, description, category, enabled) VALUES
('scan-to-pdf', 'Scan to PDF', 'Capture photos using webcam or mobile camera to combine into a PDF document.', 'CONVERSION', true)
ON CONFLICT (tool_key) DO NOTHING;
