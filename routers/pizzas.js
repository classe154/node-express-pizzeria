import express from 'express';
import { index, showBySlug, create, update, destroy } from '../controllers/pizzas.js';

const router = express.Router();

// INDEX
router.get('/', index);

// SHOW by slug
// http://localhost:3000/pizzas/4-formaggi
// http://localhost:3000/pizzas/diavola
router.get('/:slug', showBySlug);

// CREATE
router.post('/', create);

// UPDATE
router.put('/:slug', update);

// DELETE
router.delete('/:slug', destroy);

export default router;
