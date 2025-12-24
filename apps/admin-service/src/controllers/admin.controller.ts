import prisma from '@packages/libs/prisma';
import { Response, NextFunction, Request } from 'express';
import { publishNotificationEvent } from '@packages/utils/kafka/producer';

// get all products
export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const   page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const [products, totalProducts] = await Promise.all([
      prisma.products.findMany({
      where: {
        isDeleted: false,
        status: 'active',
        starting_date: { lte: new Date() },
        ending_date: { gte: new Date() },
      },
      skip,
      take: limit,
      include: {
        images: true,
        shops: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.products.count({
      where: {
        isDeleted: false,
        status: 'active',
        starting_date: { lte: new Date() },
        ending_date: { gte: new Date() },
      },
    }),
  ]);
    return res.status(200).json({ products, totalProducts });
  } catch (error) {
    return next(error);
  }
}

// get all events
export const getAllEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await prisma.products.findMany({
      where: {
        isDeleted: false,
        status: 'active',
      },
    });
    return res.status(200).json({ events });
  } catch (error) {
    return next(error);
  }
}

// get all admins
export const getAllAdmins = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const admins = await prisma.users.findMany({
      where: {
        role: "admin",
      },
    });

    res.status(201).json({
      success: true,
      admins,
    });
  } catch (error) {
    next(error);
  }
};

// add new admin
export const addNewAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;
    const admin = await prisma.users.create({
      data: { name, email, password, role: "admin" },
    });
    return res.status(201).json({ admin });
  } catch (error) {
    return next(error);
  }
} 

// fetch all customization
export const fetchAllCustomizations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customizations = await prisma.products.findMany({
      where: {
        isDeleted: false,
        status: 'active',
      },
    });
    return res.status(200).json({ customizations });
  } catch (error) {
    return next(error);
  }
} 

// get all sellers
export const getAllSellers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sellers = await prisma.sellers.findMany({
      where: {
        verificationStatus: "APPROVED",
      },
    });
    return res.status(200).json({ sellers });
  } catch (error) {
    return next(error);
  }
} 

// get all users
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.users.findMany();
    return res.status(200).json({ users });
  } catch (error) {
    return next(error);
  }
}

// approve seller
export const approveSeller = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { sellerId } = req.params;
    const { adminNotes } = req.body;
    const adminId = req.admin?.id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Admin not authenticated' });
    }

    const seller = await prisma.sellers.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    const now = new Date();
    const updatedSeller = await prisma.sellers.update({
      where: { id: sellerId },
      data: {
        verificationStatus: 'APPROVED',
        reviewedBy: adminId,
        reviewedAt: now,
        verifiedAt: now,
        adminNotes: adminNotes || null,
      },
    });

    // Create verification history entry
    await prisma.seller_verification_history.create({
      data: {
        sellerId,
        status: 'APPROVED',
        reviewedBy: adminId,
        notes: adminNotes,
        documents: seller.documents,
      },
    });

    // Publish notification event for seller
    await publishNotificationEvent({
      title: "✅ Seller Verification Approved",
      message: "Congratulations! Your seller verification has been approved. You can now start selling on NextBuy!",
      creatorId: adminId,
      receiverId: sellerId,
      redirect_link: "/dashboard",
    });

    return res.status(200).json({
      success: true,
      message: 'Seller approved successfully',
      seller: updatedSeller,
    });
  } catch (error) {
    return next(error);
  }
}

// reject seller
export const rejectSeller = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { sellerId } = req.params;
    const { rejectionReason, adminNotes } = req.body;
    const adminId = req.admin?.id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Admin not authenticated' });
    }

    if (!rejectionReason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const seller = await prisma.sellers.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    const now = new Date();
    const updatedSeller = await prisma.sellers.update({
      where: { id: sellerId },
      data: {
        verificationStatus: 'REJECTED',
        reviewedBy: adminId,
        reviewedAt: now,
        rejectionReason,
        adminNotes: adminNotes || null,
      },
    });

    // Create verification history entry
    await prisma.seller_verification_history.create({
      data: {
        sellerId,
        status: 'REJECTED',
        reviewedBy: adminId,
        notes: adminNotes,
        documents: seller.documents,
      },
    });

    // Publish notification event for seller
    await publishNotificationEvent({
      title: "❌ Seller Verification Rejected",
      message: `Your seller verification was rejected. Reason: ${rejectionReason}. Please fix the issues and resubmit your documents.`,
      creatorId: adminId,
      receiverId: sellerId,
      redirect_link: "/signup?step=2",
    });

    return res.status(200).json({
      success: true,
      message: 'Seller rejected',
      seller: updatedSeller,
    });
  } catch (error) {
    return next(error);
  }
}

// approve product
export const approveProduct = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { adminNotes } = req.body;
    const adminId = req.admin?.id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Admin not authenticated' });
    }

    const product = await prisma.products.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const now = new Date();
    const updatedProduct = await prisma.products.update({
      where: { id: productId },
      data: {
        status: 'active',
        reviewedBy: adminId,
        reviewedAt: now,
        lastReviewedAt: now,
        requiresReReview: false,
        adminNotes: adminNotes || null,
      },
    });

    // Create product history entry
    await prisma.product_history.create({
      data: {
        productId,
        changedBy: adminId,
        changeType: 'moderation_approve',
        changes: {
          action: 'approved',
          status: 'active',
        },
        reason: adminNotes || null,
      },
    });

    // Get seller info to send notification
    const shop = await prisma.shops.findUnique({
      where: { id: product.shopId },
      include: { sellers: true },
    });

    if (shop?.sellers) {
      await publishNotificationEvent({
        title: "✅ Product Approved",
        message: `Your product "${product.title}" has been approved and is now live on NextBuy!`,
        creatorId: adminId,
        receiverId: shop.sellers.id,
        redirect_link: `/dashboard/products`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product approved successfully',
      product: updatedProduct,
    });
  } catch (error) {
    return next(error);
  }
}

// reject product
export const rejectProduct = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { rejectionReason, adminNotes } = req.body;
    const adminId = req.admin?.id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Admin not authenticated' });
    }

    if (!rejectionReason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const product = await prisma.products.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const now = new Date();
    const updatedProduct = await prisma.products.update({
      where: { id: productId },
      data: {
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: now,
        lastReviewedAt: now,
        rejectionReason,
        adminNotes: adminNotes || null,
      },
    });

    // Create product history entry
    await prisma.product_history.create({
      data: {
        productId,
        changedBy: adminId,
        changeType: 'moderation_reject',
        changes: {
          action: 'rejected',
          status: 'rejected',
        },
        reason: rejectionReason,
      },
    });

    // Get seller info to send notification
    const shop = await prisma.shops.findUnique({
      where: { id: product.shopId },
      include: { sellers: true },
    });

    if (shop?.sellers) {
      await publishNotificationEvent({
        title: "❌ Product Rejected",
        message: `Your product "${product.title}" was rejected. Reason: ${rejectionReason}`,
        creatorId: adminId,
        receiverId: shop.sellers.id,
        redirect_link: `/dashboard/products`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product rejected',
      product: updatedProduct,
    });
  } catch (error) {
    return next(error);
  }
}

// get pending sellers (for admin review)
export const getPendingSellers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sellers = await prisma.sellers.findMany({
      where: {
        verificationStatus: 'PENDING',
      },
      orderBy: {
        submittedAt: 'asc',
      },
    });
    return res.status(200).json({ sellers });
  } catch (error) {
    return next(error);
  }
}

// get pending products (for admin review)
export const getPendingProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [products, totalProducts] = await Promise.all([
      prisma.products.findMany({
        where: {
          isDeleted: false,
          status: 'pending',
        },
        skip,
        take: limit,
        include: {
          images: true,
          shops: true,
        },
        orderBy: {
          submittedAt: 'asc',
        },
      }),
      prisma.products.count({
        where: {
          isDeleted: false,
          status: 'pending',
        },
      }),
    ]);

    return res.status(200).json({ products, totalProducts });
  } catch (error) {
    return next(error);
  }
} 