import express, { Router } from 'express';
import { 
  createSellerShop, 
  submitSellerDocuments, 
  createStripeConnectLink, 
  createDiscountCodes, 
  getDiscountCodes, 
  deleteDiscountCodes, 
  getSellerStripeAccount 
} from '../controllers/seller.controller';
import { isAuthenticated, isSeller } from '@packages/middleware/isAuthenticated';

const router: Router = express.Router();

router.post('/create-shop', isAuthenticated, isSeller, createSellerShop);
router.post('/submit-seller-documents', isAuthenticated, isSeller, submitSellerDocuments);
router.post('/create-stripe-account', isAuthenticated, isSeller, createStripeConnectLink);
router.post('/create-discount-codes', isAuthenticated, isSeller, createDiscountCodes);
router.get('/get-discount-codes', isAuthenticated, isSeller, getDiscountCodes);
router.delete('/delete-discount-codes/:id', isAuthenticated, isSeller, deleteDiscountCodes);
router.get('/get-stripe-account', isAuthenticated, isSeller, getSellerStripeAccount);

export default router;
