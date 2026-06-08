import { createConnection } from "mysql2/promise";

const config = {
    host: process.env.DB_HOSTNAME,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
};

const connection = await createConnection(config);

export default connection;