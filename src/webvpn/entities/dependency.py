from typing import Annotated

from asyncpg import Connection
from fastapi import Cookie, Depends

from webvpn.entities.user import User
from webvpn.repositories.postgres.database import pg_session
from fastapi import HTTPException
from webvpn.repositories.users.get_users_strategy import GetUserBySessionStrategy
from webvpn.repositories.users.user import UserRepo



PGConnectionDepends = Annotated[Connection, Depends(pg_session)]
VerifyToken = Annotated[str | None, Cookie()]
SessionToken = Annotated[str | None, Cookie()]


async def get_user(bvpn_session: SessionToken, connect: PGConnectionDepends) -> User:
    if not bvpn_session:
        raise HTTPException(status_code=400, detail="Login Required")
    user: User | None = await UserRepo.get(
        GetUserBySessionStrategy(bvpn_session), connect
    )
    if not user:
        raise HTTPException(
            status_code=400, detail="Что-то пошло не так. Пользователь не найден"
        )
        
    return user

UserDepends = Annotated[User, Depends(get_user)]


