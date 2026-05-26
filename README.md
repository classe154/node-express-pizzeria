# Node Express Pizzeria

Esempio didattico di un server REST costruito con **Node.js** e **Express**.

---

## Il "database" in memoria

I dati delle pizze sono definiti in [`data/menu.js`](data/menu.js) come un semplice array JavaScript:

```js
const menu = [
  { id: 1, slug: "margherita", name: "Margherita", price: 9.00, ... },
  ...
];
```

Questo array viene caricato **una sola volta all'avvio del server**. Finché il server è acceso, tutte le modifiche (aggiunta, cancellazione) vivono in memoria. Quando il server si spegne, tutto torna allo stato iniziale del file.

> **Attenzione con `pnpm watch`**: il watcher riavvia il server automaticamente ad ogni salvataggio del codice. Questo significa che anche salvare un `console.log` di debug resetterà il menu. Se una `DELETE` sembra non aver funzionato, probabilmente il server si è riavviato nel frattempo.

---

## Status code HTTP

Quando costruiamo un'API non basta che il codice funzioni: bisogna anche restituire lo **status code corretto**.

| Codice | Nome | Quando usarlo |
|--------|------|---------------|
| `200` | OK | La richiesta è andata a buon fine e il server restituisce contenuto nel body |
| `201` | Created | La risorsa è stata creata correttamente |
| `204` | No Content | L'operazione è andata bene, ma non restituiamo contenuto nel body |
| `301` | Moved Permanently | La risorsa è stata spostata in modo permanente |
| `400` | Bad Request | Il server non riesce ad accettare la richiesta perché i dati sono sbagliati |
| `404` | Not Found | La risorsa richiesta non esiste |
| `500` | Internal Server Error | Errore interno del server |

### Distinzione importante: 400 vs 404

- Si usa **`400`** quando la **richiesta è sbagliata** (dati non validi, parametro malformato)
- Si usa **`404`** quando la richiesta è formalmente corretta, ma la **risorsa non esiste**

Esempio pratico sulle rotte `POST /pizzas` (validazione del body):

| Situazione | Status | Motivo |
|-----------|--------|--------|
| `{ "name": "" }` | `400` | Il nome è obbligatorio |
| `{ "price": "ciao" }` | `400` | Il prezzo deve essere un numero |
| `{ "name": "Capricciosa", "price": 10 }` | `400` | Ingredients mancante |
| Body corretto, pizza non trovata | `404` | La risorsa non esiste |

Vedi i casi da testare in [`controllers/pizzas.js` → `create()`](controllers/pizzas.js#L64).

---

## Soft delete

### Il problema della cancellazione fisica

Quando si rimuove un elemento da un array con `splice()`, quella risorsa scompare per sempre. In un'applicazione reale questo comporta diversi problemi:

- **Perdita di dati**: non c'è modo di recuperare la risorsa eliminata
- **Log incompleti**: se un ordine faceva riferimento a una pizza cancellata, il log non ha più senso
- **Integrità referenziale**: altre parti del sistema potrebbero avere riferimenti a quella risorsa

### La soluzione: soft delete con `available`

Invece di rimuovere fisicamente la pizza dall'array, impostiamo `available: false`:

```js
// Prima (hard delete — rimosso per sempre)
menu.splice(pizzaFoundIndex, 1);

// Dopo (soft delete — nascosto, ma ancora in memoria)
pizza.available = false;
```

La pizza continua ad esistere nell'array ma viene **filtrata** in ogni punto del codice che espone dati al client:

| Funzione | Comportamento |
|----------|--------------|
| `index()` | filtra le pizze con `available: false` |
| `showBySlug()` | risponde 404 se `available` è `false` |
| `update()` | risponde 404 se `available` è `false` |
| `destroy()` | risponde 404 se già soft-deletata |

Vedi l'implementazione in [`controllers/pizzas.js` → `destroy()`](controllers/pizzas.js#L97).

> **Trade-off**: con un database in memoria, le risorse soft-deletate rimangono nell'array per tutta la vita del processo. In un database reale si usa una colonna `deleted_at` (timestamp) che permette anche di sapere *quando* la risorsa è stata eliminata e di ripristinarla se necessario.

---

## Rispondere al client: `status`, `json`, `send`, `sendStatus`

Express mette a disposizione diversi metodi sull'oggetto `response` per costruire la risposta.

### `res.status(codice)`

Imposta lo status code della risposta. Si concatena solitamente con `json()` o `send()`:

```js
response.status(404).json({ error: 'Pizza non trovata', results: null });
```

### `res.json(oggetto)`

Serializza l'oggetto in JSON, lo invia nel body e imposta automaticamente l'header `Content-Type: application/json`:

```js
response.json({ error: null, results: pizzaFound });
```

### `res.send(testo)`

Invia una risposta con body testuale generico. Meno usato nelle API JSON.

### `res.sendStatus(codice)`

Imposta lo status code **e** invia il body in un colpo solo. Utile quando non c'è contenuto da restituire:

```js
response.sendStatus(204); // equivale a: res.status(204).send('No Content')
```

Vedi l'uso in [`controllers/pizzas.js` → `destroy()`](controllers/pizzas.js#L113).

---

## Leggere i dati in entrata

### `request.params` — parametri di rotta

Sono i valori dinamici definiti nella rotta con `:nomeParametro`:

```js
// Rotta definita in routers/pizzas.js
router.get('/:slug', show);

// Lettura in controllers/pizzas.js
const slug = request.params.slug.trim(); // es. GET /pizzas/margherita → slug = "margherita"
```

Vedi [`routers/pizzas.js`](routers/pizzas.js) e [`controllers/pizzas.js` → `show()`](controllers/pizzas.js#L37).

> I parametri arrivano sempre come **stringhe**. A differenza degli ID numerici, gli slug non richiedono conversione di tipo.

> **Evoluzione del codice**: nella versione precedente del progetto la rotta usava `/:id` e il controller si chiamava `show()` per ID numerico. Il parametro veniva convertito con `Number(id)` e validato (`isNaN`, `<= 0`). Con il passaggio agli slug tutta la validazione numerica è scomparsa: qualsiasi stringa è uno slug potenzialmente valido, quindi basta un `find()` per verificare se esiste.

---

### Slug vs ID: perché preferire lo slug

Nelle prime versioni del progetto le rotte usavano l'ID numerico: `/pizzas/1`, `/pizzas/2`. Questo approccio ha diversi svantaggi.

#### IDOR e Enumeration attack

Con ID sequenziali un client malevolo può iterare tutti i valori possibili:

```
GET /pizzas/1   → 200
GET /pizzas/2   → 200
GET /pizzas/3   → 200
...
GET /pizzas/999 → 404
```

Questo tipo di attacco si chiama **IDOR** (Insecure Direct Object Reference) o **enumeration attack**: permette di scoprire risorse non pubbliche semplicemente incrementando un numero. Lo slug non elimina il problema da solo, ma rende l'enumerazione molto più difficile perché non esiste una sequenza prevedibile da seguire.

#### SEO e leggibilità

Un URL con slug è più efficace sia per i motori di ricerca sia per l'utente:

| URL con ID | URL con slug |
|-----------|-------------|
| `/pizzas/1` | `/pizzas/margherita` |
| `/pizzas/10` | `/pizzas/4-formaggi` |

I motori di ricerca indicizzano meglio le URL che contengono parole chiave. Inoltre uno slug è immediatamente comprensibile da un utente che legge un link condiviso.

#### Come viene generato lo slug

Lo slug viene creato automaticamente a partire dal nome della pizza in [`utils/pizza.js` → `generateSlug()`](utils/pizza.js#L28):

```js
// "4 Formaggi Speciale" → "4-formaggi-speciale"
let slug = pizza.name.replaceAll(' ', '-').toLowerCase();
```

In caso di **collisione** (due pizze con lo stesso nome), viene aggiunto un suffisso numerico incrementale tramite un ciclo `do...while`:

```
margherita       ← prima pizza con quel nome
margherita-1     ← seconda pizza con lo stesso nome
margherita-2     ← terza
```

---

### `request.query` — query string

Sono i parametri passati nell'URL dopo il `?`:

```js
// URL: GET /pizzas?priceMax=10.8&ingredients=mozza
const { priceMax, ingredients } = request.query;
```

Vedi [`controllers/pizzas.js` → `index()`](controllers/pizzas.js#L3) per un esempio completo con filtri.

#### Ordinamento dei risultati con `orderBy`

L'endpoint `GET /pizzas` supporta un parametro `orderBy` per ordinare i risultati:

```
GET /pizzas?orderBy=price   → pizze ordinate per prezzo (decrescente)
GET /pizzas?orderBy=name    → pizze ordinate per nome (decrescente alfabetico)
```

Per evitare che un client passi una chiave arbitraria (es. `orderBy=__proto__`), l'ordinamento è consentito solo su un insieme di campi dichiarati in una **whitelist**:

```js
// utils/pizza.js
export const menuOrderFields = ['price', 'name'];
```

L'ordinamento viene applicato con `Array.sort()`. Il comparatore si comporta in modo diverso a seconda del tipo del valore:

```js
menuFiltered.sort((pizzaA, pizzaB) => {
    const a = pizzaA[orderBy];
    const b = pizzaB[orderBy];
    if (typeof a === 'string') return b.localeCompare(a); // ordine alfabetico inverso
    if (typeof a === 'number') return b - a;              // dal più grande al più piccolo
});
```

> **Implementazione più completa**: in produzione si aggiunge solitamente anche un parametro `order` per scegliere la direzione:
> ```
> GET /pizzas?orderBy=price&order=asc
> GET /pizzas?orderBy=name&order=desc
> ```
> Il comparatore diventa:
> ```js
> const direction = order === 'asc' ? 1 : -1;
> if (typeof a === 'number') return (a - b) * direction;
> if (typeof a === 'string') return a.localeCompare(b) * direction;
> ```
> Moltiplicare il risultato per `1` o `-1` inverte l'ordine senza duplicare la logica.

### `request.body` — corpo della richiesta

Contiene i dati inviati dal client nel body (tipicamente nelle richieste `POST` e `PUT`).

Per poterlo leggere è necessario configurare un middleware di parsing in [`server.js`](server.js) (vedi sezione successiva):

```js
const { name, price } = request.body;
```

---

## Body parsing in Express

Express, di base, non sa come leggere il contenuto di `request.body`. Per questo usiamo i **middleware di parsing**, che dipendono dal tipo di contenuto inviato dal client (`Content-Type`).

### `application/json`

Il client invia dati in formato JSON:

```json
{
  "name": "Capricciosa",
  "price": 11.50
}
```

Middleware già attivo in [`server.js` riga 10](server.js#L10):

```js
app.use(express.json());
```

### `application/x-www-form-urlencoded`

Usato dai form HTML classici (senza upload di file). I dati arrivano come coppie chiave-valore:

```
name=Capricciosa&price=11.50
```

Middleware da aggiungere in [`server.js`](server.js):

```js
app.use(express.urlencoded({ extended: true }));
```

> `extended: true` permette di ricevere nel body oggetti annidati e array (es. `{ utente: { nome: "Mario" } }`). Con `extended: false` si supportano solo coppie chiave-valore semplici. Per la maggior parte dei casi `true` è la scelta più sicura.

### `multipart/form-data`

Si usa quando il client deve inviare **file** (immagini, documenti) insieme ad altri campi. In questo caso `express.json()` e `express.urlencoded()` non bastano: serve una libreria esterna come **`multer`**.

> `multer` verrà approfondito in una lezione successiva.
