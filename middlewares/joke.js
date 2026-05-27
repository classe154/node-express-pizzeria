function joke(request, response, next)  {
    const lancio = Math.random();

    if (lancio >= 0 && lancio <= 0.5) {
        throw new Error('XDXDXD');
    } else {
        next();
    }
}

export default joke;