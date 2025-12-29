import express, { Router } from 'express';
import { 
  createSellerShop, 
  submitSellerDocuments, 
  uploadSellerDocument,
  uploadShopImage,
  createStripeConnectLink, 
  createDiscountCodes, 
  getDiscountCodes, 
  deleteDiscountCodes, 
  getSellerStripeAccount,
  getShopProfile,
  updateShopProfile,
  updateShippingSettings,
  getSellerProfile,
  updateSellerProfile,
  changePassword,
  getFilteredShops,
  topShops,
  getShopById
} from '../controllers/seller.controller';
import { isAuthenticated, isSeller } from '@packages/middleware/isAuthenticated';

const router: Router = express.Router();

// Public Shop Routes (Moved from Product Service)
router.get('/get-filtered-shops', getFilteredShops);
router.get('/top-shops', topShops);
router.get('/get-shop/:id', getShopById);

router.post('/upload-seller-document', isAuthenticated, uploadSellerDocument);
router.post('/upload-shop-image', isAuthenticated, uploadShopImage);
// Allow create-shop with just isAuthenticated during registration flow (sellerId can come from body)
router.post('/create-shop', isAuthenticated, createSellerShop);
// Allow submit documents with just isAuthenticated during registration flow (sellerId can come from body)
router.post('/submit-seller-documents', isAuthenticated, submitSellerDocuments);
router.post('/create-stripe-account', isAuthenticated, isSeller, createStripeConnectLink);
router.post('/create-discount-codes', isAuthenticated, isSeller, createDiscountCodes);
router.get('/get-discount-codes', isAuthenticated, isSeller, getDiscountCodes);
router.delete('/delete-discount-codes/:id', isAuthenticated, isSeller, deleteDiscountCodes);
router.get('/get-stripe-account', isAuthenticated, isSeller, getSellerStripeAccount);

// Shop Profile
router.get('/get-shop-profile', isAuthenticated, isSeller, getShopProfile);
router.put('/update-shop-profile', isAuthenticated, isSeller, updateShopProfile);
router.put('/update-shipping-settings', isAuthenticated, isSeller, updateShippingSettings);

// Seller Profile & Security
router.get('/get-seller-profile', isAuthenticated, isSeller, getSellerProfile);
router.put('/update-seller-profile', isAuthenticated, isSeller, updateSellerProfile);
router.put('/change-password', isAuthenticated, isSeller, changePassword);

export default router;
