function verificaOrarioApertura(request, response, next) {
    const ora = new Date().getHours();

    if (ora < 9 || ora > 22) {
        response.status(403)
            .json({
                error: 'Pizzeria Chiusa, riprova domani',
                results: null
            });
    } else {
        next();
    }
}

export default verificaOrarioApertura;