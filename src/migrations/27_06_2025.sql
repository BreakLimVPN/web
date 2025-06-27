ALTER TABLE users ADD CONSTRAINT pk_users_uuid PRIMARY KEY (uuid);

CREATE TABLE users_session (
    id SERIAL PRIMARY KEY,
    user_uuid UUID NOT NULL,
    session VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT fk_users_session_user_uuid 
        FOREIGN KEY (user_uuid) 
        REFERENCES users(uuid) 
        ON DELETE CASCADE
);

-- Индексы для оптимизации поиска
CREATE INDEX idx_users_session_user_uuid ON users_session(user_uuid);
CREATE INDEX idx_users_session_session ON users_session(session);
CREATE INDEX idx_users_session_active ON users_session(is_active) WHERE is_active = TRUE;