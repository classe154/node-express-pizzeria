import menu from '../data/menu.js';
import { generateNextId, generateSlug, menuOrderFields, validatePizzaBody } from '../utils/pizza.js';

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

    if (menuOrderFields.includes(orderBy)) {
        menuFiltered.sort((pizzaA, pizzaB) => {
            const a = pizzaA[orderBy];
            const b = pizzaB[orderBy];
            if (typeof a === 'string') return b.localeCompare(a);
            if (typeof a === 'number') return b - a;
        });
    }

    response.json({ error: null, results: menuFiltered });
}

function showBySlug(request, response) {
    // Casi da testare:
    // GET http://localhost:3000/pizzas/diavola      → 200 (pizza trovata)
    // GET http://localhost:3000/pizzas/bufalina     → 404 (pizza non disponibile)
    // GET http://localhost:3000/pizzas/inesistente  → 404 (slug non trovato)

    const slug = request.params.slug.trim();

    const pizzaFound = menu.find(pizza => pizza.slug === slug);

    if (pizzaFound === undefined || !pizzaFound.available) {
        response.status(404).json({ error: 'Pizza non trovata', results: null });
        return;
    }

    const { id, available, createdAt, ...otherProperties } = pizzaFound;
    const baseUrl = `${request.protocol}://${request.get('host')}`;

    response.json({
        error: null,
        results: {
            ...otherProperties,
            image: `${baseUrl}/${otherProperties.image}`
        }
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

    const validation = validatePizzaBody(request.body);
    if (validation.error) {
        response.status(400).json({ error: validation.error, results: null });
        return;
    }

    const { name, price, ingredients, spicy } = validation.data;

    const pizzaNew = {
        id: generateNextId(),
        slug: null,
        name,
        image: null,
        ingredients,
        available: true,
        price,
        spicy
    };
    pizzaNew.slug = generateSlug(pizzaNew);

    menu.push(pizzaNew);

    response.status(201).json({ error: null, results: pizzaNew });
}

function destroy(request, response) {
    // Casi da testare:
    // DELETE http://localhost:3000/pizzas/inesistente  → 404 (slug non trovato)
    // DELETE http://localhost:3000/pizzas/bufalina     → 404 (già non disponibile)
    // DELETE http://localhost:3000/pizzas/diavola      → 204 (soft delete avvenuto)

    const slug = request.params.slug.trim();

    const pizza = menu.find(p => p.slug === slug);

    if (pizza === undefined || !pizza.available) {
        response.status(404).json({ error: 'Nessuna pizza trovata', results: null });
        return;
    }

    pizza.available = false;
    response.sendStatus(204);
}

function update(request, response) {
    // Casi da testare (PUT http://localhost:3000/pizzas/:slug con body JSON):
    // PUT /pizzas/inesistente  → 404 (slug non trovato)
    // PUT /pizzas/bufalina     → 404 (pizza non disponibile)
    // PUT /pizzas/diavola + body non valido → 400

    const slug = request.params.slug.trim();

    const pizzaFoundIndex = menu.findIndex(p => p.slug === slug);

    if (pizzaFoundIndex === -1 || !menu[pizzaFoundIndex].available) {
        response.status(404).json({ error: 'Nessuna pizza trovata', results: null });
        return;
    }

    const validation = validatePizzaBody(request.body);
    if (validation.error) {
        response.status(400).json({ error: validation.error, results: null });
        return;
    }

    const { name, price, ingredients, spicy } = validation.data;
    const pizzaOld = menu[pizzaFoundIndex];
    const pizzaUpdated = { ...pizzaOld, name, ingredients, price, spicy };

    if (name !== pizzaOld.name) {
        pizzaUpdated.slug = generateSlug(pizzaUpdated);
    }

    menu.splice(pizzaFoundIndex, 1, pizzaUpdated);

    response.status(200).json({ error: null, results: pizzaUpdated });
}

export { index, showBySlug, create, update, destroy };
