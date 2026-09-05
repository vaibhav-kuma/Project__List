-- DealScout Database Schema
-- Production-grade schema with indexes, constraints, and cascading deletes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table for cookie persistence
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_key VARCHAR(255) UNIQUE NOT NULL,
    cookies JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_key ON sessions(session_key);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Monitoring jobs table
CREATE TABLE IF NOT EXISTS monitoring_jobs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    search_query VARCHAR(500) NOT NULL,
    filters JSONB DEFAULT '{}',
    schedule_cron VARCHAR(100) DEFAULT '0 */6 * * *',
    max_pages INTEGER DEFAULT 3 CHECK (max_pages > 0 AND max_pages <= 10),
    price_threshold DECIMAL(5,4) DEFAULT 0.05 CHECK (price_threshold >= 0 AND price_threshold <= 1),
    user_id VARCHAR(255),
    amazon_email VARCHAR(255),
    amazon_password VARCHAR(255),
    status VARCHAR(50) DEFAULT 'created' CHECK (status IN ('created', 'active', 'paused', 'stopped', 'failed')),
    last_run TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for monitoring jobs
CREATE INDEX IF NOT EXISTS idx_jobs_status ON monitoring_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON monitoring_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_last_run ON monitoring_jobs(last_run);

-- Price snapshots table
CREATE TABLE IF NOT EXISTS price_snapshots (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES monitoring_jobs(id) ON DELETE CASCADE,
    product_title VARCHAR(500) NOT NULL,
    product_url VARCHAR(1000) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    review_count INTEGER CHECK (review_count >= 0),
    price_change DECIMAL(8,6) DEFAULT 0,
    image_url VARCHAR(1000),
    availability VARCHAR(100),
    seller VARCHAR(255),
    is_prime BOOLEAN DEFAULT FALSE,
    is_sponsored BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for price snapshots
CREATE INDEX IF NOT EXISTS idx_snapshots_job_id ON price_snapshots(job_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_url ON price_snapshots(product_url);
CREATE INDEX IF NOT EXISTS idx_snapshots_created ON price_snapshots(created_at);
CREATE INDEX IF NOT EXISTS idx_snapshots_price ON price_snapshots(price);
CREATE INDEX IF NOT EXISTS idx_snapshots_job_url ON price_snapshots(job_id, product_url);

-- Price alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES monitoring_jobs(id) ON DELETE CASCADE,
    product_title VARCHAR(500) NOT NULL,
    product_url VARCHAR(1000) NOT NULL,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('price_decrease', 'price_increase', 'back_in_stock', 'out_of_stock')),
    previous_price DECIMAL(10,2),
    current_price DECIMAL(10,2) NOT NULL,
    change_percent DECIMAL(8,4) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for price alerts
CREATE INDEX IF NOT EXISTS idx_alerts_job_id ON price_alerts(job_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON price_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON price_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON price_alerts(is_read) WHERE is_read = FALSE;

-- Job executions table for tracking performance
CREATE TABLE IF NOT EXISTS job_executions (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES monitoring_jobs(id) ON DELETE CASCADE,
    products_found INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    duration_ms INTEGER DEFAULT 0,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for job executions
CREATE INDEX IF NOT EXISTS idx_executions_job_id ON job_executions(job_id);
CREATE INDEX IF NOT EXISTS idx_executions_executed ON job_executions(executed_at);

-- Purchases table for tracking automated purchases
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES monitoring_jobs(id) ON DELETE CASCADE,
    product_title VARCHAR(500) NOT NULL,
    product_url VARCHAR(1000) NOT NULL,
    purchase_price DECIMAL(10,2) NOT NULL,
    order_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'failed')),
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for purchases
CREATE INDEX IF NOT EXISTS idx_purchases_job_id ON purchases(job_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);

-- API usage tracking for cost control
CREATE TABLE IF NOT EXISTS api_usage (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    endpoint VARCHAR(255) NOT NULL,
    calls_count INTEGER DEFAULT 1,
    total_cost DECIMAL(10,4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, endpoint)
);

-- Index for API usage
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage(date);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);

-- Create views for common queries

-- Job statistics view
CREATE OR REPLACE VIEW job_stats AS
SELECT 
    mj.id,
    mj.name,
    mj.status,
    mj.last_run,
    COUNT(DISTINCT ps.product_url) as unique_products,
    COUNT(ps.id) as total_snapshots,
    COUNT(pa.id) as total_alerts,
    COUNT(CASE WHEN pa.alert_type = 'price_decrease' THEN 1 END) as price_drops,
    COUNT(CASE WHEN pa.alert_type = 'price_increase' THEN 1 END) as price_increases,
    AVG(ps.price) as avg_price,
    MIN(ps.price) as min_price,
    MAX(ps.price) as max_price,
    MAX(ps.created_at) as last_snapshot
FROM monitoring_jobs mj
LEFT JOIN price_snapshots ps ON mj.id = ps.job_id
LEFT JOIN price_alerts pa ON mj.id = pa.job_id
GROUP BY mj.id, mj.name, mj.status, mj.last_run;

-- Recent alerts view
CREATE OR REPLACE VIEW recent_alerts AS
SELECT 
    pa.*,
    mj.name as job_name
FROM price_alerts pa
JOIN monitoring_jobs mj ON pa.job_id = mj.id
WHERE pa.created_at > NOW() - INTERVAL '7 days'
ORDER BY pa.created_at DESC;

-- Price trends view
CREATE OR REPLACE VIEW price_trends AS
SELECT 
    ps.job_id,
    ps.product_url,
    ps.product_title,
    ps.price,
    ps.price_change,
    ps.created_at,
    LAG(ps.price) OVER (PARTITION BY ps.job_id, ps.product_url ORDER BY ps.created_at) as previous_price,
    ROW_NUMBER() OVER (PARTITION BY ps.job_id, ps.product_url ORDER BY ps.created_at DESC) as recency_rank
FROM price_snapshots ps
WHERE ps.created_at > NOW() - INTERVAL '30 days';

-- Functions for data maintenance

-- Function to clean old data
CREATE OR REPLACE FUNCTION cleanup_old_data(retention_days INTEGER DEFAULT 90)
RETURNS TABLE(
    snapshots_deleted INTEGER,
    executions_deleted INTEGER,
    sessions_deleted INTEGER
) AS $$
DECLARE
    snapshots_count INTEGER;
    executions_count INTEGER;
    sessions_count INTEGER;
BEGIN
    -- Delete old price snapshots
    DELETE FROM price_snapshots 
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS snapshots_count = ROW_COUNT;
    
    -- Delete old job executions
    DELETE FROM job_executions 
    WHERE executed_at < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS executions_count = ROW_COUNT;
    
    -- Delete expired sessions
    DELETE FROM sessions 
    WHERE expires_at < NOW();
    GET DIAGNOSTICS sessions_count = ROW_COUNT;
    
    RETURN QUERY SELECT snapshots_count, executions_count, sessions_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get job performance metrics
CREATE OR REPLACE FUNCTION get_job_performance(job_id_param INTEGER, days INTEGER DEFAULT 30)
RETURNS TABLE(
    avg_duration_ms NUMERIC,
    avg_products_found NUMERIC,
    success_rate NUMERIC,
    total_executions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        AVG(je.duration_ms)::NUMERIC as avg_duration_ms,
        AVG(je.products_found)::NUMERIC as avg_products_found,
        (COUNT(*) FILTER (WHERE array_length(je.errors::json[]::text[], 1) IS NULL OR array_length(je.errors::json[]::text[], 1) = 0)::NUMERIC / COUNT(*)::NUMERIC * 100) as success_rate,
        COUNT(*)::INTEGER as total_executions
    FROM job_executions je
    WHERE je.job_id = job_id_param 
    AND je.executed_at > NOW() - (days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitoring_jobs_updated_at BEFORE UPDATE ON monitoring_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_usage_updated_at BEFORE UPDATE ON api_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO monitoring_jobs (name, search_query, filters, max_pages, price_threshold) VALUES
('Wireless Headphones Under $100', 'wireless headphones', '{"priceMax": 100, "primeOnly": true}', 3, 0.10),
('Gaming Laptops', 'gaming laptop', '{"priceMin": 800, "minRating": 4}', 5, 0.05),
('Smart Watches', 'smart watch', '{"primeOnly": true}', 2, 0.15)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_snapshots_composite 
ON price_snapshots(job_id, created_at DESC, price);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_alerts_composite 
ON price_alerts(job_id, created_at DESC, alert_type);

-- Analyze tables for query optimization
ANALYZE sessions;
ANALYZE monitoring_jobs;
ANALYZE price_snapshots;
ANALYZE price_alerts;
ANALYZE job_executions;
ANALYZE purchases;
ANALYZE api_usage;