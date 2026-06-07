import mysql from 'mysql2/promise';

const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'test',
};

let connection = null;

function initDb() {
    return mysql.createConnection(connectionConfig)
        .then(conn => {
            connection = conn;
        });
}

function getConnection() {
    if (connection === null) {
        throw new Error('Database non inizializzato');
    } else {
        return connection;
    }
}

export {
    initDb,
    getConnection
}