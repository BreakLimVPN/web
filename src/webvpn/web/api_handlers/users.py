from fastapi import APIRouter, HTTPException

from webvpn.entities.application import ApplicationResponse
from webvpn.entities.dependency import PGConnectionDepends, SessionToken
from webvpn.entities.user import User
from webvpn.repositories.users.get_users_strategy import GetUserBySessionStrategy
from webvpn.repositories.users.user import UserRepo
from webvpn.utils import response


user_rt = APIRouter(prefix="/users", tags=["Users"])


@user_rt.post("/create/", response_model=ApplicationResponse[User])
async def create_user(
    username, password, connect: PGConnectionDepends
) -> ApplicationResponse[User]:
    user: User = await UserRepo.create(
        username=username,
        password=password,
        connect=connect,
    )
    return response(user)


@user_rt.get("/self/", response_model=ApplicationResponse[User])
async def self(
    bvpn_session: SessionToken, connect: PGConnectionDepends
) -> ApplicationResponse[User]:
    if not bvpn_session:
        raise HTTPException(status_code=400, detail="Login Required")
    user: User | None = await UserRepo.get(
        GetUserBySessionStrategy(bvpn_session), connect
    )

    if not user:
        raise HTTPException(
            status_code=400, detail="Что-то пошло не так. Пользователь не найден"
        )

    return response(user)
