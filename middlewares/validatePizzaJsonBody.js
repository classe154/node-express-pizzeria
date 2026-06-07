import { validatePizza } from "../utils/pizzas.js";

function validatePizzaJsonBody(request, response, next) {

    const pizza = request.body;
    const update = request.method === 'PATCH';

    const {valid, errors, data} = validatePizza(pizza, update);

    if (!valid) {
        response.status(400)
            .json({
                errors,
                results: null
            })
            return;
    }

    request.body = data; // Sostituisco il body con i dati
    next();
}

export default validatePizzaJsonBody;