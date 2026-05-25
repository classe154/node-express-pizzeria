import menu from '../data/menu.js';

// http://localhost:3000?priceMax=10.8&ingredients=mozza
function index(request, response) {

    const { 
        ingredients: searchIngredient,
        priceMax
    } = request.query;

    const priceMaxReal = parseFloat(priceMax);    

    let menuFiltered = menu;

    /*
    if (!isNaN(priceMaxReal)) { // priceMaxReal = 3.0
        // Filtro anche per il prezzo massimo
        menuFiltered = menuFiltered.filter(pizza => {
            if (pizza.price > priceMaxReal) {
                return false;
            }
            return true;
        });
    }

    if (searchIngredient !== undefined) {
        // Filtro per gli ingredienti
        menuFiltered = menuFiltered.filter(pizza => {
            for (let i = 0; i < pizza.ingredients.length; i++) {
                const currentIngredient = pizza.ingredients[i];
                if (currentIngredient.indexOf(searchIngredient) !== -1) {
                    return true;
                }
            }
            return false;
        });
    }
    */

    menuFiltered = menu.filter(pizza => {

        // Filtro per il prezzo
        if (!isNaN(priceMaxReal)) {
            if (pizza.price > priceMaxReal) {
                return false;
            }
        }

        // Filtro per gli ingredienti
        if (searchIngredient !== undefined) {
            for (let i = 0; i < pizza.ingredients.length; i++) {
                const currentIngredient = pizza.ingredients[i];
                if (currentIngredient.indexOf(searchIngredient) !== -1) {
                    return true;
                }
            }
            return false;
        }

        return true;

    });
    





    response.json(menuFiltered);
}

function show(request, response) {
    const { id } = request.params;

    const realId = Number(id.trim());

    if (isNaN(realId)) {
        response.status(400)
            .json({
                error: 'Parametro "id" non corretto',
                results: null
            });
        return;
    }

    if (realId <= 0) {
        response.status(400)
            .json({
                error: 'Parametro "id" negativo o zero (CORREGGI)',
                results: null,
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

function create(request, response) {

    const {
        name, price
    } = request.body;

    if (name.trim() !== '') {

    }

    if (price >= 0) {
        
    }

    response.json({
        messaggio: 'Richiesta di creazione',
        dati: {
            name, price
        }
    });
}

// http://localhost:3000/pizzas/ciao CASO da controllare (status 400)
// http://localhost:3000/pizzas/-89 CASO da controllare (status 400)
// http://localhost:3000/pizzas/9999 CASO da controllare (status 404)
function destroy(request, response) {

    const { id } = request.params;

    const idReal = Number(id);

    if (isNaN(idReal) || idReal < 0) {
        response
            .status(400)
            .json({
                error: "Parametro id non corretto",
                results: null
            });
        return;
    }

    const pizzaFoundIndex = menu.findIndex(pizza => {
        return pizza.id === idReal;
    });

    if (pizzaFoundIndex === -1) {
        response
            .status(404)
            .json({
                error: "Nessuna pizza trovata",
                results: null
            });
        return;
    }

    menu.splice(pizzaFoundIndex, 1);

    response.sendStatus(204);
}

export {
    index,
    show,
    create,
    destroy
};
