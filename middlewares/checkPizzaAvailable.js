function checkPizzaAvailable(request, response, next) {
    const pizza = request.pizzaFound;

    if (!pizza.available) {
        response.status(404)
            .json({
                error: 'Pizza non disponibile',
                results: null,
            });
        return;
    }

    next();
}

export default checkPizzaAvailable;
