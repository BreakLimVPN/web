

from uuid import UUID
from asyncpg import Connection

from webvpn.entities.sessions import Session
from webvpn.entities.user import User
from webvpn.repositories.auth_session.session_mapper import session_mapper
from webvpn.repositories.auth_session.get_session_strategy import GetSessionByUserUUIDStragegy, GetSessionStrategy
from webvpn.utils import generate_session



class AuthSessionRepository:
    async def create(self, user: User, connect: Connection) -> Session | None:
        old_session: Session | None = await self.get(
            GetSessionByUserUUIDStragegy(user.uuid),
            connect
        )
        if old_session and old_session.is_active:
            return old_session

        session_key = generate_session()
        await self._create(user.uuid, session_key, connect)
        return await self.get(
            GetSessionByUserUUIDStragegy(user.uuid),
            connect
        )
    
    async def get(self, strategy: GetSessionStrategy, connect: Connection) -> Session | None:
        record = await connect.fetch(
            strategy.query(),
            strategy.identifier
        )
        return session_mapper(record)
    
    async def _create(self, user_uuid: UUID, session, connect: Connection):
        query = "INSERT INTO users_session (user_uuid, session) VALUES ($1, $2)"
        await connect.fetch(query, user_uuid, session)


AuthSessionRepo = AuthSessionRepository()