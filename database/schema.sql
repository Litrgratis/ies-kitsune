-- IES Kitsune Database Schema
-- Replaces localStorage with PostgreSQL persistent storage

-- Users table for basic user identification
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_identifier VARCHAR(255) UNIQUE NOT NULL, -- Can be session-based or user-provided
    display_name VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for problem-solving sessions
CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY, -- Original session ID from SessionManager
    user_id INTEGER REFERENCES users(id),
    problem TEXT NOT NULL,
    start_time BIGINT NOT NULL,
    end_time BIGINT,
    last_save_time BIGINT NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, paused, completed, failed
    current_stage VARCHAR(255),
    completion_percentage INTEGER DEFAULT 0,
    estimated_time_remaining INTEGER,
    total_time BIGINT DEFAULT 0,
    paused_time BIGINT DEFAULT 0,
    active_time BIGINT DEFAULT 0,
    paused_at BIGINT,
    completed BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    final_metrics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session iterations for tracking problem-solving steps
CREATE TABLE session_iterations (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE CASCADE,
    iteration_number INTEGER NOT NULL,
    timestamp BIGINT NOT NULL,
    session_time BIGINT NOT NULL,
    data JSONB NOT NULL, -- Store the full iteration data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics sessions for recording completed sessions
CREATE TABLE analytics_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    original_session_id VARCHAR(255), -- Reference to sessions.id
    problem TEXT NOT NULL,
    start_time BIGINT NOT NULL,
    end_time BIGINT NOT NULL,
    total_time BIGINT NOT NULL,
    avg_quality DECIMAL(4,2),
    final_consensus DECIMAL(4,2),
    iterations_used INTEGER,
    breakthroughs INTEGER DEFAULT 0,
    efficiency DECIMAL(4,2),
    success BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge base user contributions
CREATE TABLE kb_user_contributions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    content TEXT,
    tags TEXT[], -- PostgreSQL array type
    category VARCHAR(255),
    views INTEGER DEFAULT 0,
    helpful INTEGER DEFAULT 0,
    last_updated BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge base favorites
CREATE TABLE kb_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    kb_item_id VARCHAR(255) NOT NULL, -- Could reference internal or external content
    kb_item_type VARCHAR(50) DEFAULT 'user_contribution', -- user_contribution, builtin, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, kb_item_id, kb_item_type)
);

-- Knowledge base view statistics
CREATE TABLE kb_view_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    kb_item_id VARCHAR(255) NOT NULL,
    kb_item_type VARCHAR(50) DEFAULT 'user_contribution',
    view_count INTEGER DEFAULT 1,
    last_viewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, kb_item_id, kb_item_type)
);

-- User preferences and settings
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    theme VARCHAR(50) DEFAULT 'dark',
    analytics_enabled BOOLEAN DEFAULT TRUE,
    auto_save_interval INTEGER DEFAULT 5000,
    max_sessions INTEGER DEFAULT 50,
    language VARCHAR(10) DEFAULT 'en',
    other_settings JSONB, -- For additional flexible settings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Real-time metrics for analytics dashboard
CREATE TABLE real_time_metrics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255) REFERENCES sessions(id),
    metric_type VARCHAR(100) NOT NULL, -- quality, consensus, etc.
    metric_value DECIMAL(10,4) NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Templates (if used in templates.js)
CREATE TABLE templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_session_iterations_session_id ON session_iterations(session_id);
CREATE INDEX idx_analytics_sessions_user_id ON analytics_sessions(user_id);
CREATE INDEX idx_analytics_sessions_start_time ON analytics_sessions(start_time);
CREATE INDEX idx_kb_contributions_user_id ON kb_user_contributions(user_id);
CREATE INDEX idx_kb_contributions_category ON kb_user_contributions(category);
CREATE INDEX idx_kb_favorites_user_id ON kb_favorites(user_id);
CREATE INDEX idx_kb_view_stats_user_id ON kb_view_stats(user_id);
CREATE INDEX idx_real_time_metrics_session_id ON real_time_metrics(session_id);
CREATE INDEX idx_real_time_metrics_timestamp ON real_time_metrics(timestamp);
CREATE INDEX idx_templates_user_id ON templates(user_id);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_contributions_updated_at BEFORE UPDATE ON kb_user_contributions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
