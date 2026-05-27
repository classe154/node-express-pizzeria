import express, { request, response } from 'express';
import pizzasRouter from './routers/pizzas.js';
import { sendMail } from './utils/mailSender.js';
import notFound from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';
import joke from './middlewares/joke.js';

const app = express();
const port = process.env.SERVER_PORT || 3000;

//app.use('/pizzas/margherita', myFirstMiddleware);
//app.use(joke);

app.use(express.static('public'));
//app.use(express.urlencoded()); // Utile per le richieste application/x-www-form-urlencoded
app.use(express.json()); // Utile per le richieste application/json

app.use('/pizzas' , pizzasRouter);


app.get('/ciao', (request, response, next) => {
    console.log('Sono passato da qui');
    next('router');
}, (request, response) => {
    response.send('Ciao');
});

app.get('/ciao', (request, response) => {
    response.send('Ciao nascosto');
});

app.use(errorHandler);
app.use(notFound);

app.listen(port, (error) => {
    if (error) {
        console.error(error);
        return;
    }
    console.log(`Server started at port ${port}`);
});