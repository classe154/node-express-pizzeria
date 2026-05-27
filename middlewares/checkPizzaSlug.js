import menu from "../data/menu.js";

function checkPizzaSlug(request, response, next) {
    const { slug } = request.params;

    const pizzaFound = menu.find(pizza => {
        return pizza.slug === slug;
    });

    if (pizzaFound === undefined) {
        response.status(404)
            .json({
                error: 'Pizza non trovata',
                results: null,
            });
        return;
    }

    request.pizzaFound = pizzaFound;
    next();
}

export default checkPizzaSlug;