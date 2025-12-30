import { NextFunction, Request, Response} from "express"; // import types for request, response, and next function from express
import { validationRegistrationData, checkOtpRestrictions, trackOtpRequest, sendOtp, verifyOtp, handleForgotPassword, verifyForgotPasswordOtp } from "../utils/auth.help"; // import utility functions for validating registration data, checking OTP restrictions, tracking OTP requests, and sending OTPs
import { AuthError, ValidationError } from "@packages/error-handler"; // import custom validation error class from error handler package
import prisma from "@packages/libs/prisma"; // ORM for database interactions
import bcrypt from "bcryptjs"; // library for hashing passwords
import jwt from "jsonwebtoken"; // library for generating JSON Web Tokens
import { setCookie } from "../utils/cookies/setCookie"; 
import { sendLog } from "../utils/logger";


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

// Refresh tokens
export const refreshTokens = async (req:any,res:Response,next:NextFunction) => {
  try {
    const refreshToken = req.cookies["refreshToken"] || req.cookies["seller-refresh-token"] || req.cookies["admin-refresh-token"] || req.headers.authorization?.split(" ")[1];
    if (!refreshToken) {
      throw new ValidationError('Unauthorized: No refresh token provided');
    }
    // verify refresh token
    const decoded:any = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string) as {id: string, role: string};
    
    if (!decoded || !decoded.id || !decoded.role){
      throw new AuthError('Invalid token');
    }

    let account;
    if (decoded.role === "user") {
      account = await prisma.users.findUnique({ where: { id: decoded.id } });
    } else if (decoded.role === "seller") {
      account = await prisma.sellers.findUnique({ where: { id: decoded.id }, include: { shops: true } });
    } else if (decoded.role === "admin") {
      account = await prisma.admins.findUnique({ where: { id: decoded.id } });
    }

    if (!account) {
      throw new AuthError('Account not found');
    }

    // Generate new access and refresh tokens
    const newAccessToken = jwt.sign({id: decoded.id, role: decoded.role}, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({id: decoded.id, role: decoded.role}, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: '7d' });


    if (decoded.role === "user") {
      // store the new tokens in httpOnly secure cookies
      setCookie(res, "accessToken", newAccessToken);
      setCookie(res, "refreshToken", newRefreshToken);
    } else if (decoded.role === "seller") {
      // store the new tokens in httpOnly secure cookies
      setCookie(res, "seller-access-token", newAccessToken);
      setCookie(res, "seller-refresh-token", newRefreshToken);
    } else if (decoded.role === "admin") {
      // store the new tokens in httpOnly secure cookies
      setCookie(res, "admin-access-token", newAccessToken);
      setCookie(res, "admin-refresh-token", newRefreshToken);
    }

    req.role = decoded.role;

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

// Log out user
export const logOutUser = async (req:any,res:Response,next:NextFunction) => {
  try {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return next(error);
  }
};

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







// login seller
export const loginSeller = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ValidationError('Email and password are required'));
    };
    const seller = await prisma.sellers.findUnique({
      where: { email }
    }); 
    if (!seller) {
      return next(new ValidationError('Invalid email or password'));
    }
    // verify password
    const isMatch = await bcrypt.compare(password, seller.password!);
    if (!isMatch) {
      return next(new AuthError('Invalid email or password'));
    }
    res.clearCookie("seller-access-token");
    res.clearCookie("seller-refresh-token");


    // Generate access and refresh tokens
    const accessToken = jwt.sign({id: seller.id, role: "seller"}, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: '15m' });
    const refreshToken = jwt.sign({id: seller.id, role: "seller"}, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: '7d' });
    // store the refresh and access tokens in an httpOnly secure cookie
    setCookie(res, "seller-refresh-token", refreshToken);
    setCookie(res, "seller-access-token", accessToken);
    // send response
    res.status(200).json({
      success: true,
      message: "Login successful",
      seller: { id: seller.id, name: seller.name, email: seller.email },
      data: {
        accessToken,
        refreshToken
      }
    });
  }
    catch (error) {
    return next(error);
  }
};

// Get logged in seller
export const getSeller = async (req:any,res:Response,next:NextFunction) => {
  try {
    const seller = req.seller;
    res.status(200).json({
      success: true,
      seller,
    });
  } catch (error) {
    next(error);
  }
};

// Register admin (no OTP required)
export const registerAdmin = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return next(new ValidationError('Name, email, and password are required'));
    }

    // Check if admin already exists
    const existingAdmin = await prisma.admins.findUnique({
      where: { email }
    });

    if (existingAdmin) {
      return next(new ValidationError('Email already exists'));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const admin = await prisma.admins.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'admin'
      }
    });

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role }
    });
  } catch (error) {
    return next(error);
  }
};

// login admin
export const loginAdmin = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ValidationError('Email and password are required'));
    };
    const admin = await prisma.admins.findUnique({
      where: { email }
    }); 
    if (!admin) {
      return next(new ValidationError('Invalid email or password'));
    }
    // verify password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return next(new AuthError('Invalid email or password'));
    }
    res.clearCookie("admin-access-token");
    res.clearCookie("admin-refresh-token");

    // Generate access and refresh tokens
    const accessToken = jwt.sign({id: admin.id, role: "admin"}, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: '15m' });
    const refreshToken = jwt.sign({id: admin.id, role: "admin"}, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: '7d' });
    // store the refresh and access tokens in an httpOnly secure cookie
    setCookie(res, "admin-refresh-token", refreshToken);
    setCookie(res, "admin-access-token", accessToken);
    // send response
    res.status(200).json({
      success: true,
      message: "Login successful",
      admin: { id: admin.id, name: admin.name, email: admin.email },
      data: {
        accessToken,
        refreshToken
      }
    });
  }
    catch (error) {
    return next(error);
  }
};


// get logged in admin
export const getAdmin = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    await sendLog({
      type: "success",
      message: `Admin data retrieved ${user?.email}`,
      source: "auth-service",
    });

    res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// log out admin
export const logOutAdmin = async (req: any, res: Response) => {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");

  res.status(201).json({
    success: true,
  });
};

// Update user password
export const updateUserPassword = async (req:any,res:Response,next:NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AuthError('User not authenticated'));
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return next(new ValidationError('Old password and new password are required'));
    }

    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user || !user.password) {
      return next(new ValidationError('User not found'));
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return next(new AuthError('Invalid old password'));
    }

    // Check new password is different from old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return next(new ValidationError('New password must be different from the old password'));
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.users.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.status(200).json({
      success: true,
      message: "Password updated successfully"
    });

  } catch (error) {
    return next(error);
  }
};

// get user's address list
export const getUserAddresses = async (req:any,res:Response,next:NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AuthError('User not authenticated'));
    }

    const addresses = await prisma.shipping_addresses.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.status(200).json({
      success: true,
      addresses,
    });
  } catch (error) {
    return next(error);
  }
};

// Add user address
export const addUserAddress = async (req:any,res:Response,next:NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AuthError('User not authenticated'));
    }

    const { fullName, phone, address, city, province, postalCode, isDefault } = req.body;
    if (!fullName || !phone || !address || !city || !province || !postalCode) {
      return next(new ValidationError('Full name, phone, address, city, province, and postal code are required'));
    }

    // If this is set as default, unset other default addresses
    if (isDefault === true) {
      await prisma.shipping_addresses.updateMany({
        where: { 
          userId,
          isDefault: true
        },
        data: { isDefault: false }
      });
    }

    const newAddress = await prisma.shipping_addresses.create({
      data: {
        userId,
        fullName,
        phone,
        address,
        city,
        province,
        postalCode,
        isDefault: isDefault === true,
      }
    });

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      address: newAddress,
    });
  } catch (error) {
    return next(error);
  }
};

// Delete user address
export const deleteUserAddress = async (req:any,res:Response,next:NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AuthError('User not authenticated'));
    }

    const { addressId } = req.params;
    if (!addressId) {
      return next(new ValidationError('Address ID is required'));
    }

    // Verify address belongs to user
    const address = await prisma.shipping_addresses.findUnique({
      where: { id: addressId }
    });

    if (!address) {
      return next(new ValidationError('Address not found'));
    }

    if (address.userId !== userId) {
      return next(new AuthError('Unauthorized: Address does not belong to user'));
    }

    await prisma.shipping_addresses.delete({
      where: { id: addressId }
    });

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

// Get notifications for authenticated user/seller/admin
export const getNotifications = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.seller?.id || req.admin?.id;
    const role = req.user ? 'user' : req.seller ? 'seller' : 'admin';

    if (!userId) {
      return next(new AuthError('User not authenticated'));
    }

    const notifications = await prisma.notifications.findMany({
      where: { 
        receiverId: role === 'admin' ? 'admin' : userId 
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    return next(error);
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.seller?.id || req.admin?.id;
    const { notificationId } = req.params;

    if (!userId) {
      return next(new AuthError('User not authenticated'));
    }

    const notification = await prisma.notifications.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return next(new ValidationError('Notification not found'));
    }

    // Check if user owns this notification
    if (notification.receiverId !== userId && notification.receiverId !== 'admin') {
      return next(new AuthError('Unauthorized'));
    }

    await prisma.notifications.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    return next(error);
  }
};
