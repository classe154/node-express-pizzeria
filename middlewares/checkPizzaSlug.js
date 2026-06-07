import { getConnection } from "../data/db.js";
import menu from "../data/menu.js";

function checkPizzaSlug(request, response, next) {
    const { slug } = request.params;

    const connection = getConnection();

    connection.execute(`select * from pizzas where slug = ?`, [slug])
        .then(([rows]) => {

            if (rows.length === 0) {
                response.status(404)
                    .json({
                        error: 'Pizza non trovata',
                        results: null,
                    });
                return;
            }
            
            const pizzaFound = rows[0];
            request.pizzaFound = pizzaFound;
            next();
        });
}

export default checkPizzaSlug;