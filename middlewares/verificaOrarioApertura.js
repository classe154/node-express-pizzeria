function verificaOrarioApertura(request, response, next) {
    const ora = new Date().getHours();

    console.log('Sono le ore ' + ora);

    if (ora < 9 || ora > 13) {
        response.status(403)
            .json({
                error: 'Pizzeria Chiusa, riprova domani',
                results: null
            });
    } else {
        console.log('Pizzeria aperta');
        next();
    }
}

export default verificaOrarioApertura;