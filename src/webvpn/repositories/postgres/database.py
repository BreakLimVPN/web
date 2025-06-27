from typing import AsyncGenerator

from webvpn.settings.base import settings
from asyncpg import Connection, create_pool, Pool

db_pool: Pool = None


async def initialize_databaze_pool():
    global db_pool
    db_pool = await create_pool(
        dsn=settings.DSN,
        min_size=1,
        max_size=10,
        command_timeout=60,
    )


async def close_database_pool():
    if db_pool:
        await db_pool.close()


async def pg_session() -> AsyncGenerator[Connection, None]:
    async with db_pool.acquire() as conn:
        yield conn
