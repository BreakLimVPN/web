from typing import Annotated

from asyncpg import Connection
from fastapi import Cookie, Depends

from webvpn.repositories.postgres.database import pg_session


PGConnectionDepends = Annotated[Connection, Depends(pg_session)]
VerifyToken = Annotated[str | None, Cookie()]
SessionToken = Annotated[str | None, Cookie()]
