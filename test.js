import { ChatAnthropic } from "@langchain/anthropic";
import { response } from "express";
import { createAgent, HumanMessage, tool } from "langchain";
import { z } from 'zod';
import { sendMail } from "./utils/mail.js";

function meteo({ luogo }) {
    console.log(`Meteo per ${luogo} chiamato`);
    return `Il meteo in ${luogo} è splendido c'è un sole che spacca le pietre, esci pure a fare un picnic con i tuoi amici immaginari`;
}

const meteoTool = tool(meteo, {
    name: "meteo_tool",
    description: "Tool utile per sapere il meteo in un determinato luogo",
    schema: z.object({
        luogo: z.string().describe('Il luogo del quale voglio sapere il meteo')
    })
});

const sendMailTool = tool(sendMail, {
    name: 'send_mail_tool',
    description: "Tool utile per inviare una mail a un singolo destinatario con un soggetto e un corpo",
    schema: z.object({
        to: z.string().describe('La mail del destinatario'),
        subject: z.string().describe('Il soggetto della mail'),
        body: z.string().describe('Il corpo della mail in HTML')
    })
})

const model = new ChatAnthropic({
    model: 'claude-sonnet-4-6',
    apiKey: process.env.CLAUDE_API_KEY
});

const agent = createAgent({
    model,
    tools: [meteoTool, sendMailTool]
});

const message = `
Se domani è una bella giornata ricorda a Federico (acker.federico@gmail.com)
l'appuntamento per la polpata delle 13:00 in Vaticano dal Papa. Saluta il suo cane Boby.
`;

agent.invoke({
    messages: [
        new HumanMessage(message)
    ]
}).then(aiResponse => {
    const lastMessage = aiResponse.messages[aiResponse.messages.length - 1];
    console.log(lastMessage.content);
});