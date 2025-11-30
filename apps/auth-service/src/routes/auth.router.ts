import express, { Router } from "express"; // import routing from express to define API endpoints
import { userRegistration, verifyUser, loginUser, forgotPassword, resetPassword, verifyUserForgotPasswordOtp, refreshUserTokens, getUser } from "../controller/auth.controller"; // import the user registration controller function to handle user registration logic
import isAuthenticated from "@packages/middleware/isAuthenticated"; // import authentication middleware to protect routes

const router: Router = express.Router(); // create a new router instance
router.post("/user-registration", userRegistration); // define a POST route for user registration that uses the userRegistration controller function
router.post("/verify-user", verifyUser); // define a POST route for user verification that uses the verifyUser controller function
router.post("/login-user", loginUser); // define a POST route for user login that uses the loginUser controller function
router.post("/refresh-token", refreshUserTokens); // define a POST route for refreshing tokens that uses the refreshUserTokens controller function
router.get("/logged-in-user", isAuthenticated, getUser); // define a GET route for getting logged in user that uses the getUser controller function
router.post("/forgot-password", forgotPassword); // define a POST route for user forgot password that uses the forgotPassword controller function
router.post("/verify-forgot-password-otp", verifyUserForgotPasswordOtp); // define a POST route for verifying forgot password OTP that uses the verifyUserForgotPasswordOtp controller function
router.post("/reset-password", resetPassword); // define a POST route for user reset password that uses the resetPassword controller function
export default router;