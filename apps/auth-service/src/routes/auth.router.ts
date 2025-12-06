import express, { Router } from "express"; // import routing from express to define API endpoints
import { userRegistration, verifyUser, loginUser, forgotPassword, resetPassword, verifyUserForgotPasswordOtp, refreshTokens, getUser, verifySeller, registerSeller, createSellerShop, createStripeConnectLink, loginSeller, getSeller } from "../controller/auth.controller"; // import the user registration controller function to handle user registration logic
import isAuthenticated from "@packages/middleware/isAuthenticated"; // import authentication middleware to protect routes
import { isSeller } from "@packages/middleware/authorizeRoles";

const router: Router = express.Router(); // create a new router instance
router.post("/user-registration", userRegistration); // define a POST route for user registration that uses the userRegistration controller function
router.post("/verify-user", verifyUser); // define a POST route for user verification that uses the verifyUser controller function
router.post("/login-user", loginUser); // define a POST route for user login that uses the loginUser controller function
router.post("/refresh-token", refreshTokens); // define a POST route for refreshing tokens that uses the refreshTokens controller function
router.get("/logged-in-user", isAuthenticated, getUser); // define a GET route for getting logged in user that uses the getUser controller function
router.post("/forgot-password", forgotPassword); // define a POST route for user forgot password that uses the forgotPassword controller function
router.post("/verify-forgot-password-otp", verifyUserForgotPasswordOtp); // define a POST route for verifying forgot password OTP that uses the verifyUserForgotPasswordOtp controller function
router.post("/reset-password", resetPassword); // define a POST route for user reset password that uses the resetPassword controller function
router.post("/seller-registration", registerSeller); // define a POST route for seller registration that uses the registerSeller controller function
router.post("/create-shop", createSellerShop); // define a POST route for creating a seller shop that uses the createSellerShop controller function
router.post("/verify-seller", verifySeller); // define a POST route for verifying seller that uses the verifySeller controller function
router.post("/create-stripe-account", createStripeConnectLink); // define a POST route for creating a stripe connect link that uses the createStripeConnectLink controller function
router.post("/login-seller", loginSeller); // define a POST route for seller login that uses the loginSeller controller function
router.get("/logged-in-seller", isAuthenticated, isSeller, getSeller); // define a GET route for getting logged in seller that uses the getSeller controller function
export default router;