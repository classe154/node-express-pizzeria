import { initDb, getConnection } from "../data/db.js";
import { generateSlug } from "../utils/pizzas.js";

let connection = null;

initDb()
    .then(() => {
        console.log('Database inizializzato');
        connection = getConnection();

    }).then(() => {
        console.log('Fase 1: Aggiunta delle nuove colonne...');
        return connection.query(`alter table pizzas
            add column slug varchar(255) null after name,
            add column price decimal(10,2) not null default 10.00,
            add column spicy tinyint not null default 0,
            add column createdAt datetime not null default now(),
            add column updatedAt datetime not null default now(),
            add column deletedAt datetime default null;
        `);

    }).then(() => {
        console.log('Colonne create. Fase 2: Recupero record...');
        return connection.query(`select * from pizzas;`).then(([rows]) => {
            return rows.reduce((promiseChain, row) => {
                return promiseChain.then(() => {
                    const slug = generateSlug(row);
                    return connection.execute(
                        `update pizzas set slug = ? where id = ?`,
                        [slug, row.id]
                    );
                });
            }, Promise.resolve());
        });

    }).then(() => {
        console.log('Righe aggiornate. Fase 3: Applicazioni vincoli finali...');
        return connection.query(`alter table pizzas
            modify column slug varchar(255) not null,
            add unique index (slug);
        `);

    }).then(() => {
        console.log('Vincoli aggiunti.');

    }).catch (error => {
        console.error(error);

    }).finally(() => {
        if (connection !== null) {
            connection.end();
            console.log('Database disconnesso.');
        }    
    });