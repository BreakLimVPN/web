from fastapi import APIRouter
from webvpn.entities.dependency import PGConnectionDepends
from webvpn.repositories.auth_session.get_session_strategy import GetSessionByUserUUIDStragegy
from webvpn.repositories.auth_session.sessions import AuthSessionRepo
from webvpn.repositories.users.get_users_strategy import GetUserByNameStragegy
from webvpn.repositories.users.user import UserRepo
from webvpn.utils import response
from webvpn.entities.application import ApplicationResponse, HealthResponse, PongResponse


health_rt = APIRouter(tags=['Health'])


@health_rt.get(
    '/health/',
    response_model=ApplicationResponse[HealthResponse],
)
async def health():
    return response(
        HealthResponse()
    )

@health_rt.get(
    '/ping/',
    response_model=ApplicationResponse[PongResponse]
)
async def pong(connection: PGConnectionDepends):
    user = await UserRepo.get(GetUserByNameStragegy('qwe'), connection)
    await AuthSessionRepo.create(user, connection)
    session = await AuthSessionRepo.get(
        GetSessionByUserUUIDStragegy(user.uuid),
        connection
    )
    print(session)
    return response(
        PongResponse()
    )
