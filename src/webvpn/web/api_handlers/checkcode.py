

from fastapi import APIRouter

from webvpn.entities.application import ApplicationResponse, ChechCodeResponse
from webvpn.entities.request import CheckCodeRequest
from webvpn.utils import response


checkcode_rt = APIRouter()


@checkcode_rt.post(
    '/checkCode',
    response_model=ApplicationResponse[ChechCodeResponse]
)
async def check_code(checkcode_body: CheckCodeRequest):
    accepted = checkcode_body.code == 999999
    return response(
        ChechCodeResponse(accepted=accepted)
    )