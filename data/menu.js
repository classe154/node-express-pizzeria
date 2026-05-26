const menu = [
    {
        id: 1,
        slug: "margherita",
        name: "Margherita",
        image: "imgs/pizze/margherita.webp",
        ingredients: ["pomodoro", "mozzarella"],
        price: 9.00,
        available: true,
        spicy: false,
        createdAt: "2024-01-10",
    },
    {
        id: 2,
        slug: "margherita-1",
        name: "Margherita con Bufale",
        image: "imgs/pizze/margherita.webp",
        ingredients: ["pomodoro", "mozzarella"],
        price: 9.00,
        available: true,
        spicy: false,
        createdAt: "2024-01-10",
    },
    {
        id: 3,
        slug: "marinara",
        name: "Marinara",
        image: "imgs/pizze/marinara.jpeg",
        ingredients: ["pomodoro", "aglio", "origano"],
        price: 9.50,
        available: true,
        spicy: false,
        createdAt: "2024-01-10",
    }, {
        id: 5,
        slug: "diavola",
        name: "Diavola",
        image: "imgs/pizze/diavola.jpeg",
        ingredients: ["pomodoro", "mozzarella", "salame piccante"],
        price: 11.00,
        available: true,
        spicy: true,
        createdAt: "2024-03-05",
    }, {
        id: 6,
        slug: "bufalina",
        name: "Bufalina",
        image: "imgs/pizze/bufalina.jpeg",
        ingredients: ["pomodoro", "mozzarella di bufala"],
        price: 13.50,
        available: false,
        spicy: false,
        createdAt: "2024-03-05",
    }, {
        id: 10,
        slug: "4-formaggi",
        name: "4 formaggi",
        image: "imgs/pizze/4_formaggi.jpeg",
        ingredients: ["pomodoro", "mozzarella", "gorgonzola", "parmigiano", "ricotta"],
        price: 12.00,
        available: true,
        spicy: false,
        createdAt: "2024-06-20",
    }
];

const generateSlug = (pizza) => {
    const pizzaName = pizza.name;

    let slug = pizzaName.replaceAll(" ", "-");
    slug = slug.toLowerCase();

    let increment = 0;
    let slugFinal;
    let pizzaWithSameSlug;

    do {

        // margherita i=0
        // margherita-1 i=1
        // margherita-2 i=2
        slugFinal = slug + ((increment === 0) ? '' : `-${increment}`);

        // Cerchiamo se esiste una pizza con il nostro solito slug
        pizzaWithSameSlug = menu.find(pizza => {
            return pizza.slug === slugFinal;
        });

        increment++;

    } while (pizzaWithSameSlug !== undefined);
    
    return slugFinal;
};

const generateNextId = () => {
    // Math.max garantisce l'id più alto anche se il menu non è ordinato per id
    return Math.max(...menu.map(p => p.id)) + 1;
};

const menuOrderFields = [
    'price',
    'name'
];

export {
    menuOrderFields,
    generateNextId,
    generateSlug,
};

export default menu;