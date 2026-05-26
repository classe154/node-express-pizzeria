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
    let slug = pizza.name.replaceAll(' ', '-').toLowerCase();

    let increment = 0;
    let slugFinal;

    do {
        slugFinal = slug + (increment === 0 ? '' : `-${increment}`);
        increment++;
    } while (menu.some(p => p.slug === slugFinal));

    return slugFinal;
}

export function generateNextId() {
    // Math.max garantisce l'id più alto anche se il menu non è ordinato per id
    return Math.max(...menu.map(p => p.id)) + 1;
}
