import express from 'express';
import pizzasRouter from './routers/pizzas.js';
import { sendMail } from './utils/mailSender.js';

const app = express();
const port = process.env.SERVER_PORT || 3000;

app.use(express.static('public'));
//app.use(express.urlencoded()); // Utile per le richieste application/x-www-form-urlencoded
app.use(express.json()); // Utile per le richieste application/json

app.use('/pizzas' , pizzasRouter);


app.listen(port, (error) => {
    if (error) {
        console.error(error);
        return;
    }
    console.log(`Server started at port ${port}`);
});