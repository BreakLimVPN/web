

from typing import Callable
from uuid import UUID

from asyncpg import Connection

from webvpn.repositories.configs.get_configs_strategy import GetConfigStrategy


class ConfigsRepository:
    async def get(self, strategy: GetConfigStrategy, connect: Connection, mapper: Callable):
        record = await connect.fetch(strategy.query(), strategy.identifier)
        return mapper(record)
    
    async def create(
        self,
        server_id: int,
        user_uuid: UUID,
        config_uuid: UUID,
        connect: Connection,
        config_name: str,
        config_enabled: bool = True
    ) -> int:
        query = "INSERT INTO configs (server_id, user_uuid, config_uuid, config_name, config_enabled) VALUES ($1, $2, $3, $4, $5) RETURNING id"
        result: int = await connect.fetchval(query, server_id, user_uuid, config_uuid, config_name, config_enabled)
        return result

    async def toggle_enabled(
        self,
        config_enabled: bool,
        config_id: int,
        connect: Connection,
    ) -> bool:
        query = "UPDATE configs set config_enabled = $1 WHERE id = $2 RETURNING TRUE"
        result: bool = await connect.fetchval(query, config_enabled, config_id)
        return bool(result)

    async def delete(
        self,
        config_id: int,
        connect: Connection,
    ) -> bool:
        query = "DELETE FROM configs WHERE id = $1 RETURNING TRUE"
        result: bool = await connect.execute(query, config_id)
        return bool(result)

ConfigRepo = ConfigsRepository()