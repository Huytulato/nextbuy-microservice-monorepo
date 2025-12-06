import { NextFunction, Response  } from "express";
import jwt from "jsonwebtoken";
import prisma from "@packages/libs/prisma";

const isAuthenticated = async (req:any, res:Response, next: NextFunction ) => {
  try {
    // Safely access cookies - check if req.cookies exists
    const cookies = req.cookies || {};
    const token = 
        cookies["seller-access-token"] || 
        cookies["accessToken"] ||          
        req.headers.authorization?.split(" ")[1];
    
    console.log("Middleware Token check:", { cookies, tokenFound: !!token, hasCookies: !!req.cookies });
    
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
    }

    //verify token
    let decoded:any;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as {id: string, role: "user" | "seller"};
    } catch (jwtError: any) {
      // Log specific JWT errors for debugging
      if (jwtError.name === 'TokenExpiredError') {
        console.error("Token expired:", jwtError.expiredAt);
        return res.status(401).json({ 
          success: false, 
          message: "Unauthorized: Token expired",
          error: "TokenExpiredError",
          expiredAt: jwtError.expiredAt
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        console.error("Invalid token:", jwtError.message);
        return res.status(401).json({ 
          success: false, 
          message: "Unauthorized: Invalid token",
          error: "JsonWebTokenError"
        });
      } else {
        console.error("JWT verification error:", jwtError);
        return res.status(401).json({ 
          success: false, 
          message: "Unauthorized: Token verification failed",
          error: jwtError.name || "UnknownError"
        });
      }
    }

    if(!decoded) {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
    }

    let account;

    if (decoded.role === "user") {
      account = await prisma.users.findUnique({ where: { id: decoded.id } });
      req.user = account;;

    } else if (decoded.role === "seller") {
      account = await prisma.sellers.findUnique({ where: { id: decoded.id }, include: { shops: true } });
      req.seller = account;
    } 

    console.log("Account lookup result:", { 
      found: !!account, 
      role: decoded.role, 
      id: decoded.id,
      accountId: account?.id 
    });

    if (!account) {
      console.error("Account not found in database for id:", decoded.id);
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    req.role = decoded.role;
    console.log("Middleware Role set:", req.role, "Calling next()...");

    return next();
  } catch (error: any) {
    console.error("Authentication middleware error:", error);
    return res.status(401).json({ 
      success: false, 
      message: "Unauthorized: Authentication failed", 
      error: error?.message || "Unknown error"
    });
  }
}

export default isAuthenticated;