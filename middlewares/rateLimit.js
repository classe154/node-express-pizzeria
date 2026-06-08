const visitors = {};
const windowTimeMs = 1 * 60 * 1000; // Millisecondi

function rateLimit(request, response, next) {

    console.log(visitors);

    // L'IP di chi ha fatto la richiesta
    const visitorIp = request.ip;

    // La data di ora
    const now = Date.now();

    if (!visitors.hasOwnProperty(visitorIp)) { // Se l'ip non è già presente
        visitors[visitorIp] = now; // inseriamo l'utente con la data di ora
        next(); // ok

    } else { // Se l'ip era già presente

        // Andiamo a recuperare l'utente dal DB
        const lastVisitMs = visitors[visitorIp];

        if (now - lastVisitMs >= windowTimeMs) { // Controlliamo se è passato il tempo necessario
            visitors[visitorIp] = now; // aggiorno la sua data di ultima visita
            next(); // ok

        } else { // Se il tempo non è passato
            // reject
            response.status(403)
                .json({
                    error: 'Stai calmo bro',
                    results: null
                });
        }
    }
}

// 10:00 Prima richiesta (samuel: 10:00) RISPONDO ALLA RICHIESTA
// 10:04 Seconda richiesta (samuel: 10:00) RIGETTO LA RICHIESTA
// 10:06 Terza richiesat (samuel: 10:06) RISPONDO ALLA RICHIESTA

export default rateLimit;