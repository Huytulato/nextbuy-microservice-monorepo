/**
 * Payment Routes
 */

import express, { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { isAuthenticated, isAdmin, isSeller } from '@packages/middleware/isAuthenticated';

const router: Router = express.Router();

// ==================== Payment Session Routes ====================
router.post('/create-payment-session', isAuthenticated, paymentController.createPaymentSession);
router.get('/verify-payment-session', isAuthenticated, paymentController.verifyPaymentSession);

// ==================== Payment Intent Routes ====================
router.post('/create-payment-intent', isAuthenticated, paymentController.createPaymentIntent);

// ==================== Payment History Routes ====================
router.get('/payments/history', isAuthenticated, paymentController.getPaymentHistory);
router.get('/payments/order/:orderId', isAuthenticated, paymentController.getPaymentByOrderId);
router.get('/payments/:id', isAuthenticated, paymentController.getPaymentById);

// ==================== Refund Routes ====================
router.post('/refunds', isAuthenticated, paymentController.requestRefund);
router.get('/refunds/order/:orderId', isAuthenticated, paymentController.getOrderRefunds);
router.get('/refunds/pending', isAuthenticated, isAdmin, paymentController.getPendingRefunds);
router.post('/refunds/:id/approve', isAuthenticated, isAdmin, paymentController.approveRefund);

// ==================== Seller Payout Routes ====================
router.get('/payouts/seller', isAuthenticated, isSeller, paymentController.getSellerPayouts);
router.get('/payouts/seller/stats', isAuthenticated, isSeller, paymentController.getSellerPayoutStats);

// ==================== Admin Statistics Routes ====================
router.get('/payments/statistics', isAuthenticated, isAdmin, paymentController.getPaymentStatistics);

export default router;
