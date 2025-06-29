from abc import ABC, abstractmethod
from uuid import UUID


class GetConfigStrategy(ABC):
    @abstractmethod
    def __init__(self, identifier):
        self.identifier = identifier
        pass

    @abstractmethod
    def query(self) -> str:
        pass

class GetConfigsByUserUUID(GetConfigStrategy):
    def __init__(self, identifier: UUID):
        self.identifier = identifier

    def query(self):
        return "SELECT * FROM configs WHERE user_uuid = $1"

class GetConfigsByConfigUUID(GetConfigStrategy):
    def __init__(self, identifier: UUID):
        self.identifier = identifier

    def query(self):
        return "SELECT * FROM configs WHERE config_uuid = $1"