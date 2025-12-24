import express, { Router } from "express";
import { createPaymentIntent, createPaymentSession, getAdminOrders, getOrderDetails, getSellerOrders, getUserOrders, getUserOrderDetails, updateDeliveryStatus, verifyPaymentSession } from "../controllers/order.controller";
import { isAuthenticated, isAdmin, isSeller } from "@packages/middleware/isAuthenticated";

const router: Router = express.Router();

router.post("/create-payment-intent", isAuthenticated, createPaymentIntent);
router.post("/create-payment-session", isAuthenticated, createPaymentSession);
router.get("/verifying-payment-session", isAuthenticated, verifyPaymentSession);
router.get("/seller-orders", isAuthenticated, isSeller, getSellerOrders);
router.get("/order-details/:orderId", isAuthenticated, isSeller, getOrderDetails);
router.put("/order-delivery-status/:orderId", isAuthenticated, isSeller, updateDeliveryStatus);
router.get("/admin-orders", isAuthenticated, isAdmin, getAdminOrders);
router.get("/user-orders", isAuthenticated, getUserOrders);
router.get("/user-order-details/:orderId", isAuthenticated, getUserOrderDetails);

export default router;