-- V2 Schema Migration: User Feedback & Admin Notifications

CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100),
    email VARCHAR(150),
    rating INT NOT NULL DEFAULT 5,
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL', -- GENERAL, FEATURE_REQUEST, BUG_REPORT
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_feedback_is_read ON user_feedback(is_read);
CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at);
