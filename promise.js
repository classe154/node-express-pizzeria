import { createConnection } from 'mysql2/promise';

const connection = await createConnection({
    host: process.env.DB_HOSTNAME,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

const username = process.argv[2];
const password = process.argv[3];

const query = `
select *
from users
where email = ? and password = ?;
`;

console.log(query);

try {
    const [rows] = await connection.execute(query, [username, password]);
    if (rows.length === 0) {
        console.log('Password Sbagliata');
    } else {
        console.log('Hai accesso');
    }
} catch (error) {
    console.error('Errore nella query:' + error.message);
}


await connection.end();

