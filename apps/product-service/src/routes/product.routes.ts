import express, { Router } from 'express';
import { createDiscountCodes, createProduct, deleteDiscountCodes, deleteProductImages, getCategories, getDiscountCodes, getShopProducts, uploadProductImages, deleteProduct, restoreDeletedProduct } from '../controller/product.controller';
import isAuthenticated from '@packages/middleware/isAuthenticated';

const router: Router = express.Router();

// Route to get product categories
router.get('/get-categories', getCategories);
router.post('/create-discount-codes', isAuthenticated, createDiscountCodes); 
router.get('/get-discount-codes', isAuthenticated, getDiscountCodes);
router.delete('/delete-discount-codes/:id', isAuthenticated, deleteDiscountCodes);
router.post('/upload-product-image', isAuthenticated, uploadProductImages);
router.delete('/delete-product-image', isAuthenticated, deleteProductImages);
router.post('/create-product', isAuthenticated, createProduct);
router.get('/get-shop-products', isAuthenticated, getShopProducts);
router.delete('/delete-product/:productId', isAuthenticated, deleteProduct);
router.post('/restore-deleted-product/:productId', isAuthenticated, restoreDeletedProduct); 

export default router;