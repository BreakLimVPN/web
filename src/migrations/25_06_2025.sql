CREATE TABLE users (
    uuid UUID NOT NULL,
    username varchar(50) NOT NULL,
    hash_password varchar(200) NOT NUll
);

CREATE TABLE vpn_servers (
    id serial NOT NUll PRIMARY KEY,
    ipv4 varchar(20) NOT NUll,
    server_location varchar(20) NOT NUll,
    networks_bandwidth INT NOT NULL,
    image_url varchar(200)
)