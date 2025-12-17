import express, { Router } from 'express';
import { createDiscountCodes, createProduct, deleteDiscountCodes, deleteProductImages, getCategories, getDiscountCodes, getShopProducts, uploadProductImages, deleteProduct, restoreDeletedProduct, getSellerStripeAccount, getAllProducts, getProductDetails, getFilteredProducts, getFilteredShops, searchProducts, topShops, getAllEvents } from '../controller/product.controller';
import isAuthenticated from '@packages/middleware/isAuthenticated';
import { isSeller } from '@packages/middleware/authorizeRoles';

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
router.get('/get-stripe-account', isAuthenticated, isSeller, getSellerStripeAccount);
router.get('/get-all-products', getAllProducts);
router.get('/get-all-events', getAllEvents);
router.get('/get-product/:slug', getProductDetails);
router.get('/get-filtered-products', getFilteredProducts);
router.get('/get-filtered-shops', getFilteredShops);
router.get('/search-products', searchProducts);
router.get('/top-shops', topShops);

export default router;