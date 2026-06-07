import menu from "../data/menu.js";

function checkPizzaSlug(request, response, next) {
    const { slug } = request.params;

    const pizzaFoundIndex = menu.findIndex(p => p.slug === slug);

    if (pizzaFoundIndex === -1) {
        response.status(404)
            .json({
                error: 'Pizza non trovata',
                results: null,
            });
        return;
    }

    request.pizzaFoundIndex = pizzaFoundIndex;
    request.pizzaFound = menu[pizzaFoundIndex];
    next();
}

export default checkPizzaSlug;