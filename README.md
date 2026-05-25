# Node Express Pizzeria

Esempio didattico di un server REST costruito con **Node.js** e **Express**.

---

## Il "database" in memoria

I dati delle pizze sono definiti in [`data/menu.js`](data/menu.js) come un semplice array JavaScript:

```js
const menu = [
  { id: 1, name: "Margherita", price: 9.00, ... },
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

Esempio pratico sulle rotte `/pizzas/:id`:

| Richiesta | Status | Motivo |
|-----------|--------|--------|
| `GET /pizzas/ciao` | `400` | `ciao` non è un id valido |
| `GET /pizzas/-89` | `400` | Un id negativo non ha senso |
| `GET /pizzas/9999` | `404` | L'id è valido, ma quella pizza non esiste |

Vedi i casi da testare in [`controllers/pizzas.js` → `destroy()`](controllers/pizzas.js#L131).

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

Vedi l'uso in [`controllers/pizzas.js` → `destroy()` riga 167](controllers/pizzas.js#L167).

---

## Leggere i dati in entrata

### `request.params` — parametri di rotta

Sono i valori dinamici definiti nella rotta con `:nomeParametro`:

```js
// Rotta definita in routers/pizzas.js (riga 10)
router.get('/:id', show);

// Lettura in controllers/pizzas.js (riga 55)
const { id } = request.params; // es. GET /pizzas/3 → id = "3"
```

Vedi [`routers/pizzas.js`](routers/pizzas.js) e [`controllers/pizzas.js` → `show()`](controllers/pizzas.js#L47).

> I parametri arrivano sempre come **stringhe**. Se serve un numero, bisogna convertirli: `Number(id)` oppure `parseInt(id)`.

### `request.query` — query string

Sono i parametri passati nell'URL dopo il `?`:

```js
// URL: GET /pizzas?priceMax=10.8&ingredients=mozza
const { priceMax, ingredients } = request.query;
```

Vedi [`controllers/pizzas.js` → `index()`](controllers/pizzas.js#L3) per un esempio completo con filtri.

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
