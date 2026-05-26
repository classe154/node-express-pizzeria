import menu, { generateNextId, generateSlug, menuOrderFields } from '../data/menu.js';

function index(request, response) {
    // Casi da testare:
    // GET http://localhost:3000/pizzas                                    → 200 (tutte le pizze)
    // GET http://localhost:3000/pizzas?priceMax=10                       → 200 (solo pizze fino a 10€)
    // GET http://localhost:3000/pizzas?ingredients=mozza                 → 200 (solo pizze con la stringa mozza tra gli ingredienti)
    // GET http://localhost:3000/pizzas?priceMax=12&ingredients=pomodoro  → 200 (filtri combinati)
    // GET http://localhost:3000/pizzas?priceMax=ciao                     → 200 (priceMax non valido: filtro ignorato)
    // GET http://localhost:3000/pizzas?orderBy=price

    const {
        ingredients,
        priceMax,
        orderBy,
    } = request.query;

    // I parametri di query arrivano sempre come stringhe: parseFloat li converte in numero.
    // Se priceMax non è presente nell'URL, parseFloat(undefined) restituisce NaN —
    // il controllo isNaN() serve proprio a rendere il filtro opzionale.
    const priceMaxReal = parseFloat(priceMax);

    const menuFiltered = menu.filter(pizza => {

        if (pizza.available === false) {
            return false;
        }

        if (!isNaN(priceMaxReal)) {
            if (pizza.price > priceMaxReal) {
                return false;
            }
        }

        if (ingredients !== undefined) {
            for (let i = 0; i < pizza.ingredients.length; i++) {
                const currentIngredient = pizza.ingredients[i];
                if (currentIngredient.indexOf(ingredients) !== -1) {
                    return true;
                }
            }
            return false;
        }

        return true;
    });

    if (menuOrderFields.includes(orderBy)) { // Mi hai passato una chiave corretta di ordinamento
        console.log('Ordino');

        menuFiltered.sort((pizzaA, pizzaB) => {
            const pizzaAValue = pizzaA[orderBy]; // Se fosse price => pizzaA.price
            const pizzaBValue = pizzaB[orderBy]; // Se fosse price => pizzaB.price

            if (typeof pizzaAValue === 'string') {
                return pizzaBValue.localeCompare(pizzaAValue);
            } else if (typeof pizzaAValue === 'number') {
                return pizzaBValue - pizzaAValue; // pizzaAValue = 15, pizzaBValue = 9
            }
        });
    }

    response.json(menuFiltered);
}

function showBySlug(request, response) {
    const { slug } = request.params;

    const realSlug = slug.trim();

    const pizzaFound = menu.find(pizza => {
        return pizza.slug === realSlug;
    });

    if (pizzaFound === undefined || pizzaFound.available === false) {
        response.status(404)
            .json({
                error: 'Pizza non trovata',
                results: null
            });
        return;
    }

    const { id, available, createdAt, ...otherProperties } = pizzaFound;

    response.json({
        error: null,
        results: {
            ...otherProperties,
            image: 'http://localhost:3000/' + otherProperties.image
        }
    });

}

function show(request, response) {
    // Casi da testare:
    // GET http://localhost:3000/pizzas/ciao → 400 (id non numerico)
    // GET http://localhost:3000/pizzas/-1   → 400 (id negativo)
    // GET http://localhost:3000/pizzas/0    → 400 (id zero)
    // GET http://localhost:3000/pizzas/9999 → 404 (id valido ma pizza inesistente)
    // GET http://localhost:3000/pizzas/1    → 200 (pizza trovata)

    const { id } = request.params;

    // I parametri di rotta arrivano sempre come stringhe: Number() li converte in numero.
    // trim() rimuove eventuali spazi accidentali presenti nell'URL.
    const realId = Number(id.trim());

    if (isNaN(realId) || realId <= 0) {
        response.status(400)
            .json({
                error: 'Parametro "id" non corretto',
                results: null
            });
        return;
    }

    const pizzaFound = menu.find(pizza => {
        return pizza.id === realId
    });

    if (pizzaFound === undefined) {
        response.status(404)
            .json({
                error: 'Pizza non trovata',
                results: null,
            });
        return;
    }

    response.json({
        error: null,
        results: pizzaFound
    });
}

// TODO: la logica di inserimento verrà completata nella prossima lezione.
function create(request, response) {
    // Casi da testare (POST http://localhost:3000/pizzas con body JSON):
    // { }                              → 400 (name mancante)
    // { "name": "" }                   → 400 (name vuoto)
    // { "name": "Capricciosa" }        → 400 (price mancante)
    // { "name": "Capricciosa", "price": -5 }   → 400 (price negativo)
    // { "name": "Capricciosa", "price": "ciao" } → 400 (price non numerico)
    // { "name": "Capricciosa", "price": 10.50 }  → 200 (dati validi)

    // Se il client non invia l'header Content-Type: application/json,
    // Express non parserà il body e request.body sarà undefined.
    // Destrutturare undefined causa un errore runtime: || {} lo previene,
    // restituendo un oggetto vuoto da cui name e price risulteranno undefined.

    let body = request.body;
    if (body === undefined) {
        body = {};
    }
    const { name, price, ingredients, spicy = false } = body;

    if (!name || name.trim() === '') {
        response.status(400).json({
            error: 'Il campo "name" è obbligatorio',
            results: null
        });
        return;
    }

    if (typeof price !== 'number' || price < 0) {
        response.status(400).json({
            error: 'Il campo "price" deve essere un numero e positivo',
            results: null
        });
        return;
    }

    if (!Array.isArray(ingredients) ||
        ingredients.length === 0 ||
        ingredients.some(ingredient => {
            return typeof ingredient !== 'string';
        }) === true
    ) {
        response.status(400).json({
            error: 'Il campo "ingredients" deve essere un array di stringhe, non vuoto',
            results: null
        });
        return;
    }

    if (typeof spicy !== 'boolean') {
        response.status(400).json({
            error: 'Il campo "spicy" deve essere un booleano',
            results: null
        });
        return;
    }

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

    const pizzaNewSlug = generateSlug(pizzaNew);
    pizzaNew.slug = pizzaNewSlug;

    menu.push(pizzaNew);

    response
        .status(201)
        .json({
            messaggio: 'Creazione avvenuta',
            dati: pizzaNew
        });
}

function destroy(request, response) {
    // Casi da testare:
    // DELETE http://localhost:3000/pizzas/ciao  → 400 (id non numerico)
    // DELETE http://localhost:3000/pizzas/-89   → 400 (id negativo)
    // DELETE http://localhost:3000/pizzas/9999  → 404 (id valido ma pizza inesistente)

    const { id } = request.params;

    const idReal = Number(id);

    if (isNaN(idReal) || idReal <= 0) {
        response
            .status(400)
            .json({
                error: "Parametro id non corretto",
                results: null
            });
        return;
    }

    // findIndex invece di find: ci serve la posizione nell'array per poter usare splice().
    const pizzaFoundIndex = menu.findIndex(pizza => {
        return pizza.id === idReal;
    });

    if (pizzaFoundIndex === -1 || menu[pizzaFoundIndex].available === false) {
        response
            .status(404)
            .json({
                error: "Nessuna pizza trovata",
                results: null
            });
        return;
    }

    menu[pizzaFoundIndex].available = false;

    // menu.splice(pizzaFoundIndex, 1);
    response.sendStatus(204);
}

function update(request, response) {
    const { id } = request.params;

    const idReal = Number(id);

    if (isNaN(idReal) || idReal <= 0) {
        response
            .status(400)
            .json({
                error: "Parametro id non corretto",
                results: null
            });
        return;
    }

    // findIndex invece di find: ci serve la posizione nell'array per poter usare splice().
    const pizzaFoundIndex = menu.findIndex(pizza => {
        return pizza.id === idReal;
    });

    if (pizzaFoundIndex === -1 || menu[pizzaFoundIndex].available === false) {
        response
            .status(404)
            .json({
                error: "Nessuna pizza trovata",
                results: null
            });
        return;
    }

    let body = request.body;
    if (body === undefined) {
        body = {};
    }
    const { name, price, ingredients, spicy = false } = body;

    if (!name || name.trim() === '') {
        response.status(400).json({
            error: 'Il campo "name" è obbligatorio',
            results: null
        });
        return;
    }

    if (typeof price !== 'number' || price < 0) {
        response.status(400).json({
            error: 'Il campo "price" deve essere un numero e positivo',
            results: null
        });
        return;
    }

    if (!Array.isArray(ingredients) ||
        ingredients.length === 0 ||
        ingredients.some(ingredient => {
            return typeof ingredient !== 'string';
        }) === true
    ) {
        response.status(400).json({
            error: 'Il campo "ingredients" deve essere un array di stringhe, non vuoto',
            results: null
        });
        return;
    }

    if (typeof spicy !== 'boolean') {
        response.status(400).json({
            error: 'Il campo "spicy" deve essere un booleano',
            results: null
        });
        return;
    }

    const pizzaOld = menu[pizzaFoundIndex];
    const pizzaUpdated = {
        ...pizzaOld,
        name,
        ingredients,
        price,
        spicy
    };

    if (name !== pizzaOld.name) {
        pizzaUpdated.slug = generateSlug(pizzaUpdated);
    }

    menu.splice(pizzaFoundIndex, 1, pizzaUpdated);

    response
        .status(200)
        .json({
            messaggio: 'Modifica avvenuta',
            dati: pizzaUpdated
        });
}

export {
    index,
    show,
    showBySlug,
    create,
    update,
    destroy
};
