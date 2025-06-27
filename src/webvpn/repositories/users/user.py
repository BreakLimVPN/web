from asyncpg import Connection
from fastapi import HTTPException
from webvpn.entities.user import FullUser, User
from webvpn.repositories.users.get_users_strategy import GetFullUserStrategy, GetUserByNameStragegy, GetUserStrategy
from webvpn.repositories.users.users_mapper import full_user_mapper, user_mapper
from webvpn.utils import generate_uuid
from passlib.hash import bcrypt

class UserCreateError(Exception):
    pass


class UserRepository:
    async def create(self, username, password, connect: Connection) -> User:
        # Проверка что username и password есть
        if not username or not password:
            raise HTTPException(status_code=400, detail='Заполните поля username/password')
        
        database_user = await self.get(
            GetUserByNameStragegy(username),
            connect
        )
        if database_user:
            raise HTTPException(status_code=400, detail='Пользователь уже сущесвует')
        
        # Создание пользователя
        hash_password = bcrypt.hash(password)
        new_user = User(
            uuid=generate_uuid(),
            username=username,
        )
        
        # Save
        await self._create(new_user, hash_password, connect)

        return new_user
    
    async def get(self, strategy: GetUserStrategy, connect: Connection) -> User | None:
        record = await connect.fetch(
            strategy.query(),
            strategy.identifier
        )
        return user_mapper(record)
    
    async def get_full_user(self, strategy: GetFullUserStrategy, connect: Connection) -> FullUser | None:
        record = await connect.fetch(
            strategy.query(),
            strategy.identifier
        )
        return full_user_mapper(record)
    
    async def _create(self, user: User, hash_password, connect: Connection):
        query = "INSERT INTO users (uuid, username, hash_password) VALUES ($1, $2, $3)"
        await connect.fetch(query, user.uuid, user.username, hash_password)

UserRepo = UserRepository()