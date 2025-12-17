import { NextFunction, Response  } from "express";
import jwt from "jsonwebtoken";
import prisma from "@packages/libs/prisma";

const isAuthenticated = async (req:any, res:Response, next: NextFunction ) => {
  try {
    // Safely access cookies - check if req.cookies exists
    const cookies = req.cookies || {};
    const tokensToTry = [
      cookies["accessToken"],          // user token (prefer first for User UI)
      cookies["seller-access-token"],  // seller token
      cookies["admin-access-token"],   // admin token
      req.headers.authorization?.split(" ")[1], // bearer token
    ].filter(Boolean) as string[];

    console.log("Middleware Token check:", { 
      cookies, 
      tokenFound: tokensToTry.length > 0, 
      hasCookies: !!req.cookies 
    });
    
    if (tokensToTry.length === 0) {
      return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
    }

    // Try each token until one verifies successfully
    let decoded:any = null;
    let lastJwtError:any = null;

    for (const token of tokensToTry) {
      try {
        decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as {id: string, role: "user" | "seller" | "admin"};
        if (decoded) break;
      } catch (jwtError: any) {
        lastJwtError = jwtError;
        // Continue to next token if available (helps when stale seller token exists but user token is valid)
        continue;
      }
    }

    // If still not decoded after trying all tokens, respond with the last JWT error details
    if(!decoded) {
      if (lastJwtError?.name === 'TokenExpiredError') {
        console.error("Token expired:", lastJwtError.expiredAt);
        return res.status(401).json({ 
          success: false, 
          message: "Unauthorized: Token expired",
          error: "TokenExpiredError",
          expiredAt: lastJwtError.expiredAt
        });
      } else if (lastJwtError?.name === 'JsonWebTokenError') {
        console.error("Invalid token:", lastJwtError.message);
        return res.status(401).json({ 
          success: false, 
          message: "Unauthorized: Invalid token",
          error: "JsonWebTokenError"
        });
      }

      console.error("JWT verification error:", lastJwtError);
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized: Token verification failed",
        error: lastJwtError?.name || "UnknownError"
      });
    }

    let account;

    if (decoded.role === "user") {
      account = await prisma.users.findUnique({ where: { id: decoded.id } });
      req.user = account;;

    } else if (decoded.role === "seller") {
      account = await prisma.sellers.findUnique({ where: { id: decoded.id }, include: { shops: true } });
      req.seller = account;
    } else if (decoded.role === "admin") {
      account = await prisma.admins.findUnique({ where: { id: decoded.id } });
      req.admin = account;
      req.user = account; // Also set as user for compatibility with getAdmin
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