import express from 'express';
import { index, show, create } from '../controllers/pizzas.js';

const router = express.Router();

// INDEX (http://localhost:3000/pizzas)
router.get('/', index);

// SHOW (http://localhost:3000/pizzas/1)
router.get('/:id', show);

// CREATE
router.post('/', create);

export default router;