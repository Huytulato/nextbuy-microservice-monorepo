import express, { Router } from 'express';
import { createProduct, deleteProductImages, getCategories, getShopProducts, uploadProductImages, deleteProduct, restoreDeletedProduct, getAllProducts, getProductDetails, getFilteredProducts, getFilteredShops, searchProducts, topShops, getAllEvents, updateProduct, getShopById, getPublicShopProducts } from '../controller/product.controller';
import { isAuthenticated, isSeller } from '@packages/middleware/isAuthenticated';
const router: Router = express.Router();

// Route to get product categories
router.get('/get-categories', getCategories);

router.post('/upload-product-image', isAuthenticated, isSeller, uploadProductImages);
router.delete('/delete-product-image', isAuthenticated, isSeller, deleteProductImages);
router.post('/create-product', isAuthenticated, isSeller, createProduct);
router.put('/update-product/:productId', isAuthenticated, isSeller, updateProduct);
router.get('/get-shop-products', isAuthenticated, isSeller, getShopProducts);
router.delete('/delete-product/:productId', isAuthenticated, isSeller, deleteProduct);
router.post('/restore-deleted-product/:productId', isAuthenticated, isSeller, restoreDeletedProduct); 

router.get('/get-all-products', getAllProducts);
router.get('/get-all-events', getAllEvents);
router.get('/get-product/:slug', getProductDetails);
router.get('/get-filtered-products', getFilteredProducts);
router.get('/get-filtered-shops', getFilteredShops);
router.get('/search-products', searchProducts);
router.get('/top-shops', topShops);
router.get('/get-shop/:id', getShopById);
router.get('/get-shop-products/:shopId', getPublicShopProducts);

export default router;