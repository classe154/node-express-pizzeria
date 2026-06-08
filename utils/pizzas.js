import { getConnection } from '../data/db.js';

const pizzaOrderFields = ['name', 'price'];

const pizzaShowFields = [
    'slug', 'name', 'ingredients', 'price', 'spicy'
];

// Per il CREATE tutti e quattro i campi sono obbligatori, incluso "spicy" (nessun default).
const pizzaValidFields = new Set([
    'name', 'price', 'ingredients', 'spicy'
]);

// Caso CREATE con alcuni parametri mancanti
// 'name', 'price', 'lol'
// 'name', 'price', 'ingredients', 'spicy'

// Caso CREATE con un parametro in più
// 'name', 'price', 'ingredients', 'spicy', 'lol'
// 'name', 'price', 'ingredients', 'spicy'

// Caso UPDATE con un parametro in più
// 'name', 'lol'
// 'name', 'price', 'ingredients', 'spicy'

function validatePizza(pizza, update = true) {
    const pizzaFields = new Set(Object.getOwnPropertyNames(pizza));

    const errors = [];

    const isFieldsValid = update ?
        pizzaFields.isSubsetOf(pizzaValidFields) :
        pizzaFields.isSupersetOf(pizzaValidFields);

    const missingFields = update ? [] : pizzaValidFields.difference(pizzaFields);
    const inValidFields = pizzaFields.difference(pizzaValidFields);

    missingFields.forEach(field => {
        errors.push(`Il campo "${field}" è obbligatorio`);
    });

    inValidFields.forEach(field => {
        errors.push(`Il campo "${field}" non è valido`);
    }); 

    if (isFieldsValid === false || inValidFields.size > 0) {
        return {
            valid: false,
            errors,
            data: null
        };
    }

    for (const field of pizzaFields) {        
        const value = pizza[field];
        switch (field) {
            case 'name':
                if (value.trim() === '') {
                    errors.push('Il campo "name" non deve essere vuoto');
                }
                break;
            case 'price':
                if (typeof value !== 'number' || value <= 0) {
                    errors.push('Il campo "price" deve essere un numero positivo');
                }
                break;
            case 'ingredients':
                if (
                    !Array.isArray(value) ||
                    value.length === 0 ||
                    value.some(i => typeof i !== 'string' || i.trim() === '')
                ) {
                    errors.push('Il campo "ingredients" deve essere un array di stringhe, non vuote');
                }
                break;
            case 'spicy':
                if (typeof value !== 'boolean') {
                    errors.push('Il campo "spicy" deve essere un booleano');
                }
                break;
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        data: pizza
    };
}

function maskPizzaFields(pizza) {
    return pizzaShowFields.reduce((acc, field) => {
        acc[field] = pizza[field];
        return acc;
    }, {});
}

function getPizzaBySlug(slug) {
    const connection = getConnection();
    return connection.query('SELECT * FROM pizzas WHERE slug = ?', [slug])
        .then(([rows]) => {
            if (rows.length === 0) {
                return null;
            }
            return rows[0];
        });
}

function generateSlug(pizza) {
    // Passo 1: normalize('NFD') decompone i caratteri accentati in due parti separate:
    //   la lettera base + il segno diacritico (accento, cediglia, ecc.)
    //   Esempio: "è" (U+00E8) → "e" (U+0065) + "̀" (U+0300)
    let base = pizza.name.normalize('NFD');

    // Passo 2: ora che gli accenti sono separati, li eliminiamo.
    //   U+0300–U+036F è il blocco Unicode "Combining Diacritical Marks":
    //   contiene tutti i segni che si "appoggiano" alla lettera precedente.
    //   Dopo questo passo "è" diventa "e", "ñ" diventa "n", ecc.
    base = base.replace(/[\u0300-\u036f]/g, '');

    // Passo 3: tutto minuscolo, così "Margherita" e "margherita" producono lo stesso slug.
    base = base.toLowerCase();

    // Passo 4: gli spazi diventano trattini → "4 formaggi" → "4-formaggi"
    base = base.replaceAll(' ', '-');

    // Passo 5: rimuoviamo tutto ciò che non è lettera (a-z), cifra (0-9) o trattino.
    //   Il ^ dentro [] significa "tutto tranne": [^a-z0-9-] = "non lettera, non cifra, non trattino".
    //   Esempio: "calzone & bufala" → "calzone--bufala" (& rimosso, trattini rimasti)
    base = base.replace(/[^a-z0-9-]/g, '');

    // Passo 6: se un carattere rimosso era circondato da spazi otteniamo trattini doppi.
    //   -+ significa "uno o più trattini consecutivi" → li collapsiamo in uno solo.
    //   Esempio: "calzone--bufala" → "calzone-bufala"
    base = base.replace(/-+/g, '-');

    const connection = getConnection();

    function checkCandidate(increment) {
        const candidate = increment === 0 ? base : `${base}-${increment}`;

        return connection.query(
            'SELECT 1 FROM pizzas WHERE slug = ? LIMIT 1',
            [candidate]
        ).then(([rows]) => {
            if (rows.length === 0) {
                return candidate;
            }
            return checkCandidate(increment + 1);
        });
    }

    return checkCandidate(0);
}

export {
    pizzaOrderFields,
    pizzaShowFields,
    maskPizzaFields,
    validatePizza,
    generateSlug,
    getPizzaBySlug
}