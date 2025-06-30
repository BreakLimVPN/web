.PHONY: start stop 

build:
	docker build -f docker/Dockerfile -t breaklimvpn .

start-docker:
	docker run -p 8000:8000 breaklimvpn

install-prod:
	python -m pip install --upgrade pip && \
	pip install poetry && \
	poetry config virtualenvs.create false && \
	poetry install --no-root

install-dev:
	python -m pip install --upgrade pip
	pip install poetry
	poetry config virtualenvs.create false
	poetry install --with dev --no-root

start:
	@fastapi run src/webvpn --reload

start-dev:
	@fastapi dev src/webvpn --reload

start-prod:
	@gunicorn -w 4 -k uvicorn.workers.UvicornWorker --pythonpath src src.webvpn.app:app --bind 0.0.0.0:8000

silent-start:
	@fastapi run src/webvpn --reload > /dev/null 2>&1 & \
	echo "Server Starting.." && \
	sleep 1 &&\
	until curl -s http://localhost:8000/api/health/ > /dev/null 2>&1; do sleep 1; done && \
	echo "Server Start"


stop:
	@PID=$$(lsof -ti :8000) && echo "Found PID: $$PID" && kill $$PID > /dev/null 2>&1 && sleep 1 && echo "Server shutdown" || echo "Process not found"


tests: silent-start
	@pytest && echo "Tests Ok" && sleep 1 && $(MAKE) stop