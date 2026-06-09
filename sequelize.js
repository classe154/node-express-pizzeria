// =============================================================================
// ESEMPIO DIDATTICO: Sequelize ORM
// =============================================================================
//
// Questo file NON fa parte dell'app, serve solo come confronto tra:
//   - le query SQL "raw" che già usiamo in controllers/pizzas.js
//   - lo stesso risultato scritto con Sequelize
//
// Per provarlo devi installare la libreria:
//   pnpm add sequelize
//
// mysql2 è già installato come "dialetto" (il driver che Sequelize usa internamente).
// =============================================================================


import { Sequelize, DataTypes, Op } from 'sequelize';


// =============================================================================
// 1. CONNESSIONE AL DATABASE
// =============================================================================
//
// PRIMA (con mysql2/promise in data/db.js):
//   import { createConnection } from 'mysql2/promise';
//   const connection = await createConnection({ host, user, password, database });
//
// CON SEQUELIZE:
//   Passiamo le stesse credenziali, ma diciamo anche il "dialetto" (mysql).
//   Sequelize gestirà la connessione internamente.

const sequelize = new Sequelize(
    process.env.DB_DATABASE,
    process.env.DB_USERNAME,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOSTNAME,
        port: process.env.DB_PORT,
        dialect: 'mysql',
        logging: false, // true = stampa ogni query SQL generata (utile per il debug)
    }
);


// =============================================================================
// 2. MODELLI — cosa sono?
// =============================================================================
//
// Un "modello" in Sequelize è una classe JavaScript che rappresenta una tabella
// del database. Definire un modello serve a due cose:
//
//   1. Sequelize sa quali colonne esistono → può costruire le query giuste
//   2. Ogni riga restituita è un oggetto JavaScript "intelligente" su cui possiamo
//      chiamare metodi come .save(), .destroy(), ecc.
//
// IMPORTANTE: il modello descrive la tabella, NON la crea (a meno di sync({ force: true })).
// La tabella nel database può esistere già (come nel nostro caso).


// --- Modello Pizza -----------------------------------------------------------
// Corrisponde alla tabella "pizzas" nel database.

const Pizza = sequelize.define('Pizza', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(45),  // varchar(45) nel DB
        allowNull: false,
        unique: true,
    },
    image: {
        type: DataTypes.STRING(45),  // varchar(45) nel DB
        allowNull: true,
        unique: true,
    },
}, {
    tableName: 'pizzas',   // nome esatto della tabella nel DB
    timestamps: false,     // la nostra tabella non ha created_at/updated_at automatici
});


// --- Modello Ingredient ------------------------------------------------------
// Corrisponde alla tabella "ingredients" nel database.

const Ingredient = sequelize.define('Ingredient', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(45),  // varchar(45) nel DB
        allowNull: false,
        unique: true,
    },
}, {
    tableName: 'ingredients',
    timestamps: false,
});


// =============================================================================
// 3. ASSOCIAZIONI (relazioni tra modelli)
// =============================================================================
//
// La nostra pizzeria ha una relazione molti-a-molti tra pizze e ingredienti:
//   una pizza ha MOLTI ingredienti, un ingrediente appartiene a MOLTE pizze.
// La tabella di mezzo si chiama "ingredient_pizza".
//
// Con mysql2 gestivamo questa relazione con JOIN manuali.
// Con Sequelize basta dichiararlo una volta sola qui sotto:

// La tabella di mezzo va definita come modello esplicito con timestamps: false,
// altrimenti Sequelize cerca createdAt/updatedAt che non esistono nel nostro DB.
const IngredientPizza = sequelize.define('IngredientPizza', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
}, {
    tableName: 'ingredient_pizza',
    timestamps: false,
});

Pizza.belongsToMany(Ingredient, {
    through: IngredientPizza,   // modello, non stringa
    foreignKey: 'pizza_id',
    otherKey: 'ingredient_id',
});

Ingredient.belongsToMany(Pizza, {
    through: IngredientPizza,
    foreignKey: 'ingredient_id',
    otherKey: 'pizza_id',
});

// Da questo momento Sequelize sa come fare la JOIN automaticamente
// quando usiamo l'opzione "include" nelle query (vedi esempi sotto).


// =============================================================================
// 4. OPERAZIONI CRUD A CONFRONTO
// =============================================================================

async function esempiCRUD() {

    // -------------------------------------------------------------------------
    // SELECT * FROM pizzas
    // -------------------------------------------------------------------------
    //
    // PRIMA (controllers/pizzas.js — funzione index):
    //   const [rows] = await connection.query('SELECT * FROM pizzas');
    //
    // CON SEQUELIZE:
    const tutteLePizze = await Pizza.findAll();
    console.log('Tutte le pizze:', tutteLePizze);
    // Risultato: array di istanze Pizza (con metodi .save(), .destroy(), ecc.)
    // Per ottenere un semplice oggetto JS: pizza.toJSON()


    // -------------------------------------------------------------------------
    // SELECT * FROM pizzas WHERE id = ?
    // -------------------------------------------------------------------------
    //
    // PRIMA:
    //   const [rows] = await connection.execute('SELECT * FROM pizzas WHERE id = ?', [1]);
    //   const pizza = rows[0];
    //
    // CON SEQUELIZE:
    const pizza = await Pizza.findByPk(1);  // PK = Primary Key
    if (pizza === null) {
        console.log('Pizza non trovata');
    } else {
        console.log('Pizza trovata:', pizza.toJSON());
    }


    // -------------------------------------------------------------------------
    // SELECT con JOIN — pizza + ingredienti
    // -------------------------------------------------------------------------
    //
    // PRIMA (la versione lunga in show()):
    //   Richiedeva due query separate + assemblaggio manuale degli ingredienti.
    //
    // CON SEQUELIZE — l'opzione "include" gestisce la JOIN automaticamente:
    const pizzaConIngredienti = await Pizza.findByPk(1, {
        include: [{ model: Ingredient }],
    });
    console.log('Pizza con ingredienti:', JSON.stringify(pizzaConIngredienti, null, 2));
    // Risultato:
    // {
    //   id: 1,
    //   name: 'Margherita',
    //   Ingredients: [
    //     { id: 1, name: 'pomodoro' },
    //     { id: 2, name: 'mozzarella' }
    //   ]
    // }


    // -------------------------------------------------------------------------
    // SELECT con WHERE personalizzato
    // -------------------------------------------------------------------------
    //
    // "Op" è l'oggetto con gli operatori SQL: Op.like, Op.gt, Op.or, ecc.

    const tutteLePizzeConIngredienti = await Pizza.findAll({
        include: [{ model: Ingredient }],
        order: [['name', 'ASC']],
    });
    console.log('Pizze ordinate per nome:', tutteLePizzeConIngredienti.length);

    // Esempio con Op.like (LIKE '%mari%'):
    const pizzeConMari = await Pizza.findAll({
        where: {
            name: { [Op.like]: '%mari%' },
        },
    });
    console.log('Pizze con "mari" nel nome:', pizzeConMari.length);


    // -------------------------------------------------------------------------
    // INSERT — creare una nuova pizza
    // -------------------------------------------------------------------------
    //
    // PRIMA (controllers/pizzas.js — funzione create):
    //   Richiedeva beginTransaction(), execute(INSERT ...), commit(), rollback()
    //   più un ciclo for per ogni ingrediente. ~70 righe di codice.
    //
    // Pulizia preventiva: se l'esempio è già stato eseguito e si è bloccato prima
    // del destroy(), la pizza di test potrebbe essere rimasta nel DB.
    await Pizza.destroy({ where: { name: 'Pizza di Test' } });

    // CON SEQUELIZE:
    const nuovaPizza = await Pizza.create({ name: 'Pizza di Test', image: 'test.webp' });
    console.log('Nuova pizza creata con id:', nuovaPizza.id);

    // Per creare e subito associare gli ingredienti:
    //   1. Troviamo (o creiamo) ogni ingrediente con findOrCreate
    //   2. Usiamo il metodo magico .setIngredients() generato dall'associazione

    const nomiIngredienti = ['pomodoro', 'mozzarella', 'salame piccante'];

    const ingredienti = await Promise.all(
        nomiIngredienti.map(nome =>
            Ingredient.findOrCreate({ where: { name: nome } })
            // findOrCreate restituisce [istanza, creato]
            // il [0] prende solo l'istanza
            .then(([istanza]) => istanza)
        )
    );

    // .setIngredients() gestisce automaticamente la tabella ingredient_pizza:
    // cancella i legami precedenti e inserisce quelli nuovi.
    await nuovaPizza.setIngredients(ingredienti);
    console.log('Ingredienti associati alla nuova pizza');


    // -------------------------------------------------------------------------
    // UPDATE — modificare una pizza
    // -------------------------------------------------------------------------
    //
    // PRIMA:
    //   connection.execute('UPDATE pizzas SET name=?, image=? WHERE id=?', [...])
    //
    // CON SEQUELIZE (metodo 1 — su istanza già caricata):
    nuovaPizza.name = 'Pizza di Test Modificata';
    await nuovaPizza.save();

    // CON SEQUELIZE (metodo 2 — aggiornamento diretto senza caricare prima):
    await Pizza.update(
        { name: 'Pizza di Test', image: 'test-nuovo.webp' },
        { where: { id: nuovaPizza.id } }
    );


    // -------------------------------------------------------------------------
    // DELETE — eliminare una pizza
    // -------------------------------------------------------------------------
    //
    // PRIMA:
    //   connection.execute('DELETE FROM pizzas WHERE id = ?', [id])
    //
    // CON SEQUELIZE (metodo 1 — su istanza già caricata):
    await nuovaPizza.destroy();

    // CON SEQUELIZE (metodo 2 — senza caricare l'istanza):
    const righeEliminate = await Pizza.destroy({ where: { id: 999 } });
    console.log('Righe eliminate:', righeEliminate); // 0 se non trovata


    // -------------------------------------------------------------------------
    // TRANSAZIONI
    // -------------------------------------------------------------------------
    //
    // Sequelize supporta le transazioni in modo più elegante tramite un callback:
    // se il callback lancia un errore, il rollback avviene automaticamente.

    try {
        await Pizza.destroy({ where: { name: 'Capricciosa Test' } }); // pulizia preventiva

        await sequelize.transaction(async (t) => {
            const p = await Pizza.create(
                { name: 'Capricciosa Test', image: 'capricciosa_test.webp' },
                { transaction: t }   // passiamo "t" a ogni operazione
            );

            const [salame] = await Ingredient.findOrCreate({
                where: { name: 'salame' },
                transaction: t,
            });

            await p.setIngredients([salame], { transaction: t });

            // Se qui lanciassimo un errore, Sequelize farebbe il rollback automatico
        });

        // Pulizia: rimuoviamo la pizza di test creata dalla transazione
        await Pizza.destroy({ where: { name: 'Capricciosa Test' } });

        console.log('Transazione completata con successo');
    } catch (error) {
        console.error('Transazione fallita, rollback eseguito:', error.message);
    }
}


// =============================================================================
// 5. RIEPILOGO — VANTAGGI DI SEQUELIZE
// =============================================================================
//
// | Operazione                  | mysql2 raw               | Sequelize              |
// |-----------------------------|--------------------------|------------------------|
// | Leggi tutte le righe        | query('SELECT * FROM …') | Pizza.findAll()        |
// | Leggi per id                | execute('… WHERE id=?')  | Pizza.findByPk(id)     |
// | JOIN con ingredienti        | query manuale + Map      | findAll({ include })   |
// | Inserisci                   | execute('INSERT …')      | Pizza.create({})       |
// | Crea o trova                | SELECT + INSERT a mano   | findOrCreate()         |
// | Aggiorna                    | execute('UPDATE …')      | .save() / .update()    |
// | Elimina                     | execute('DELETE …')      | .destroy()             |
// | Transazione con rollback    | begin/commit/rollback    | sequelize.transaction()|
// | Associa ingredienti         | INSERT in ingredient_pizza| .setIngredients()     |
//
// Il codice diventa più leggibile perché:
//   - Non scriviamo mai stringhe SQL a mano
//   - Le relazioni (JOIN, tabelle di mezzo) sono gestite automaticamente
//   - Gli errori tipici di SQL (typo nei nomi delle colonne, dimenticare il rollback)
//     vengono catturati prima di arrivare al database


// Eseguiamo gli esempi
esempiCRUD().catch(console.error);
