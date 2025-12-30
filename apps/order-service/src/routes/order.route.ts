import express, { Router } from "express";
import { orderController } from "../controllers/order.controller";
import { isAuthenticated, isAdmin, isSeller } from "@packages/middleware/isAuthenticated";

const router: Router = express.Router();

router.post("/create-payment-intent", isAuthenticated, orderController.createPaymentIntent);
router.post("/create-payment-session", isAuthenticated, orderController.createPaymentSession);
router.get("/verifying-payment-session", isAuthenticated, orderController.verifyPaymentSession);
router.get("/seller-orders", isAuthenticated, isSeller, orderController.getSellerOrders);
router.get("/order-details/:orderId", isAuthenticated, isSeller, orderController.getOrderDetails);
router.put("/order-delivery-status/:orderId", isAuthenticated, isSeller, orderController.updateDeliveryStatus);
router.get("/admin-orders", isAuthenticated, isAdmin, orderController.getAdminOrders);
router.get("/admin-order-details/:orderId", isAuthenticated, isAdmin, orderController.getAdminOrderDetails);
router.get("/user-orders", isAuthenticated, orderController.getUserOrders);
router.get("/user-order-details/:orderId", isAuthenticated, orderController.getUserOrderDetails);

export default router;