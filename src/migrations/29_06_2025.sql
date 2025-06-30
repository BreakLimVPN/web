CREATE TABLE vpn_servers_connection (
    id SERIAL NOT NULL PRIMARY KEY,
    server_id INTEGER NOT NULL,
    connection VARCHAR(255) NOT NULL,
    CONSTRAINT fk_server_id 
        FOREIGN KEY (server_id) 
        REFERENCES vpn_servers(id) 
        ON DELETE CASCADE
);