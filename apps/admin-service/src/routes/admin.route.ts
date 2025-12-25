import express, { Router } from 'express';
import { getAllEvents, getAllAdmins, getAllProducts, addNewAdmin, fetchAllCustomizations, getAllSellers, getAllUsers, approveSeller, rejectSeller, approveProduct, rejectProduct, getPendingSellers, getPendingProducts, getModerationConfig, updateModerationConfig, addBannedKeyword, removeBannedKeyword, addSensitiveCategory, removeSensitiveCategory, bulkApproveProducts, bulkRejectProducts, getModerationAnalytics } from '../controllers/admin.controller';
import { isAuthenticated, isAdmin } from '@packages/middleware/isAuthenticated';

const router: Router = express.Router();

router.get("/get-all-products",isAuthenticated, isAdmin, getAllProducts);
router.get("/get-all-events",isAuthenticated, isAdmin, getAllEvents);
router.get("/get-all-admins",isAuthenticated, isAdmin, getAllAdmins);
router.get("/get-all-sellers",isAuthenticated, isAdmin, getAllSellers);
router.get("/get-all-users",isAuthenticated, isAdmin, getAllUsers);   
router.post("/add-new-admin",isAuthenticated, isAdmin, addNewAdmin);
router.get("/get-all",fetchAllCustomizations);

// Seller verification routes
router.get("/get-pending-sellers",isAuthenticated, isAdmin, getPendingSellers);
router.post("/approve-seller/:sellerId",isAuthenticated, isAdmin, approveSeller);
router.post("/reject-seller/:sellerId",isAuthenticated, isAdmin, rejectSeller);

// Product moderation routes
router.get("/get-pending-products",isAuthenticated, isAdmin, getPendingProducts);
router.post("/approve-product/:productId",isAuthenticated, isAdmin, approveProduct);
router.post("/reject-product/:productId",isAuthenticated, isAdmin, rejectProduct);
router.post("/bulk-approve-products",isAuthenticated, isAdmin, bulkApproveProducts);
router.post("/bulk-reject-products",isAuthenticated, isAdmin, bulkRejectProducts);
router.get("/moderation-analytics",isAuthenticated, isAdmin, getModerationAnalytics);

// Moderation configuration routes
router.get("/moderation-config",isAuthenticated, isAdmin, getModerationConfig);
router.put("/moderation-config",isAuthenticated, isAdmin, updateModerationConfig);
router.post("/moderation-config/banned-keywords",isAuthenticated, isAdmin, addBannedKeyword);
router.delete("/moderation-config/banned-keywords",isAuthenticated, isAdmin, removeBannedKeyword);
router.post("/moderation-config/sensitive-categories",isAuthenticated, isAdmin, addSensitiveCategory);
router.delete("/moderation-config/sensitive-categories",isAuthenticated, isAdmin, removeSensitiveCategory);

export default router;