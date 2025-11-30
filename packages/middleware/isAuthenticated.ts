import { NextFunction, Response  } from "express";
import jwt from "jsonwebtoken";
import prisma from "@packages/libs/prisma";

const isAuthenticated = async (req:any, res:Response, next: NextFunction ) => {
  try {
    const token = req.cookies.accessToken || req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
    }

    //verify token
    const decoded:any = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as {id: string, role: "user" | "seller"};

    if(!decoded) {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
    }

    const account = await prisma.users.findUnique({ where: { id: decoded.id } });

    req.user = account; // attach user info to request object

    if (!account) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
  }
}

export default isAuthenticated;