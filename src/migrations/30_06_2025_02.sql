ALTER TABLE configs 
ADD COLUMN config_name VARCHAR(255),
ADD COLUMN config_enabled BOOLEAN DEFAULT true;

-- ШАГ 2: Обновление существующих записей (если есть)
-- Установка значений по умолчанию для существующих записей
UPDATE configs 
SET config_name = 'Config_' || id::text,
    config_enabled = true 
WHERE config_name IS NULL;

-- ШАГ 3: Добавление ограничений NOT NULL
ALTER TABLE configs 
ALTER COLUMN config_name SET NOT NULL,
ALTER COLUMN config_enabled SET NOT NULL;

-- ШАГ 4: Добавление ограничений CHECK
ALTER TABLE configs 
ADD CONSTRAINT chk_config_name_not_empty 
    CHECK (LENGTH(TRIM(config_name)) > 0),
ADD CONSTRAINT chk_config_name_length 
    CHECK (LENGTH(config_name) BETWEEN 1 AND 255);

-- ШАГ 5: Создание новых индексов
CREATE INDEX IF NOT EXISTS idx_configs_enabled ON configs(config_enabled);
CREATE INDEX IF NOT EXISTS idx_configs_user_enabled ON configs(user_uuid, config_enabled);
CREATE INDEX IF NOT EXISTS idx_configs_user_server ON configs(user_uuid, server_id);

-- ШАГ 6: Обновление комментариев
COMMENT ON COLUMN configs.config_name IS 'Название конфигурации (обязательное поле)';
COMMENT ON COLUMN configs.config_enabled IS 'Статус активности конфигурации (true/false)';