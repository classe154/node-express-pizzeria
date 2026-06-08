import { getConnection } from '../data/db.js';
import { generateSlug } from '../utils/pizzas.js';

function index(request, response) {
    // Casi da testare:
    // GET http://localhost:3000/pizzas                                    → 200 (tutte le pizze disponibili)
    // GET http://localhost:3000/pizzas?priceMax=10                       → 200 (solo pizze fino a 10€)
    // GET http://localhost:3000/pizzas?ingredients=mozza                 → 200 (solo pizze con la stringa mozza tra gli ingredienti)
    // GET http://localhost:3000/pizzas?priceMax=12&ingredients=pomodoro  → 200 (filtri combinati)
    // GET http://localhost:3000/pizzas?priceMax=ciao                     → 200 (priceMax non valido: filtro ignorato)
    // GET http://localhost:3000/pizzas?orderBy=price                     → 200 (ordinate per prezzo decrescente)

    const { ingredients, priceMax, orderBy } = request.query;

    const connection = getConnection();

    connection.query(`select slug, name, price, spicy from pizzas;`)
        .then(([rows]) => {
            response.json({
                error: null,
                results: rows
            });
        });
}

function show(request, response) {
    // Casi da testare:
    // GET http://localhost:3000/pizzas/diavola      → 200 (pizza trovata)
    // GET http://localhost:3000/pizzas/bufalina     → 404 (pizza non disponibile)
    // GET http://localhost:3000/pizzas/inesistente  → 404 (slug non trovato)

    const pizzaFound = request.pizzaFound;

    const connection = getConnection();

    connection.execute(`
            select i.id, i.name
            from ingredient_pizza ip
                join ingredients i on i.id = ip.ingredient_id
            where ip.pizza_id = ?
        `, [pizzaFound.id])
        .then(([rows]) => {

            const ingredients = rows.map(r => r.name);
            pizzaFound.ingredients = ingredients;

            response.json({
                error: null,
                results: pizzaFound
            });
        });
}

function create(request, response) {
    // Casi da testare (POST http://localhost:3000/pizzas con body JSON):
    // { }                                                              → 400 (name mancante)
    // { "name": "" }                                                   → 400 (name vuoto)
    // { "name": "Capricciosa" }                                        → 400 (price mancante)
    // { "name": "Capricciosa", "price": -5 }                          → 400 (price negativo)
    // { "name": "Capricciosa", "price": "ciao" }                      → 400 (price non numerico)
    // { "name": "Capricciosa", "price": 10.50, "ingredients": [] }    → 400 (ingredients vuoto)
    // { "name": "Capricciosa", "price": 10.50, "ingredients": ["mozzarella"] } → 201

    const { name, price, ingredients, spicy } = request.body;

    const pizzaNew = {
        name,
        price,
        ingredients,
        spicy,
        createdAt: new Date().toISOString().replace('T', ' ').split('Z')[0],
        updatedAt: new Date().toISOString().replace('T', ' ').split('Z')[0]
    };

    generateSlug(pizzaNew).then(slug => {
        const connection = getConnection();

        pizzaNew.slug = slug;

        connection.execute(
            `insert into pizzas (name, slug, price, spicy, createdAt, updatedAt)
                values (?, ?, ?, ?, ?, ?)`,
            [
                pizzaNew.name,
                pizzaNew.slug,
                pizzaNew.price,
                pizzaNew.spicy,
                pizzaNew.createdAt,
                pizzaNew.updatedAt
            ]
        ).then(() => {
            response.status(201).json({
                error: null,
                results: pizzaNew
            });
        }).catch(error => {
            console.error(error);
            response.status(500).json({
                error: 'Errore del server',
                results: null
            });
        });
    });
}

function destroy(request, response) {
    // Casi da testare:
    // DELETE http://localhost:3000/pizzas/inesistente  → 404 (slug non trovato)
    // DELETE http://localhost:3000/pizzas/bufalina     → 204 (soft delete, anche se già non disponibile)
    // DELETE http://localhost:3000/pizzas/diavola      → 204 (soft delete avvenuto)

    const pizzaFound = request.pizzaFound;

    if (pizzaFound.deletedAt !== null) {
        response.status(400).json({
            error: 'La pizza è già stata eliminata',
            results: null
        });
        return;
    }
    const connection = getConnection();

    connection.execute(
        `update pizzas set deletedAt = ? where slug = ?`,
        [
            new Date().toISOString().replace('T', ' ').split('Z')[0],
            pizzaFound.slug
        ]
    ).then(() => {
        response.sendStatus(204);
    }).catch(error => {
        console.error(error);
        response.status(500).json({
            error: 'Errore del server',
            results: null
        });
    });
}

function restore(request, response) {
    // Casi da testare:
    // POST http://localhost:3000/pizzas/inesistente/restore  → 404 (slug non trovato)
    // POST http://localhost:3000/pizzas/diavola/restore      → 400 (pizza già disponibile)
    // POST http://localhost:3000/pizzas/bufalina/restore     → 200 (ripristinata)

    const pizzaFound = request.pizzaFound;

    if (pizzaFound.deletedAt === null) {
        response.status(400).json({
            error: 'La pizza è già ripristinata',
            results: null
        });
        return;
    }

    const connection = getConnection();

    connection.execute(
        `update pizzas set deletedAt = null where slug = ?`,
        [pizzaFound.slug]
    ).then(() => {
        response.sendStatus(204);
    }).catch(error => {
        console.error(error);
        response.status(500).json({
            error: 'Errore del server',
            results: null
        });
    });
}

function modify(request, response) {
    // Casi da testare (PATCH http://localhost:3000/pizzas/:slug con body JSON):
    // PATCH /pizzas/inesistente  → 404 (slug non trovato)
    // PATCH /pizzas/bufalina     → 404 (pizza non disponibile)
    // PATCH /pizzas/diavola + body non valido → 400

    const pizzaFound = request.pizzaFound;
    const pizzaUpdatedFields = request.body;

    const pizzaUpdated = {
        ...pizzaFound,
        ...pizzaUpdatedFields,
        updatedAt: new Date().toISOString().replace('T', ' ').split('Z')[0]
    };

    const slugPromise = pizzaFound.name !== pizzaUpdated.name
        ? generateSlug(pizzaUpdated)
        : Promise.resolve(pizzaUpdated.slug);

    slugPromise.then(slug => {
        pizzaUpdated.slug = slug;

        const connection = getConnection();

        connection.execute(
            `update pizzas set name = ?, slug = ?, price = ?, spicy = ?, updatedAt = ? where id = ?`,
            [
                pizzaUpdated.name,
                pizzaUpdated.slug,
                pizzaUpdated.price,
                pizzaUpdated.spicy,
                pizzaUpdated.updatedAt,
                pizzaUpdated.id
            ]
        ).then(() => {
            response.status(200).json({
                error: null,
                results: pizzaUpdated
            });
        }).catch(error => {
            console.error(error);
            response.status(500).json({
                error: 'Errore del server',
                results: null
            });
        });
    });
}

export { index, show, create, modify, destroy, restore };
