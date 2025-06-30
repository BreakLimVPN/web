-- Создание таблицы configs для хранения VPN конфигураций
CREATE TABLE configs (
    id SERIAL PRIMARY KEY,
    server_id INTEGER NOT NULL,
    config_uuid UUID NOT NULL,
    user_uuid UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Внешние ключи
    CONSTRAINT fk_configs_server 
        FOREIGN KEY (server_id) 
        REFERENCES vpn_servers(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_configs_user 
        FOREIGN KEY (user_uuid) 
        REFERENCES users(uuid) 
        ON DELETE CASCADE,
    
    -- Уникальные ограничения
    CONSTRAINT uk_config_uuid UNIQUE (config_uuid)
);

-- Создание индексов для оптимизации запросов
CREATE INDEX idx_configs_server_id ON configs(server_id);
CREATE INDEX idx_configs_user_uuid ON configs(user_uuid);
CREATE INDEX idx_configs_config_uuid ON configs(config_uuid);
CREATE INDEX idx_configs_created_at ON configs(created_at);


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_configs_updated_at 
    BEFORE UPDATE ON configs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Комментарии к таблице и колонкам
COMMENT ON TABLE configs IS 'Таблица для хранения VPN конфигураций пользователей';
COMMENT ON COLUMN configs.id IS 'Уникальный идентификатор записи';
COMMENT ON COLUMN configs.server_id IS 'ID сервера из таблицы vpn_servers';
COMMENT ON COLUMN configs.config_uuid IS 'Уникальный UUID конфигурации';
COMMENT ON COLUMN configs.user_uuid IS 'UUID пользователя из таблицы users';
COMMENT ON COLUMN configs.created_at IS 'Дата создания конфигурации';
COMMENT ON COLUMN configs.updated_at IS 'Дата последнего обновления конфигурации'; 