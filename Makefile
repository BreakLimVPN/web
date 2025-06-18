.PHONY: start stop 

start:
	@fastapi run src/webvpn --reload

silent-start:
	@fastapi run src/webvpn --reload > /dev/null 2>&1 &
	@sleep 2
	@echo "Server Start"


stop:
	@PID=$$(lsof -ti :8000) && echo "Found PID: $$PID" && kill $$PID > /dev/null 2>&1 && sleep 1 && echo "Server shutdown" || echo "Process not found"


tests: silent-start
	@pytest && echo "Tests Ok" && sleep 1 && $(MAKE) stop