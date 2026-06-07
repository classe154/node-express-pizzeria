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
| `403` | Forbidden | Non hai il permesso di accedere al server |
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

Vedi i casi da testare in [`controllers/pizzas.js` → `create()`](controllers/pizzas.js#L56).

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
| `show()` | risponde 404 se `available` è `false` (tramite middleware `checkPizzaAvailable`) |
| `modify()` | non controlla `available`: un admin può modificare anche una pizza non disponibile |
| `destroy()` | non controlla `available`: imposta `available: false` qualunque sia lo stato corrente |

Vedi l'implementazione in [`controllers/pizzas.js` → `destroy()`](controllers/pizzas.js#L88).

> **Trade-off**: con un database in memoria, le risorse soft-deletate rimangono nell'array per tutta la vita del processo. In un database reale si usa una colonna `deleted_at` (timestamp) che permette anche di sapere *quando* la risorsa è stata eliminata e di ripristinarla se necessario.

---

## Middleware

Un **middleware** è una funzione che viene eseguita tra la ricezione della richiesta e l'invio della risposta. Ogni middleware riceve `(request, response, next)` e può:

- leggere o modificare `request` / `response`
- terminare la richiesta chiamando `response.json()` o simili
- passare il controllo al middleware successivo chiamando `next()`

### Catena di middleware per rotta

```
GET    /pizzas              →  verificaOrarioApertura → index
GET    /pizzas/:slug        →  verificaOrarioApertura → checkPizzaSlug → checkPizzaAvailable → show
POST   /pizzas              →  verificaOrarioApertura → validatePizzaJsonBody → create
PATCH  /pizzas/:slug        →  verificaOrarioApertura → checkPizzaSlug → validatePizzaJsonBody → modify
DELETE /pizzas/:slug        →  verificaOrarioApertura → checkPizzaSlug → destroy
```

### `checkPizzaSlug`

[`middlewares/checkPizzaSlug.js`](middlewares/checkPizzaSlug.js) cerca la pizza per slug nell'array `menu`. Se non la trova risponde `404`; altrimenti aggiunge alla request i campi `pizzaFound` e `pizzaFoundIndex` e chiama `next()`.

```js
request.pizzaFoundIndex = pizzaFoundIndex;
request.pizzaFound = menu[pizzaFoundIndex];
```

### `checkPizzaAvailable`

[`middlewares/checkPizzaAvailable.js`](middlewares/checkPizzaAvailable.js) legge `request.pizzaFound` (già popolato da `checkPizzaSlug`) e risponde `404` se la pizza non è disponibile. I due middleware sono separati per permettere alle rotte admin (`PATCH`, `DELETE`) di operare su pizze non disponibili senza passare per questo controllo.

### `validatePizzaJsonBody`

[`middlewares/validatePizzaJsonBody.js`](middlewares/validatePizzaJsonBody.js) delega la validazione a `validatePizza()` in [`utils/pizzas.js`](utils/pizzas.js). Se la validazione fallisce risponde `400` con l'elenco degli errori; altrimenti sostituisce `request.body` con i dati validati e chiama `next()`.

Il middleware capisce automaticamente se la richiesta è un **create** o un **update parziale** leggendo il metodo HTTP:

```js
const update = request.method === 'PATCH';
```

- **CREATE** (`POST`): tutti e quattro i campi (`name`, `price`, `ingredients`, `spicy`) sono obbligatori
- **PATCH**: si possono inviare solo i campi che si vuole modificare (subset dei campi validi)

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

Vedi l'uso in [`controllers/pizzas.js` → `destroy()`](controllers/pizzas.js#L88).

---

## Field masking

Il controller non espone mai direttamente l'oggetto pizza dall'array. Prima di inviare la risposta, passa sempre per `maskPizzaFields()`:

```js
response.json({ error: null, results: maskPizzaFields(pizzaFound) });
```

Questa funzione restituisce **solo i campi pubblici** della pizza, definiti in `pizzaShowFields`:

```js
// utils/pizzas.js
const pizzaShowFields = ['slug', 'name', 'ingredients', 'price', 'spicy'];
```

I campi interni (`id`, `available`, `createdAt`, `updatedAt`) non arrivano mai al client. Questo è utile per:

- non esporre informazioni implementative (l'`id` interno)
- non mostrare lo stato `available` (il client non deve sapere se una pizza è stata soft-deletata)
- controllare in un unico punto quali campi sono pubblici

---

## Leggere i dati in entrata

### `request.params` — parametri di rotta

Sono i valori dinamici definiti nella rotta con `:nomeParametro`:

```js
// Rotta definita in routers/pizzas.js
router.get('/:slug', checkPizzaSlug, checkPizzaAvailable, show);

// Lettura in middlewares/checkPizzaSlug.js
const { slug } = request.params; // es. GET /pizzas/margherita → slug = "margherita"
```

Vedi [`middlewares/checkPizzaSlug.js`](middlewares/checkPizzaSlug.js).

> I parametri arrivano sempre come **stringhe**. A differenza degli ID numerici, gli slug non richiedono conversione di tipo.

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

Lo slug viene creato automaticamente a partire dal nome della pizza in [`utils/pizzas.js` → `generateSlug()`](utils/pizzas.js#L98):

```
"4 Formaggi Speciale" → "4-formaggi-speciale"
"Crêpe & Bufala"      → "crepe-bufala"
```

Il processo in sei passi:
1. `normalize('NFD')` — separa le lettere dagli accenti
2. Rimozione dei diacritici (`è` → `e`, `ñ` → `n`)
3. Tutto minuscolo
4. Spazi → trattini
5. Rimozione di tutto ciò che non è lettera, cifra o trattino
6. Collasso dei trattini doppi (`--` → `-`)

In caso di **collisione** (due pizze con lo stesso nome), viene aggiunto un suffisso numerico incrementale:

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

Vedi [`controllers/pizzas.js` → `index()`](controllers/pizzas.js#L4) per un esempio completo con filtri.

#### Ordinamento dei risultati con `orderBy`

L'endpoint `GET /pizzas` supporta un parametro `orderBy` per ordinare i risultati:

```
GET /pizzas?orderBy=price   → pizze ordinate per prezzo (decrescente)
GET /pizzas?orderBy=name    → pizze ordinate per nome (decrescente alfabetico)
```

Per evitare che un client passi una chiave arbitraria (es. `orderBy=__proto__`), l'ordinamento è consentito solo su un insieme di campi dichiarati in una **whitelist**:

```js
// utils/pizzas.js
const pizzaOrderFields = ['name', 'price'];
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

Contiene i dati inviati dal client nel body (tipicamente nelle richieste `POST` e `PATCH`).

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

Middleware già attivo in [`server.js`](server.js):

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
