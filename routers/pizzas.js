import express from 'express';
import { index, show, create, destroy } from '../controllers/pizzas.js';

const router = express.Router();

// INDEX
router.get('/', index);

// SHOW
router.get('/:id', show);

// CREATE
router.post('/', create);

// DELETE
router.delete('/:id', destroy);

export default router;