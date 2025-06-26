from typing import Annotated
from asyncpg import Connection
from fastapi import Depends
from webvpn.entities.user import User
from webvpn.repositories.postgres.database import pg_session
from webvpn.utils import generate_uuid
from passlib.hash import bcrypt

class UserCreateError(Exception):
    pass


class UserRepository:
    async def create(self, username, password, connect: Connection) -> User:
        # Проверка что username и password есть
        if not username or not password:
            raise UserCreateError('Заполните поля username/password')

        # Создание пользователя
        hash_password = bcrypt.hash(password)
        new_user = User(
            uid=generate_uuid(),
            username=username,
        )
        
        # Save
        await self._create(new_user, hash_password, connect)

        return new_user
    
    async def _create(self, user: User, hash_password, connect: Connection):
        query = "INSERT INTO users (uuid, username, hash_password) VALUES ($1, $2, $3)"
        response = await connect.fetch(query, user.uid, user.username, hash_password)
        print(response)

UserRepo = UserRepository()