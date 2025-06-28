from abc import ABC, abstractmethod


class GetVpnServerStrategy(ABC):
    @abstractmethod
    def __init__(self, identifier):
        self.identifier = identifier
        pass

    @abstractmethod
    def query(self) -> str:
        pass


class GetVpnServerByIdStrategy(GetVpnServerStrategy):
    def __init__(self, identifier: int):
        self.identifier = identifier

    def query(self) -> str:
        query = """select * from vpn_servers where id = $1 LIMIT 1"""
        return query

