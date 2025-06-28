from asyncpg import Connection, Record

from webvpn.repositories.vpn_servers.mapper import vpn_server_mapper, vpn_servers_list_mapper
from webvpn.repositories.vpn_servers.strategy import GetVpnServerStrategy


class VPNServerRepository:
    def save(self):
        pass

    async def get(self, strategy: GetVpnServerStrategy, connect: Connection):
        record: list[Record] = await connect.fetch(
            strategy.query(),
            strategy.identifier
        )
        return vpn_server_mapper(record)

    async def get_list(self, connect: Connection, limit: int = 10):
        query = f'SELECT * FROM vpn_servers LIMIT {limit}'
        records = await connect.fetch(query)
        return vpn_servers_list_mapper(records)


VPNServerRepo = VPNServerRepository()