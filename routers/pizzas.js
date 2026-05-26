import express from 'express';
import { index, show, showBySlug, create, update, destroy } from '../controllers/pizzas.js';

const router = express.Router();

// INDEX
router.get('/', index);

// SHOW by ID
// http://localhost:3000/pizzas/3
// http://localhost:3000/pizzas/19
//router.get('/:id*', show);

// SHOW by slug
// http://localhost:3000/pizzas/4-formaggi
// http://localhost:3000/pizzas/diavola
router.get('/:slug', showBySlug);

// CREATE
router.post('/', create);

// UPDATE
router.put('/:id', update);

// DELETE
router.delete('/:id', destroy);

export default router;