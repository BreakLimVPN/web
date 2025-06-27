from abc import ABC, abstractmethod
from uuid import UUID


class GetUserStrategy(ABC):
    @abstractmethod
    def __init__(self, identifier):
        self.identifier = identifier
        pass
    
    @abstractmethod
    def query(self) -> str:
        pass

class GetFullUserStrategy(ABC):
    @abstractmethod
    def __init__(self, identifier):
        self.identifier = identifier
        pass
    
    @abstractmethod
    def query(self) -> str:
        pass

class GetFullUserByNameStragegy(GetFullUserStrategy):
    def __init__(self, identifier: str):
        self.identifier = identifier

    def query(self) -> str:
        query = """select username, uuid, hash_password from users where username = $1"""
        return query

class GetUserByIdStragegy(GetUserStrategy):
    def __init__(self, identifier: UUID):
        self.identifier = identifier

    def query(self) -> str:
        query = """select username, uuid from users where uuid = $1"""
        return query

class GetUserByNameStragegy(GetUserStrategy):
    def __init__(self, identifier: str):
        self.identifier = identifier

    def query(self) -> str:
        query = """select username, uuid from users where username = $1"""
        return query


class GetUserBySessionStrategy(GetUserStrategy):
    def __init__(self, identifier: str):
        self.identifier = identifier

    def query(self) -> str:
        query = """
        select u.uuid, u.username from users_session us
        join users u on us.user_uuid = u.uuid
        where us.session = $1
        """
        return query