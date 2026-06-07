import menu from '../data/menu.js';
import { generateNextId, generateSlug, pizzaOrderFields, validatePizza, maskPizzaFields } from '../utils/pizzas.js';

function index(request, response) {
    // Casi da testare:
    // GET http://localhost:3000/pizzas                                    → 200 (tutte le pizze disponibili)
    // GET http://localhost:3000/pizzas?priceMax=10                       → 200 (solo pizze fino a 10€)
    // GET http://localhost:3000/pizzas?ingredients=mozza                 → 200 (solo pizze con la stringa mozza tra gli ingredienti)
    // GET http://localhost:3000/pizzas?priceMax=12&ingredients=pomodoro  → 200 (filtri combinati)
    // GET http://localhost:3000/pizzas?priceMax=ciao                     → 200 (priceMax non valido: filtro ignorato)
    // GET http://localhost:3000/pizzas?orderBy=price                     → 200 (ordinate per prezzo decrescente)

    const { ingredients, priceMax, orderBy } = request.query;

    // I parametri di query arrivano sempre come stringhe: parseFloat li converte in numero.
    // Se priceMax non è presente nell'URL, parseFloat(undefined) restituisce NaN —
    // il controllo isNaN() serve proprio a rendere il filtro opzionale.
    const priceMaxReal = parseFloat(priceMax);

    const menuFiltered = menu.filter(pizza => {
        if (!pizza.available) return false;
        if (!isNaN(priceMaxReal) && pizza.price > priceMaxReal) return false;
        if (ingredients !== undefined && !pizza.ingredients.some(i => i.includes(ingredients))) return false;
        return true;
    });

    if (pizzaOrderFields.includes(orderBy)) {
        menuFiltered.sort((pizzaA, pizzaB) => {
            const a = pizzaA[orderBy];
            const b = pizzaB[orderBy];
            if (typeof a === 'string') return b.localeCompare(a);
            if (typeof a === 'number') return b - a;
        });
    }

    response.json({
        error: null,
        results: menuFiltered.map(maskPizzaFields),
    });
}

function show(request, response) {
    // Casi da testare:
    // GET http://localhost:3000/pizzas/diavola      → 200 (pizza trovata)
    // GET http://localhost:3000/pizzas/bufalina     → 404 (pizza non disponibile)
    // GET http://localhost:3000/pizzas/inesistente  → 404 (slug non trovato)

    const pizzaFound = request.pizzaFound;

    response.json({
        error: null,
        results: maskPizzaFields(pizzaFound)
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
        id: generateNextId(),
        name,
        ingredients,
        price,
        spicy,
        available: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    pizzaNew.slug = generateSlug(pizzaNew);

    menu.push(pizzaNew);

    response.status(201).json({
        error: null,
        results: maskPizzaFields(pizzaNew)
    });
}

function destroy(request, response) {
    // Casi da testare:
    // DELETE http://localhost:3000/pizzas/inesistente  → 404 (slug non trovato)
    // DELETE http://localhost:3000/pizzas/bufalina     → 204 (soft delete, anche se già non disponibile)
    // DELETE http://localhost:3000/pizzas/diavola      → 204 (soft delete avvenuto)

    const pizzaFound = request.pizzaFound;
    pizzaFound.available = false;
    response.sendStatus(204);
}

function modify(request, response) {
    // Casi da testare (PATCH http://localhost:3000/pizzas/:slug con body JSON):
    // PATCH /pizzas/inesistente  → 404 (slug non trovato)
    // PATCH /pizzas/bufalina     → 404 (pizza non disponibile)
    // PATCH /pizzas/diavola + body non valido → 400

    const pizzaFoundIndex = request.pizzaFoundIndex;
    const pizzaFound = request.pizzaFound;
    const pizzaUpdatedFields = request.body;

    const pizzaUpdated = {
        ...pizzaFound,
        ...pizzaUpdatedFields,
        updatedAt: new Date().toISOString()
    };    

    if (pizzaFound.name !== pizzaUpdated.name) {
        pizzaUpdated.slug = generateSlug(pizzaUpdated);
    }

    menu.splice(pizzaFoundIndex, 1, pizzaUpdated);

    response.status(200).json({
        error: null,
        results: maskPizzaFields(pizzaUpdated)
    });
}

export { index, show, create, modify, destroy };
