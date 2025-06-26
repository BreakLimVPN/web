# Используем официальный Python образ
FROM python:3.13-alpine

# Устанавливаем системные зависимости
RUN apk add --no-cache gcc musl-dev libffi-dev

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы зависимостей
COPY pyproject.toml poetry.lock ./

# Устанавливаем poetry
RUN pip install poetry

# Настраиваем poetry (не создавать виртуальное окружение)
RUN poetry config virtualenvs.create false

# Устанавливаем зависимости
RUN poetry install --no-root

# Копируем исходный код
COPY . .

# Открываем порт
EXPOSE 8000

# Команда запуска (можно переопределить в compose)
CMD ["fastapi", "run", "src/webvpn", "--reload"]