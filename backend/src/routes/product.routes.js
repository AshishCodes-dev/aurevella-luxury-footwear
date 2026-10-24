import express from 'express';
import {
  getProducts,
  getProductByIdOrSlug,
  getCategories,
} from '../controllers/product.controller.js';

const router = express.Router();

// Catalogue Routes
router.get('/', getProducts);
router.get('/:idOrSlug', getProductByIdOrSlug);

export default router;
export { getCategories };
