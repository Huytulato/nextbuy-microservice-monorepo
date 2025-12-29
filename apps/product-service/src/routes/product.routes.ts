import express, { Router } from 'express';
import { createProduct, deleteProductImages, getCategories, getShopProducts, uploadProductImages, deleteProduct, restoreDeletedProduct, getAllProducts, getProductDetails, getFilteredProducts, searchProducts, getAllEvents, updateProduct, getPublicShopProducts, submitDraftForReview, getProductHistory, getProductVariations, updateProductVariation, deleteProductVariation, bulkUpdateVariations, updateVariationStock, updateVariationPrice, updateProductStock, updateProductPrice, bulkHideProducts, bulkDeleteProducts, toggleHideProduct, getShopEvents, updateEventDates } from '../controller/product.controller';
import { isAuthenticated, isSeller, isAdmin } from '@packages/middleware/isAuthenticated';
const router: Router = express.Router();

// Route to get product categories
router.get('/get-categories', getCategories);

router.post('/upload-product-image', isAuthenticated, isSeller, uploadProductImages);
router.delete('/delete-product-image', isAuthenticated, isSeller, deleteProductImages);
router.post('/create-product', isAuthenticated, isSeller, createProduct);
router.put('/update-product/:productId', isAuthenticated, isSeller, updateProduct);
router.post('/submit-draft/:productId', isAuthenticated, isSeller, submitDraftForReview);
router.get('/get-shop-products', isAuthenticated, isSeller, getShopProducts);
router.get('/get-shop-events', isAuthenticated, isSeller, getShopEvents);
router.get('/product-history/:productId', isAuthenticated, getProductHistory);
router.delete('/delete-product/:productId', isAuthenticated, isSeller, deleteProduct);
router.post('/restore-deleted-product/:productId', isAuthenticated, isSeller, restoreDeletedProduct); 

// Variation management routes
router.get('/:productId/variations', getProductVariations); // Public - for buyers
router.put('/variations/:variationId', isAuthenticated, isSeller, updateProductVariation);
router.delete('/variations/:variationId', isAuthenticated, isSeller, deleteProductVariation);
router.put('/:productId/variations/bulk', isAuthenticated, isSeller, bulkUpdateVariations);

// Quick update routes for inline editing
router.put('/update-variation-stock/:productId/:variationId', isAuthenticated, isSeller, updateVariationStock);
router.put('/update-variation-price/:productId/:variationId', isAuthenticated, isSeller, updateVariationPrice);
router.put('/update-product-stock/:productId', isAuthenticated, isSeller, updateProductStock);
router.put('/update-product-price/:productId', isAuthenticated, isSeller, updateProductPrice);

// Bulk operations
router.put('/bulk-hide-products', isAuthenticated, isSeller, bulkHideProducts);
router.delete('/bulk-delete-products', isAuthenticated, isSeller, bulkDeleteProducts);

// Toggle hide/show product
router.put('/toggle-hide-product/:productId', isAuthenticated, isSeller, toggleHideProduct);

// Event management
router.put('/update-event-dates/:productId', isAuthenticated, isSeller, updateEventDates);

router.get('/get-all-products', getAllProducts);
router.get('/get-all-events', getAllEvents);
router.get('/get-product/:slug', getProductDetails);
router.get('/get-filtered-products', getFilteredProducts);
router.get('/search-products', searchProducts);
router.get('/get-shop-products/:shopId', getPublicShopProducts);

export default router;