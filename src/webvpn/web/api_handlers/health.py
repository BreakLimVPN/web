from fastapi import APIRouter
from webvpn.utils import response
from webvpn.entities.application import ApplicationResponse, HealthResponse, PongResponse


health_rt = APIRouter()


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