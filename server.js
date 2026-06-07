import express from 'express';
import pizzasRouter from './routers/pizzas.js';
import notFound from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';
import { initDb } from './data/db.js';

const app = express();
const port = process.env.SERVER_PORT || 3000;

app.use(express.static('public'));
app.use(express.json()); // Utile per le richieste application/json

app.use('/pizzas' , pizzasRouter);

app.use(errorHandler);
app.use(notFound);

initDb()
    .then(() => {
        console.log('Database inizializzato');
        app.listen(port, (error) => {
            if (error) {
                console.error(error);
                return;
            }
            console.log(`Server started at port ${port}`);
        });
    })
    .catch(error => {
        console.error(error);
    });
