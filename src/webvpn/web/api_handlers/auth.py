from fastapi import APIRouter, Form, HTTPException, Response

from webvpn.entities.application import ApplicationResponse
from webvpn.entities.dependency import PGConnectionDepends
from webvpn.entities.sessions import Session
from webvpn.entities.user import FullUser, User
from webvpn.repositories.auth_session.sessions import AuthSessionRepo
from webvpn.repositories.users.get_users_strategy import GetFullUserByNameStragegy
from webvpn.repositories.users.user import UserRepo
from webvpn.utils import hash_password, response
from passlib.hash import bcrypt

auth_rt = APIRouter(prefix="/auth", tags=["Auth"])


@auth_rt.post("/register/", response_model=ApplicationResponse[User])
async def register_user(
    rsp: Response,
    connect: PGConnectionDepends,
    username: str = Form(...),
    password: str = Form(...),
) -> ApplicationResponse[User]:
    user: User = await UserRepo.create(
        username=username,
        password=password,
        connect=connect,
    )
    if not user:
        raise HTTPException(status_code=400, detail="Что-то пошло не так")

    session: Session | None = await AuthSessionRepo.create(user, connect)
    if not session:
        raise HTTPException(status_code=400, detail="Что-то пошло не так")

    rsp.set_cookie("bvpn_session", session.session)
    return response(user)


@auth_rt.post("/login/", response_model=ApplicationResponse[bool])
async def login_user(
    rsp: Response,
    connect: PGConnectionDepends,
    username: str = Form(...),
    password: str = Form(...),
) -> ApplicationResponse[bool]:
    user: FullUser | None = await UserRepo.get_full_user(
        GetFullUserByNameStragegy(username), connect
    )

    if not user:
        raise HTTPException(status_code=400, detail="Пользователь не найден")

    if not bcrypt.verify(password, user.hash_password):
        raise HTTPException(status_code=400, detail="Неправильный логин или пароль")

    session: Session | None = await AuthSessionRepo.create(user, connect)
    if not session:
        raise HTTPException(status_code=400, detail="Что-то пошло не так")

    rsp.set_cookie("bvpn_session", session.session)
    return response(True)
