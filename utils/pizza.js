import menu from '../data/menu.js';

export const menuOrderFields = ['price', 'name'];

export function validatePizzaBody(body) {
    const { name, price, ingredients, spicy = false } = body || {};

    if (!name || name.trim() === '') {
        return { error: 'Il campo "name" è obbligatorio', data: null };
    }

    if (typeof price !== 'number' || price < 0) {
        return { error: 'Il campo "price" deve essere un numero positivo', data: null };
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0 || ingredients.some(i => typeof i !== 'string')) {
        return { error: 'Il campo "ingredients" deve essere un array di stringhe, non vuoto', data: null };
    }

    if (typeof spicy !== 'boolean') {
        return { error: 'Il campo "spicy" deve essere un booleano', data: null };
    }

    return { error: null, data: { name: name.trim(), price, ingredients, spicy } };
}

export function generateSlug(pizza) {
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

    // Nel caso peggiore tutte le pizze hanno lo stesso slug base:
    // menu.length tentativi sono sempre sufficienti a trovarne uno libero.
    for (let increment = 0; increment <= menu.length; increment++) {
        const candidate = increment === 0 ? base : `${base}-${increment}`;

        if (!menu.some(p => p.slug === candidate)) {
            return candidate;
        }
    }
}

export function generateNextId() {
    // Math.max garantisce l'id più alto anche se il menu non è ordinato per id
    return Math.max(...menu.map(p => p.id)) + 1;
}
