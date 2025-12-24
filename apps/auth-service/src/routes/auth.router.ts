import express, { Router } from "express"; // import routing from express to define API endpoints
import { userRegistration, verifyUser, loginUser, forgotPassword, resetPassword, verifyUserForgotPasswordOtp, refreshTokens, getUser, logOutUser, verifySeller, registerSeller, loginSeller, getSeller, registerAdmin, loginAdmin, logOutAdmin, getAdmin, updateUserPassword, getUserAddresses, addUserAddress, deleteUserAddress, getNotifications, markNotificationAsRead } from "../controller/auth.controller"; // import the user registration controller function to handle user registration logic
import { isAuthenticated, isSeller, isAdmin } from "@packages/middleware/isAuthenticated";

const router: Router = express.Router(); // create a new router instance
router.post("/user-registration", userRegistration); // define a POST route for user registration that uses the userRegistration controller function
router.post("/verify-user", verifyUser); // define a POST route for user verification that uses the verifyUser controller function
router.post("/login-user", loginUser); // define a POST route for user login that uses the loginUser controller function
router.post("/refresh-token", refreshTokens); // define a POST route for refreshing tokens that uses the refreshTokens controller function
router.get("/logged-in-user", isAuthenticated, getUser); // define a GET route for getting logged in user that uses the getUser controller function
router.get("/logout-user", isAuthenticated, logOutUser); // define a GET route for logging out user that uses the getUser controller function
router.post("/forgot-password", forgotPassword); // define a POST route for user forgot password that uses the forgotPassword controller function
router.post("/verify-forgot-password-otp", verifyUserForgotPasswordOtp); // define a POST route for verifying forgot password OTP that uses the verifyUserForgotPasswordOtp controller function
router.post("/reset-password", resetPassword); // define a POST route for user reset password that uses the resetPassword controller function
router.post("/seller-registration", registerSeller); // define a POST route for seller registration that uses the registerSeller controller function

router.post("/verify-seller", verifySeller); // define a POST route for verifying seller that uses the verifySeller controller function

router.post("/login-seller", loginSeller); // define a POST route for seller login that uses the loginSeller controller function

router.post("/register-admin", registerAdmin); // define a POST route for admin registration that uses the registerAdmin controller function
router.post("/login-admin", loginAdmin);  // define a POST route for admin login that uses the loginAdmin controller function
router.get("/logout-admin", isAuthenticated, logOutAdmin); // define a GET route for logging out admin that uses the logOutAdmin controller function
router.get("/logged-in-seller", isAuthenticated, isSeller, getSeller); // define a GET route for getting logged in seller that uses the getSeller controller function
router.get("/logged-in-admin", isAuthenticated, isAdmin, getAdmin);
router.post("/change-password", isAuthenticated, updateUserPassword );
router.get("/shipping-addresses", isAuthenticated, getUserAddresses);
router.post("/add-address", isAuthenticated, addUserAddress);
router.delete("/delete-address/:addressId", isAuthenticated, deleteUserAddress);
router.get("/notifications", isAuthenticated, getNotifications);
router.put("/notifications/:notificationId/read", isAuthenticated, markNotificationAsRead);
export default router;