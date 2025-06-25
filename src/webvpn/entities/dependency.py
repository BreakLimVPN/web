

from typing import Annotated

from asyncpg import Connection
from fastapi import Depends

from webvpn.repositories.postgres.database import pg_session


PGConnectionDepends = Annotated[Connection, Depends(pg_session)]
