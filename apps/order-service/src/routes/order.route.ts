import isAuthenticated from "@packages/middleware/isAuthenticated";
import express, { Router } from "express";
import { createPaymentIntent, createPaymentSession, getOrderDetails, getSellerOrders, updateDeliveryStatus, verifyPaymentSession } from "../controllers/order.controller";
import { isSeller } from "@packages/middleware/authorizeRoles";

const router: Router = express.Router();

router.post("/create-payment-intent", isAuthenticated, createPaymentIntent);
router.post("/create-payment-session", isAuthenticated, createPaymentSession);
router.get("/verifying-payment-session", isAuthenticated, verifyPaymentSession);
router.get("/seller-orders", isAuthenticated, isSeller, getSellerOrders);
router.get("/order-details/:orderId", isAuthenticated, isSeller, getOrderDetails);
router.put("/order-delivery-status/:orderId", isAuthenticated, isSeller, updateDeliveryStatus);

export default router;