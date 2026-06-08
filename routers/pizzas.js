import express from 'express';
import { index, show, create, modify, destroy, restore } from '../controllers/pizzas.js';
import checkOpenTime from '../middlewares/checkOpenTime.js';
import checkPizzaSlug from '../middlewares/checkPizzaSlug.js';
import checkPizzaAvailable from '../middlewares/checkPizzaAvailable.js';
import validatePizzaJsonBody from '../middlewares/validatePizzaJsonBody.js';

// /pizzas
const router = express.Router();

router.use(checkOpenTime);

// INDEX
router.get('/', index);

// SHOW
router.get('/:id', show);

// CREATE
router.post('/', create);

// MODIFY
router.patch('/:slug', modify);

// DELETE
router.delete('/:slug', destroy);

export default router;
