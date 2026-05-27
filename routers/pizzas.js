import express, { response } from 'express';
import { index, show, create, update, destroy } from '../controllers/pizzas.js';
import verificaOrarioApertura from '../middlewares/verificaOrarioApertura.js';
import checkPizzaSlug from '../middlewares/checkPizzaSlug.js';

// /pizzas
const router = express.Router();

router.use(verificaOrarioApertura);

// INDEX
router.get('/', index);

// SHOW by slug
// http://localhost:3000/pizzas/4-formaggi
// http://localhost:3000/pizzas/diavola
router.get('/:slug', checkPizzaSlug, show);

// CREATE
router.post('/', create);

// UPDATE
router.put('/:slug', checkPizzaSlug, update);

// DELETE
router.delete('/:slug', checkPizzaSlug, destroy);

export default router;
