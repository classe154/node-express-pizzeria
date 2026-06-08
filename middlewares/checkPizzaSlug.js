import { getPizzaBySlug } from '../utils/pizzas.js';

function checkPizzaSlug(request, response, next) {
    const { slug } = request.params;

    getPizzaBySlug(slug)
        .then(pizza => {
            if (pizza === null) {
                response.status(404)
                    .json({
                        error: 'Pizza non trovata',
                        results: null,
                    });
                return;
            }
            request.pizzaFound = pizza;
            next();
        });
}

export default checkPizzaSlug;