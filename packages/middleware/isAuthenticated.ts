import { NextFunction, Response, Request } from "express";
import jwt from "jsonwebtoken";
import prisma from "@packages/libs/prisma";

// Định nghĩa kiểu dữ liệu mở rộng cho Request
export interface AuthRequest extends Request {
  user?: any;
  seller?: any;
  admin?: any;
  role?: string;
}

/**
 * Helper: Xác thực JWT và lấy dữ liệu tài khoản
 */
const verifyAndLoadAccount = async (token: string, expectedRole?: "user" | "seller" | "admin") => {
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as { id: string, role: string };
    
    // Nếu có yêu cầu role cụ thể mà token không khớp thì loại bỏ
    if (expectedRole && decoded.role !== expectedRole) return null;

    let account = null;
    if (decoded.role === "user") {
      account = await prisma.users.findUnique({ where: { id: decoded.id } });
    } else if (decoded.role === "seller") {
      account = await prisma.sellers.findUnique({ 
        where: { id: decoded.id }, 
        include: { shops: true } 
      });
    } else if (decoded.role === "admin") {
      account = await prisma.admins.findUnique({ where: { id: decoded.id } });
    }

    return account ? { account, role: decoded.role } : null;
  } catch (error) {
    return null;
  }
};

/**
 * 1. Middleware chung cho mọi User đã đăng nhập
 * Hỗ trợ cả user, seller, và admin tokens
 */
export const isAuthenticated = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Tìm token từ nhiều nguồn: cookies (user/seller/admin) hoặc authorization header
    const token = req.cookies["accessToken"] 
      || req.cookies["seller-access-token"] 
      || req.cookies["admin-access-token"]
      || req.headers.authorization?.split(" ")[1];
    
    if (!token) return res.status(401).json({ success: false, message: "Vui lòng đăng nhập" });

    // Verify token và load account dựa trên role trong token (không yêu cầu role cụ thể)
    const result = await verifyAndLoadAccount(token);
    if (!result) return res.status(401).json({ success: false, message: "Phiên làm việc không hợp lệ" });

    // Set account vào request object tùy theo role
    if (result.role === "user") {
      req.user = result.account;
    } else if (result.role === "seller") {
      req.seller = result.account;
    } else if (result.role === "admin") {
      req.admin = result.account;
    }
    
    req.role = result.role;
    return next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 2. Middleware dành riêng cho SELLER
 */
export const isSeller = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Kiểm tra nếu isAuthenticated đã xác thực rồi
    if (req.role === "seller" && req.seller) {
      return next();
    }

    // 2. Nếu chưa (hoặc gọi độc lập), lấy token linh hoạt hơn
    const token = req.cookies["seller-access-token"] 
               || req.cookies["accessToken"]  // Thêm dòng này
               || req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ success: false, message: "Cần quyền Seller (Không tìm thấy token)" });
    }

    const result = await verifyAndLoadAccount(token, "seller");
    if (!result) {
        return res.status(403).json({ success: false, message: "Không có quyền Seller" });
    }

    req.seller = result.account;
    req.role = result.role;
    return next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
/**
 * 3. Middleware dành riêng cho ADMIN
 */
export const isAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Nếu đã được authenticate bởi isAuthenticated và là admin, skip verification
    if (req.admin && req.role === "admin") {
      return next();
    }

    const token = req.cookies["admin-access-token"] || req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ success: false, message: "Cần quyền Admin" });

    const result = await verifyAndLoadAccount(token, "admin");
    if (!result) return res.status(403).json({ success: false, message: "Không có quyền Admin" });

    req.admin = result.account;
    req.role = result.role;
    return next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};