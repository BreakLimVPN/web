from typing import Annotated
from fastapi import APIRouter, Cookie, HTTPException, Response

from webvpn.entities.application import ApplicationResponse, ChechCodeResponse
from webvpn.entities.request import CheckCodeRequest
from webvpn.utils import response


checkcode_rt = APIRouter(prefix="/check", tags=["Check"])


@checkcode_rt.post(
    "/index-code/", response_model=ApplicationResponse[ChechCodeResponse]
)
async def check_code(checkcode_body: CheckCodeRequest, rsp: Response):
    accepted = checkcode_body.code == 999999
    if not accepted:
        raise HTTPException(status_code=402, detail="Incorrect Code")

    rsp.set_cookie(key="verify_token", value="token123")
    return response(ChechCodeResponse(True))


@checkcode_rt.post(
    "/verify-token/", response_model=ApplicationResponse[ChechCodeResponse]
)
async def check_verify_token(verify_token: Annotated[str | None, Cookie()] = None):
    if not verify_token:
        raise HTTPException(status_code=401, detail="Verify not found")

    # Check, что токен выпущен именно backend'ом

    return response(ChechCodeResponse(accepted=True))
