

from typing import Callable
from uuid import UUID

from asyncpg import Connection

from webvpn.entities.configs import VpnConfig
from webvpn.repositories.configs.get_configs_strategy import GetConfigStrategy


class ConfigsRepository:
    async def get(self, strategy: GetConfigStrategy, connect: Connection, mapper: Callable) -> VpnConfig | None:
        record = await connect.fetch(strategy.query(), strategy.identifier)
        return mapper(record)
    
    async def create(self, server_id: int, user_uuid: UUID, config_uuid: UUID, connect: Connection) -> int:
        query = "INSERT INTO configs (server_id, user_uuid, config_uuid) VALUES ($1, $2, $3) RETURNING id"
        result: int = await connect.fetchval(query, server_id, user_uuid, config_uuid)
        return result

ConfigRepo = ConfigsRepository()