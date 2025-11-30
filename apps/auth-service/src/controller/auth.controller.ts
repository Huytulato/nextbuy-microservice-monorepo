import { NextFunction, Request, Response} from "express"; // import types for request, response, and next function from express
import { validationRegistrationData, checkOtpRestrictions, trackOtpRequest, sendOtp, verifyOtp, handleForgotPassword, verifyForgotPasswordOtp } from "../utils/auth.help"; // import utility functions for validating registration data, checking OTP restrictions, tracking OTP requests, and sending OTPs
import { AuthError, ValidationError } from "@packages/error-handler"; // import custom validation error class from error handler package
import prisma from "@packages/libs/prisma"; // ORM for database interactions
import bcrypt from "bcryptjs"; // library for hashing passwords
import jwt from "jsonwebtoken"; // library for generating JSON Web Tokens
import { setCookie } from "../utils/cookies/setCookie"; 


// Register a new user
export const userRegistration = async (req:Request,res:Response,next:NextFunction) => {
  try {
    validationRegistrationData(req.body, "user");
    const {name, email} = req.body;

    const existingUser = await prisma.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      return next(new ValidationError('Email already exists'));
    }; // check if the email is already registered

    await checkOtpRestrictions(email, next); // check if the user has exceeded OTP request limits
    await trackOtpRequest(email, next); // track the OTP request for rate limiting
    await sendOtp(name, email, "user-activation-email"); // send the OTP to the user's email

    res.status(200).json({message: "OTP sent to your email!. Please verify to complete registration."});
  } catch (error) {
    return next(error); // pass any errors to the next middleware (error handler)
  }
}

// Verify user with OTP
export const verifyUser = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const { email, otp, password, name } = req.body;
    if (!email || !otp || !password || !name) {
      return next(new ValidationError('Email, OTP, password, and name are required'));
    }
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      return next(new ValidationError('Email already exists'));
    };

    await verifyOtp(email, otp, next); // verify the provided OTP
    const hashedPassword = await bcrypt.hash(password, 10); // hash the user's password

    await prisma.users.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    }); 
    res.status(201).json({ 
      success: true,
      message: "User registered successfully", 
    });
  } catch (error) {
    return next(error);
  }
};

// Login user 
export const loginUser = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ValidationError('Email and password are required'));
    };
    const user = await prisma.users.findUnique({
      where: { email }
    });

    if (!user) {
      return next(new ValidationError('User not found'));
    }

    // verify password
    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) {
      return next(new AuthError('Invalid email or password'));
    }

    // Generate access and refresh tokens (implementation not shown here)
    const accessToken = jwt.sign({id: user.id, role: "user"}, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: '15m' });
    const refreshToken = jwt.sign({id: user.id, role: "user"}, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: '7d' });

    // store the refresh and access tokens in an httpOnly secure cookie
    setCookie(res, "refreshToken", refreshToken);
    setCookie(res, "accessToken", accessToken);

    // send response
    res.status(200).json({
      success: true,
      message: "Login successful",
      user: { id: user.id, name: user.name, email: user.email },
      data: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    return next(error);
  }
};

// Refresh user tokens
export const refreshUserTokens = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      throw new ValidationError('Unauthorized: No refresh token provided');
    }

    // verify refresh token
    const decoded:any = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string) as {id: string, role: string};
    
    if (!decoded || !decoded.id || !decoded.role){
      throw new AuthError('Invalid token');
    }

    const user = await prisma.users.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return next(new AuthError('User not found'));
    } 

    // Generate new access and refresh tokens
    const newAccessToken = jwt.sign({id: user.id, role: "user"}, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({id: user.id, role: "user"}, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: '7d' });

    // store the new tokens in httpOnly secure cookies
    setCookie(res, "refreshToken", newRefreshToken);
    setCookie(res, "accessToken", newAccessToken);
    // send response
    res.status(201).json({
      success: true,
      message: "Tokens refreshed successfully",
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    return next(error);
  }
};

// Get logged in user 
export const getUser = async (req:any,res:Response,next:NextFunction) => {
  try {
    const user = req.user;
    res.status(201).json({
      success: true,
      user,
    });

  } catch (error) {
    next(error);
  }
}

// user forgot password
export const forgotPassword = async (req:Request,res:Response,next:NextFunction) => {
  await handleForgotPassword(req, res, next, "user");
};

// Verify OTP for password reset
export const verifyUserForgotPasswordOtp = async (req:Request,res:Response,next:NextFunction) => {
  await verifyForgotPasswordOtp(req, res, next);
};

// Reset user password
export const resetPassword = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return next(new ValidationError('Email and new password are required'));
    }
    const user = await prisma.users.findUnique({
      where: { email }
    });

    if (!user) {
      return next(new ValidationError('User not found'));
    }

    // compare new password with old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password!);

    if (isSamePassword) {
      return next(new ValidationError('New password must be different from the old password'));
    };

    // hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.users.update({
      where: { email },
      data: { password: hashedPassword }
    });

    res.status(200).json({
      success: true,
      message: "Password reset successfully"
    });

  } catch (error) {
    return next(error);
  }
};

// Register a new seller
export const registerSeller = async (req:Request,res:Response,next:NextFunction) => {
  try {
    validationRegistrationData(req.body, "seller");
    const {name, email} = req.body;
    const existingSeller = await prisma.sellers.findUnique({
      where: { email }
    });

    if (existingSeller) {
      return next(new ValidationError('Email already exists'));
    }; // check if the email is already registered

    await checkOtpRestrictions(email, next); // check if the user has exceeded OTP request limits
    await trackOtpRequest(email, next);
    await sendOtp(name, email, "seller-activation-email"); // send the OTP to the seller's email
    res.status(200).json({message: "OTP sent to your email!. Please verify to complete registration."});
  } catch (error) {
    next(error); // pass any errors to the next middleware (error handler)
  } 
};

// Verify seller with OTP
export const verifySeller = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const { email, otp, password, name, phone_number, country } = req.body;
    if (!email || !otp || !password || !name || !phone_number || !country) {
      return next(new ValidationError('Email, OTP, password, name, phone number, and country are required'));
    }
    const existingSeller = await prisma.sellers.findUnique({
      where: { email }
    });
    if (existingSeller) {
      return next(new ValidationError('Email already exists'));
    };

    await verifyOtp(email, otp, next); // verify the provided OTP
    const hashedPassword = await bcrypt.hash(password, 10); // hash the seller's password
    const seller =await prisma.sellers.create({
      data: {
        name,
        email,
        password: hashedPassword,
        country,
        phone_number,
      }, 
    });
    res.status(201).json({
      success: true,
      data: seller,
      message: "Seller registered successfully",
    });
  } catch (error) {
    next(error);
  }
};

// create a new shop for seller
export const createSellerShop = async (req:any,res:Response,next:NextFunction) => {
  try {
    const { name, bio, category, address, opening_hours, website, sellerId} = req.body;
    if (!name || !bio || !category || !address || !opening_hours || !sellerId) {
      return next(new ValidationError('Name, bio, category, address, and opening hours are required'));
    }

    const shopData = {
      name,
      bio,
      category,
      address,
      opening_hours,
      website,
      sellerId,
    };

    if (website && website.trim() !== '') {
      shopData.website = website;
    }

    const shop = await prisma.shops.create({
      data: shopData
    });

    res.status(201).json({
      success: true,
      data: shop,
      message: "Shop created successfully",
    });
  } catch (error) {
    next(error);
  }
};

// create stripe connect account link
