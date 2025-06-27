from abc import ABC, abstractmethod
from uuid import UUID


class GetSessionStrategy(ABC):
    @abstractmethod
    def __init__(self, identifier):
        self.identifier = identifier
        pass
    
    @abstractmethod
    def query(self) -> str:
        pass


class GetSessionByUserUUIDStragegy(GetSessionStrategy):
    def __init__(self, identifier: UUID):
        self.identifier = identifier

    def query(self) -> str:
        query = """select * from users_session where user_uuid = $1 LIMIT 1"""
        return query


class GetSessionBySessionKeyStragegy(GetSessionStrategy):
    def __init__(self, identifier: str):
        self.identifier = identifier

    def query(self) -> str:
        query = """select * from users_session where session = $1 LIMIT 1"""
        return query
