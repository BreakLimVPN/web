.PHONY: start stop 

start:
	@fastapi run src/webvpn --reload

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