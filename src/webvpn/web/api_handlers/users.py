
from fastapi import APIRouter

from webvpn.entities.application import ApplicationResponse
from webvpn.entities.dependency import PGConnectionDepends
from webvpn.entities.user import User
from webvpn.repositories.users.user import UserRepo
from webvpn.utils import response


user_rt = APIRouter(prefix='/users', tags=['Users'])

@user_rt.post(
    '/create/',
    response_model=ApplicationResponse[User]
)
async def create_user(username, password, connect: PGConnectionDepends) -> ApplicationResponse[User]:
    user: User = await UserRepo.create(
        username=username,
        password=password,
        connect=connect,
    )
    return response(user)