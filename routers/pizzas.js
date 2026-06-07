import express from 'express';
import { index, show, create, modify, destroy } from '../controllers/pizzas.js';
import verificaOrarioApertura from '../middlewares/verificaOrarioApertura.js';
import checkPizzaSlug from '../middlewares/checkPizzaSlug.js';
import checkPizzaAvailable from '../middlewares/checkPizzaAvailable.js';
import validatePizzaJsonBody from '../middlewares/validatePizzaJsonBody.js';

// /pizzas
const router = express.Router();

router.use(verificaOrarioApertura);

// INDEX
router.get('/', index);

// SHOW by slug
// http://localhost:3000/pizzas/4-formaggi
// http://localhost:3000/pizzas/diavola
router.get('/:slug', checkPizzaSlug, checkPizzaAvailable, show);

// CREATE
router.post('/', validatePizzaJsonBody, create);

// MODIFY
router.patch('/:slug', checkPizzaSlug, validatePizzaJsonBody, modify);

// DELETE
router.delete('/:slug', checkPizzaSlug, destroy);

export default router;
