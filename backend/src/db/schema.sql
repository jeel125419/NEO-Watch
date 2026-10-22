-- NEO Watch PostgreSQL Schema
-- Tables defined per design.md

CREATE TABLE IF NOT EXISTS neo_objects (
    id SERIAL PRIMARY KEY,
    neo_reference_id VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    absolute_magnitude_h DOUBLE PRECISION,
    estimated_diameter_min_km DOUBLE PRECISION,
    estimated_diameter_max_km DOUBLE PRECISION,
    is_potentially_hazardous BOOLEAN NOT NULL DEFAULT FALSE,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orbital_elements (
    id SERIAL PRIMARY KEY,
    neo_object_id INTEGER NOT NULL REFERENCES neo_objects(id) ON DELETE CASCADE,
    eccentricity DOUBLE PRECISION,
    inclination DOUBLE PRECISION,
    semi_major_axis DOUBLE PRECISION,
    orbital_period DOUBLE PRECISION,
    perihelion_distance DOUBLE PRECISION,
    CONSTRAINT uq_orbital_elements_neo UNIQUE (neo_object_id)
);

CREATE TABLE IF NOT EXISTS close_approach_events (
    id SERIAL PRIMARY KEY,
    neo_object_id INTEGER NOT NULL REFERENCES neo_objects(id) ON DELETE CASCADE,
    approach_date DATE,
    relative_velocity_kmh DOUBLE PRECISION,
    miss_distance_km DOUBLE PRECISION,
    orbiting_body VARCHAR(64) DEFAULT 'Earth'
);

CREATE INDEX IF NOT EXISTS idx_close_approach_neo ON close_approach_events(neo_object_id);
CREATE INDEX IF NOT EXISTS idx_close_approach_miss_dist ON close_approach_events(miss_distance_km);
CREATE INDEX IF NOT EXISTS idx_neo_hazardous ON neo_objects(is_potentially_hazardous);

-- Phase 2 stub tables (to avoid painful migrations later; no logic built for these in MVP)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS watchlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    neo_object_id INTEGER NOT NULL REFERENCES neo_objects(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_watchlist_user_neo UNIQUE (user_id, neo_object_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);

CREATE TABLE IF NOT EXISTS observations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    neo_object_id INTEGER NOT NULL REFERENCES neo_objects(id) ON DELETE CASCADE,
    observed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    long DOUBLE PRECISION NOT NULL,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_observations_user_id ON observations(user_id);
CREATE INDEX IF NOT EXISTS idx_observations_neo_id ON observations(neo_object_id);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    neo_object_id INTEGER REFERENCES neo_objects(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- 'refinement' | 'close_approach' | 'hazard_shift' | 'visibility'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'info', -- 'info' | 'warning' | 'alert'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
