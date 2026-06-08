import menu from '../data/menu.js';
import { generateNextId, generateSlug, pizzaOrderFields, validatePizza, maskPizzaFields } from '../utils/pizzas.js';

// 📝 Importiamo la connessione al database.
// In data/db.js abbiamo usato createConnection con top-level await,
// quindi qui abbiamo già un oggetto "connection" pronto da usare.
import connection from '../data/db.js';

// 📝 Controller per la rotta GET /pizzas
// Obiettivo di questa prima versione: leggere TUTTE le pizze dal database
// usando una semplice query: SELECT * FROM pizzas
async function index(request, response) {
    try {
        // 📝 ESEGUIAMO LA QUERY
        // connection.query(...) con mysql2/promise restituisce una Promise.
        // Con async/await possiamo "aspettare" il risultato in modo più leggibile.
        //
        // La query seleziona tutte le colonne dalla tabella "pizzas".
        // Il risultato è un array con due elementi:
        // - rows: le righe della tabella (i dati veri e propri)
        // - fields: informazioni sulle colonne (qui non ci serve)
        const [rows/*, fields*/] = await connection.query('SELECT * FROM pizzas');

        // 📝 PREPARIAMO LA RISPOSTA
        // rows è un array di oggetti, ciascuno rappresenta una pizza.
        // Manteniamo la stessa struttura di risposta usata con l'array in memoria:
        // { error: null, results: [...] }
        response.json({
            error: null,
            results: rows
        });
    } catch (error) {
        // 📝 GESTIONE ERRORI
        // Se qualcosa va storto (es. DB giù, query sbagliata),
        // finiamo qui nel catch e mandiamo una risposta di errore.
        console.error('Errore durante la lettura delle pizze dal DB:', error);

        response.status(500).json({
            error: 'Errore interno del server durante il recupero delle pizze',
            results: null
        });
    }
}


// 📝 Controller per GET /pizzas/:id
// Ora, oltre ai dati della pizza, recuperiamo anche i suoi ingredienti
// usando una JOIN tra le tabelle ingredient_pizza e ingredients.
async function show(request, response) {
    try {
        const idParam = request.params.id;
        const id = parseInt(idParam, 10);

        if (Number.isNaN(id)) {
            response.status(400).json({
                error: 'ID non valido',
                results: null
            });
            return;
        }

        // 📝 1. Recuperiamo la pizza dalla tabella "pizzas"
        const [rows] = await connection.execute(
            'SELECT * FROM pizzas WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            response.status(404).json({
                error: 'Nessuna pizza trovata',
                results: null
            });
            return;
        }

        const pizza = rows[0];

        // 📝 2. Recuperiamo gli ingredienti della pizza.
        // Usiamo una JOIN tra:
        // - ingredient_pizza (tabella di relazione molti-a-molti)
        // - ingredients (tabella con il nome degli ingredienti)
        // Filtriamo per pizza_id = ? usando un prepared statement.
        const queryIngredients = `
            SELECT i.id, i.name
            FROM ingredient_pizza AS ip
            JOIN ingredients AS i
                ON ip.ingredient_id = i.id
            WHERE ip.pizza_id = ?;`;

        const [ingredients] = await connection.execute(queryIngredients, [id]);

        // 📝 3. Arricchiamo l'oggetto pizza con la lista degli ingredienti.
        // In questo modo il client riceve un unico oggetto con dentro tutto.
        pizza.ingredients = ingredients;

        // 📝 4. (Opzionale) Costruiamo l'URL completo dell'immagine, come nella versione in memoria.
        const baseUrl = `${request.protocol}://${request.get('host')}`;
        if (pizza.image) {
            pizza.image = `${baseUrl}/${pizza.image}`;
        }

        response.json({
            error: null,
            results: pizza
        });
    } catch (error) {
        console.error('Errore durante il recupero della pizza dal DB:', error);
        response.status(500).json({
            error: 'Errore interno del server durante il recupero della pizza',
            results: null
        });
    }
}

async function show2(request, response) {
    try {
        // 📝 1. Query con JOIN su tre tabelle.
        // Ogni riga del risultato rappresenta una coppia pizza–ingrediente.
        // Se una pizza ha 3 ingredienti, avremo 3 righe con lo stesso pizza_id.
        const query = `
            SELECT
                p.id          AS pizza_id,
                p.name        AS pizza_name,
                p.image       AS pizza_image,
                i.id          AS ingredient_id,
                i.name        AS ingredient_name
            FROM pizzas AS p
            LEFT JOIN ingredient_pizza AS ip
                ON p.id = ip.pizza_id
            LEFT JOIN ingredients AS i
                ON ip.ingredient_id = i.id
            ORDER BY p.id, i.name;`;

        const [rows] = await connection.query(query);

        // 📝 2. Trasformiamo le righe "piatte" in un array di pizze,
        // ognuna con il proprio array di ingredienti.
        //
        // Esempio di struttura finale:
        // [
        //   {
        //     id: 1,
        //     name: 'Margherita',
        //     image: 'http://localhost:3000/margherita.webp',
        //     ingredients: [
        //       { id: 1, name: 'pomodoro' },
        //       { id: 2, name: 'mozzarella' }
        //     ]
        //   },
        //   ...
        // ]
        const pizzasMap = new Map();

        rows.forEach((row) => {
            // Se la pizza non è ancora nella mappa, la creiamo.
            if (!pizzasMap.has(row.pizza_id)) {
                const baseUrl = `${request.protocol}://${request.get('host')}`;
                const imageUrl = row.pizza_image
                    ? `${baseUrl}/${row.pizza_image}`
                    : null;

                pizzasMap.set(row.pizza_id, {
                    id: row.pizza_id,
                    name: row.pizza_name,
                    image: imageUrl,
                    ingredients: []
                });
            }

            // Se la riga ha un ingrediente (può essere null in caso di LEFT JOIN senza ingredienti),
            // lo aggiungiamo all'array degli ingredienti della pizza.
            if (row.ingredient_id) {
                const pizza = pizzasMap.get(row.pizza_id);
                pizza.ingredients.push({
                    id: row.ingredient_id,
                    name: row.ingredient_name
                });
            }
        });

        // 📝 3. Convertiamo la mappa in un array per la risposta JSON.
        const pizzas = Array.from(pizzasMap.values());

        response.json({
            error: null,
            results: pizzas
        });
    } catch (error) {
        console.error('Errore nel recupero pizze+ingredienti (database-heavy):', error);
        response.status(500).json({
            error: 'Errore interno del server nel recupero delle pizze',
            results: null
        });
    }
}


// 📝 Controller per POST /pizzas
// Obiettivo: creare una nuova pizza + i suoi ingredienti (se mancano)
// e legare tutto nella tabella di relazione ingredient_pizza.
// Usiamo una TRANSAZIONE: o va tutto bene, o annulliamo tutto (rollback).
async function create(request, response) {
    const { name, image, ingredients } = request.body;

    // 📝 (Opzionale) Validazioni base lato server:
    // - name non vuoto
    // - ingredients array non vuoto
    // - ecc.
    // Qui puoi riusare validatePizzaBody se vuoi.

    try {
        // 📝 1. Iniziamo la transazione
        await connection.beginTransaction();

        // 📝 2. Inseriamo la pizza nella tabella "pizzas"
        const queryInsertPizza = `
            INSERT INTO pizzas (name, image)
            VALUES (?, ?)`;

        const [pizzaResult] = await connection.execute(queryInsertPizza, [name, image]);

        // Controlliamo che sia stata inserita ESATTAMENTE 1 riga
        if (pizzaResult.affectedRows !== 1) {
            throw new Error('Inserimento pizza fallito (affectedRows != 1)');
        }

        // In caso di successo, insertId è l'id del nuovo record nella tabella pizzas
        const pizzaNewId = pizzaResult.insertId;

        // 📝 3. Per ogni ingrediente nel body:
        // - cerchiamo se esiste già in "ingredients" (per nome)
        // - se non esiste, lo inseriamo
        // - poi creiamo il legame in "ingredient_pizza"
        for (let i = 0; i < ingredients.length; i++) {
            const ingredient = ingredients[i];

            // 3.a Cerchiamo l'ingrediente per nome
            const querySearchIngredient = `
                SELECT *
                FROM ingredients AS i
                WHERE i.name = ?;`;
            const [ingredientsFound] = await connection.execute(querySearchIngredient, [ingredient]);

            let ingredientId;

            if (ingredientsFound.length === 0) {
                // 📝 3.b Ingrediente non esiste: lo inseriamo
                const queryInsertIngredient = `
                    INSERT INTO ingredients (name)
                    VALUES (?);`;

                const [ingredientInsertResult] = await connection.execute(queryInsertIngredient, [ingredient]);

                // Controlliamo che sia stata inserita 1 riga
                if (ingredientInsertResult.affectedRows !== 1) {
                    throw new Error('Inserimento ingrediente fallito (affectedRows != 1)');
                }

                // Recuperiamo l'id dell'ingrediente creato
                ingredientId = ingredientInsertResult.insertId;
            } else {
                // 📝 3.c Ingrediente esiste già: usiamo il suo id
                const ingredientFound = ingredientsFound[0];
                ingredientId = ingredientFound.id;
            }

            // 📝 3.d Creiamo il legame nella tabella di relazione ingredient_pizza
            const queryLinkIngredientToPizza = `
                INSERT INTO ingredient_pizza (pizza_id, ingredient_id)
                VALUES (?, ?);`;

            const [linkResult] = await connection.execute(queryLinkIngredientToPizza, [pizzaNewId, ingredientId]);

            // Controlliamo che sia stata inserita 1 riga di relazione
            if (linkResult.affectedRows !== 1) {
                throw new Error('Creazione legame pizza-ingrediente fallita (affectedRows != 1)');
            }
        }

        // 📝 4. Se è andato tutto bene, confermiamo la transazione
        await connection.commit();

        response.status(201).json({
            error: null,
            results: {
                id: pizzaNewId,
                name,
                image,
                ingredients
            }
        });
    } catch (error) {
        // 📝 5. In caso di qualsiasi errore, facciamo rollback della transazione
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error('Errore durante il rollback della transazione:', rollbackError);
        }

        console.error('Errore durante la creazione della pizza:', error);

        response.status(500).json({
            error: 'Errore interno del server durante la creazione della pizza',
            results: null
        });
    }
}

// 📝 Controller per DELETE /pizzas/:id
// Obiettivo: eliminare una pizza dal database in base al suo id.
// Casi da testare:
// - DELETE /pizzas/1   → 204 (pizza eliminata se esiste)
// - DELETE /pizzas/999 → 404 (pizza non trovata)
async function destroy(request, response) {
    try {
        // 📝 1. Leggiamo e validiamo il parametro id
        const idParam = request.params.id;
        const id = parseInt(idParam, 10);

        if (Number.isNaN(id)) {
            response.status(400).json({
                error: 'ID non valido',
                results: null
            });
            return;
        }

        // 📝 2. Eseguiamo la DELETE con prepared statement
        // Usiamo il placeholder "?" per evitare SQL injection.
        const [result] = await connection.execute(
            'DELETE FROM pizzas WHERE id = ?',
            [id]
        );

        // 📝 3. Controlliamo se è stata effettivamente eliminata una riga
        // result.affectedRows indica quante righe sono state toccate dalla query.
        if (result.affectedRows === 0) {
            // Nessuna pizza con quell'id: rispondiamo 404
            response.status(404).json({
                error: 'Nessuna pizza trovata',
                results: null
            });
            return;
        }

        // 📝 4. Se la cancellazione è andata a buon fine, rispondiamo 204 (no content)
        response.sendStatus(204);
    } catch (error) {
        // 📝 5. Gestione errore generico
        console.error('Errore durante l\'eliminazione della pizza:', error);
        response.status(500).json({
            error: 'Errore interno del server durante l\'eliminazione della pizza',
            results: null
        });
    }
}

async function modify(request, response) {
    // 📝 1. Leggiamo e validiamo il parametro id
    const idParam = request.params.id;
    const { name, image, ingredients } = request.body;
    const id = parseInt(idParam, 10);

    if (Number.isNaN(id)) {
        response.status(400).json({
            error: 'ID non valido',
            results: null
        });
        return;
    }

    try {
        const [rows] = await connection.execute(`
        SELECT *
        FROM pizzas p
        WHERE p.id = ?;`, [id]);


        if (rows.length === 0) {
            response.status(404).json({
                error: 'Nessuna pizza trovata',
                results: null
            });
            return;
        }

        const pizza = rows[0];

        await connection.beginTransaction();

        const [updateResult] = await connection.execute(`
        UPDATE pizzas p
        SET name = ?, image = ?
        WHERE p.id = ?
        `, [name, image, id]);

        if (updateResult.affectedRows !== 1) {
            throw new Error('Aggiornamento pizza fallita (affectedRows != 1)');
        }

        const [deleteLinksResult] = await connection.execute(`
        DELETE FROM ingredient_pizza
        WHERE pizza_id = ?
        `, [id]);

        for (let i = 0; i < ingredients.length; i++) {
            const ingredient = ingredients[i];

            const querySearchIngredient = `
                SELECT *
                FROM ingredients AS i
                WHERE i.name = ?;`;
            const [ingredientsFound] = await connection.execute(querySearchIngredient, [ingredient]);

            let ingredientId;

            if (ingredientsFound.length === 0) {
                // 📝 3.b Ingrediente non esiste: lo inseriamo
                const queryInsertIngredient = `
                    INSERT INTO ingredients (name)
                    VALUES (?);`;

                const [ingredientInsertResult] = await connection.execute(queryInsertIngredient, [ingredient]);

                // Controlliamo che sia stata inserita 1 riga
                if (ingredientInsertResult.affectedRows !== 1) {
                    throw new Error('Inserimento ingrediente fallito (affectedRows != 1)');
                }

                // Recuperiamo l'id dell'ingrediente creato
                ingredientId = ingredientInsertResult.insertId;
            } else {
                // 📝 3.c Ingrediente esiste già: usiamo il suo id
                const ingredientFound = ingredientsFound[0];
                ingredientId = ingredientFound.id;
            }

            // 📝 3.d Creiamo il legame nella tabella di relazione ingredient_pizza
            const queryLinkIngredientToPizza = `
                INSERT INTO ingredient_pizza (pizza_id, ingredient_id)
                VALUES (?, ?);`;

            const [insertLinkResult] = await connection.execute(queryLinkIngredientToPizza, [pizza.id, ingredientId]);

            // Controlliamo che sia stata inserita 1 riga di relazione
            if (insertLinkResult.affectedRows !== 1) {
                throw new Error('Creazione legame pizza-ingrediente fallita (affectedRows != 1)');
            }
        }

        await connection.commit();

        response.sendStatus(204);

    } catch (error) {
        // 📝 5. In caso di qualsiasi errore, facciamo rollback della transazione
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error('Errore durante il rollback della transazione:', rollbackError);
        }

        console.error('Errore durante l\'aggiornamento della pizza:', error);

        response.status(500).json({
            error: 'Errore interno del server durante l\'aggiornamento della pizza',
            results: null
        });
    }
}

export { index, show, create, modify, destroy, restore };
