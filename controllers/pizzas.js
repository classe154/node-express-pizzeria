import menu from '../data/menu.js';

function index(request, response) {
    response.json(menu);
}

function show(request, response) {
    const { id } = request.params;

    const realId = Number(id.trim());

    if (isNaN(realId)) {
        response.status(404)
            .json({
                error: 'Parametro "id" non corretto',
                results: null
            });
        return;
    }

    if (realId <= 0) {
        response.status(404)
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
    response.json({
        messaggio: 'Richiesta di creazione'
    })
}

export {
    index,
    show,
    create
};