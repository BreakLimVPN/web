from fastapi import APIRouter
from webvpn.entities.dependency import PGConnectionDepends
from webvpn.entities.user import User
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
async def pong():
    return response(
        PongResponse()
    )
