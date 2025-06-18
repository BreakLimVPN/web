from typing import AsyncGenerator
import pytest
from httpx import AsyncClient


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Asynchronous test client"""
    async with AsyncClient(base_url="http://localhost:8000") as ac:
        yield ac
