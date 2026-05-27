function notFound(request, response, next) {
    response.status(404)
        .json({
            error: 'Not Found',
            results: null
        });
}

export default notFound;