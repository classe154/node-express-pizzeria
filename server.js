import express from 'express';
import pizzasRouter from './routers/pizzas.js';
import { sendMail } from './utils/mailSender.js';

const app = express();
const port = process.env.SERVER_PORT || 3000;

app.use('/pizzas' , pizzasRouter);

app.get('/send-mail', (request, response) => {
    sendMail(
        'acker.federico@gmail.com',
        'Hi from nodeJS',
        'Ciao'
    ).then(mailInfo => {
        console.log(mailInfo);
        response.json({
            messaggio: 'mail inviata correttamente'
        })
    });
});

app.listen(port, (error) => {
    
    if (error) {
        console.error(error);
        return;
    }

    console.log(`Server started at port ${port}`);
});