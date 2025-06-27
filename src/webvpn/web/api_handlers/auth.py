
from fastapi import APIRouter, Form, Response

from webvpn.entities.application import ApplicationResponse
from webvpn.entities.dependency import PGConnectionDepends
from webvpn.entities.user import User
from webvpn.repositories.users.user import UserRepo
from webvpn.utils import response


auth_rt = APIRouter(prefix='/auth', tags=['Auth'])

@auth_rt.post(
    '/register/',
    response_model=ApplicationResponse[User]
)
async def register_user(
    rsp: Response,
    connect: PGConnectionDepends,
    username: str = Form(...),
    password: str = Form(...)
) -> ApplicationResponse[User]:
    user: User = await UserRepo.create(
        username=username,
        password=password,
        connect=connect,
    )
    rsp.set_cookie(
        'bvpn_session',
        'bvpn_session123'
    )
    return response(user)

@auth_rt.post(
    '/login/',
    response_model=ApplicationResponse[bool]
)
async def login_user(rsp: Response) -> ApplicationResponse[bool]:
    rsp.set_cookie(
        'bvpn_session',
        'bvpn_session123'
    )
    return response(True)