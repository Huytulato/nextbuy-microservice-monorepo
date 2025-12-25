import prisma from '@packages/libs/prisma';
import { Response, NextFunction, Request } from 'express';
import { publishNotificationEvent } from '@packages/utils/kafka/producer';
import { isStripeAccountFullyOnboarded } from '@packages/utils/stripeHelpers';

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

    // Validate bank connection: Seller phải có stripeId và đã hoàn tất onboarding
    if (!seller.stripeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot approve seller: Bank connection is required. Seller must complete bank account setup before approval.' 
      });
    }

    // Kiểm tra Stripe account đã hoàn tất onboarding chưa
    const isFullyOnboarded = await isStripeAccountFullyOnboarded(seller.stripeId);
    if (!isFullyOnboarded) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot approve seller: Bank account onboarding is not complete. Seller must finish the bank connection process before approval.' 
      });
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

// Bulk approve products
export const bulkApproveProducts = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productIds } = req.body;
    const adminId = req.admin?.id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Admin not authenticated' });
    }

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: 'productIds array is required' });
    }

    const now = new Date();
    const results = {
      successful: [] as string[],
      failed: [] as { productId: string; reason: string }[]
    };

    for (const productId of productIds) {
      try {
        const product = await prisma.products.findUnique({
          where: { id: productId },
          include: { shops: { include: { sellers: true } } }
        });

        if (!product) {
          results.failed.push({ productId, reason: 'Product not found' });
          continue;
        }

        if (product.status !== 'pending') {
          results.failed.push({ productId, reason: `Product status is ${product.status}, not pending` });
          continue;
        }

        // Update product
        await prisma.products.update({
          where: { id: productId },
          data: {
            status: 'active',
            reviewedBy: adminId,
            reviewedAt: now,
            lastReviewedAt: now,
            requiresReReview: false,
          },
        });

        // Create history
        await prisma.product_history.create({
          data: {
            productId,
            changedBy: adminId,
            changeType: 'moderation_approve',
            changes: { action: 'approved', status: 'active' },
          },
        });

        // Send notification
        if (product.shops?.sellers) {
          await publishNotificationEvent({
            title: "✅ Product Approved",
            message: `Your product "${product.title}" has been approved and is now live on NextBuy!`,
            creatorId: adminId,
            receiverId: product.shops.sellers.id,
            redirect_link: `/dashboard/products`,
          });
        }

        results.successful.push(productId);
      } catch (error: any) {
        results.failed.push({ productId, reason: error.message || 'Unknown error' });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Approved ${results.successful.length} of ${productIds.length} products`,
      results
    });
  } catch (error) {
    return next(error);
  }
};

// Bulk reject products
export const bulkRejectProducts = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productIds, rejectionReason, adminNotes } = req.body;
    const adminId = req.admin?.id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Admin not authenticated' });
    }

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: 'productIds array is required' });
    }

    if (!rejectionReason) {
      return res.status(400).json({ success: false, message: 'rejectionReason is required' });
    }

    const now = new Date();
    const results = {
      successful: [] as string[],
      failed: [] as { productId: string; reason: string }[]
    };

    for (const productId of productIds) {
      try {
        const product = await prisma.products.findUnique({
          where: { id: productId },
          include: { shops: { include: { sellers: true } } }
        });

        if (!product) {
          results.failed.push({ productId, reason: 'Product not found' });
          continue;
        }

        // Update product
        await prisma.products.update({
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

        // Create history
        await prisma.product_history.create({
          data: {
            productId,
            changedBy: adminId,
            changeType: 'moderation_reject',
            changes: { action: 'rejected', status: 'rejected' },
            reason: rejectionReason,
          },
        });

        // Send notification
        if (product.shops?.sellers) {
          await publishNotificationEvent({
            title: "❌ Product Rejected",
            message: `Your product "${product.title}" was rejected. Reason: ${rejectionReason}`,
            creatorId: adminId,
            receiverId: product.shops.sellers.id,
            redirect_link: `/dashboard/products`,
          });
        }

        results.successful.push(productId);
      } catch (error: any) {
        results.failed.push({ productId, reason: error.message || 'Unknown error' });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Rejected ${results.successful.length} of ${productIds.length} products`,
      results
    });
  } catch (error) {
    return next(error);
  }
};

// Get moderation analytics/statistics
export const getModerationAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { timeRange = '30' } = req.query; // days
    const daysAgo = parseInt(timeRange as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Product status counts
    const [
      totalProducts,
      activeProducts,
      pendingProducts,
      rejectedProducts,
      draftProducts,
      autoModeratedProducts,
      manuallyReviewedProducts,
      recentSubmissions,
      recentApprovals,
      recentRejections
    ] = await Promise.all([
      prisma.products.count({ where: { isDeleted: false } }),
      prisma.products.count({ where: { isDeleted: false, status: 'active' } }),
      prisma.products.count({ where: { isDeleted: false, status: 'pending' } }),
      prisma.products.count({ where: { isDeleted: false, status: 'rejected' } }),
      prisma.products.count({ where: { isDeleted: false, status: 'draft' } }),
      prisma.products.count({ where: { isDeleted: false, isAutoModerated: true } }),
      prisma.products.count({ 
        where: { 
          isDeleted: false, 
          reviewedBy: { not: null } 
        } 
      }),
      // Recent submissions (last N days)
      prisma.products.count({ 
        where: { 
          isDeleted: false,
          submittedAt: { gte: startDate }
        } 
      }),
      // Recent approvals
      prisma.products.count({ 
        where: { 
          isDeleted: false,
          status: 'active',
          reviewedAt: { gte: startDate }
        } 
      }),
      // Recent rejections
      prisma.products.count({ 
        where: { 
          isDeleted: false,
          status: 'rejected',
          reviewedAt: { gte: startDate }
        } 
      })
    ]);

    // Average moderation time (time from submission to review)
    const reviewedProducts = await prisma.products.findMany({
      where: {
        isDeleted: false,
        reviewedAt: { not: null, gte: startDate },
        submittedAt: { not: null }
      },
      select: {
        submittedAt: true,
        reviewedAt: true
      }
    });

    let avgModerationTimeHours = 0;
    if (reviewedProducts.length > 0) {
      const totalTime = reviewedProducts.reduce((sum, product) => {
        if (product.submittedAt && product.reviewedAt) {
          return sum + (product.reviewedAt.getTime() - product.submittedAt.getTime());
        }
        return sum;
      }, 0);
      avgModerationTimeHours = totalTime / reviewedProducts.length / (1000 * 60 * 60); // Convert to hours
    }

    // Top rejection reasons
    const rejectedWithReasons = await prisma.products.findMany({
      where: {
        isDeleted: false,
        status: 'rejected',
        rejectionReason: { not: null },
        reviewedAt: { gte: startDate }
      },
      select: { rejectionReason: true }
    });

    const reasonCounts: Record<string, number> = {};
    rejectedWithReasons.forEach(product => {
      if (product.rejectionReason) {
        reasonCounts[product.rejectionReason] = (reasonCounts[product.rejectionReason] || 0) + 1;
      }
    });

    const topRejectionReasons = Object.entries(reasonCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));

    // Daily submission/approval trend (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [submissions, approvals] = await Promise.all([
        prisma.products.count({
          where: {
            isDeleted: false,
            submittedAt: { gte: date, lt: nextDate }
          }
        }),
        prisma.products.count({
          where: {
            isDeleted: false,
            status: 'active',
            reviewedAt: { gte: date, lt: nextDate }
          }
        })
      ]);

      last7Days.push({
        date: date.toISOString().split('T')[0],
        submissions,
        approvals
      });
    }

    // Auto-moderation effectiveness
    const autoApprovalRate = autoModeratedProducts > 0
      ? ((autoModeratedProducts / totalProducts) * 100).toFixed(2)
      : 0;

    return res.status(200).json({
      success: true,
      analytics: {
        overview: {
          totalProducts,
          activeProducts,
          pendingProducts,
          rejectedProducts,
          draftProducts,
          autoModeratedProducts,
          manuallyReviewedProducts
        },
        recentActivity: {
          timeRange: `Last ${daysAgo} days`,
          submissions: recentSubmissions,
          approvals: recentApprovals,
          rejections: recentRejections
        },
        performance: {
          avgModerationTimeHours: avgModerationTimeHours.toFixed(2),
          autoApprovalRate: `${autoApprovalRate}%`,
          approvalRate: totalProducts > 0 
            ? `${((activeProducts / totalProducts) * 100).toFixed(2)}%`
            : '0%'
        },
        trends: {
          last7Days
        },
        topRejectionReasons
      }
    });
  } catch (error) {
    return next(error);
  }
};

// get pending sellers (for admin review)
export const getPendingSellers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Lấy tất cả sellers có status PENDING và đã có stripeId
    const allPendingSellers = await prisma.sellers.findMany({
      where: {
        verificationStatus: 'PENDING',
        stripeId: {
          not: null,
        },
      },
      orderBy: {
        submittedAt: 'asc',
      },
    });

    // Kiểm tra từng seller xem Stripe account đã hoàn tất onboarding chưa
    const sellersWithBankConnection = await Promise.all(
      allPendingSellers.map(async (seller) => {
        if (!seller.stripeId) {
          return null;
        }
        
        const isFullyOnboarded = await isStripeAccountFullyOnboarded(seller.stripeId);
        
        // Chỉ trả về sellers đã hoàn tất cả tài liệu VÀ bank connection
        return isFullyOnboarded ? seller : null;
      })
    );

    // Lọc bỏ các null values
    const validSellers = sellersWithBankConnection.filter(
      (seller): seller is typeof allPendingSellers[0] => seller !== null
    );

    return res.status(200).json({ sellers: validSellers });
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

// Get moderation configuration
export const getModerationConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let config = await prisma.moderation_config.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    // If no config exists, create default one
    if (!config) {
      config = await prisma.moderation_config.create({
        data: {
          bannedKeywords: [
            'weapon', 'weapons', 'gun', 'guns', 'knife', 'knives',
            'drug', 'drugs', 'cocaine', 'heroin', 'marijuana',
            'counterfeit', 'fake', 'replica',
            'adult', 'porn', 'pornography', 'xxx',
            'wildlife', 'ivory', 'endangered',
            'illegal', 'stolen', 'hacked'
          ],
          sensitiveCategories: [
            'cosmetics', 'health supplements', 'pharmaceuticals',
            'food', 'luxury goods', 'electronics', 'jewelry'
          ],
          autoApproveThreshold: 90
        }
      });
    }

    return res.status(200).json({ config });
  } catch (error) {
    return next(error);
  }
};

// Update moderation configuration
export const updateModerationConfig = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { bannedKeywords, sensitiveCategories, autoApproveThreshold } = req.body;

    // Validation
    if (!Array.isArray(bannedKeywords) || !Array.isArray(sensitiveCategories)) {
      return res.status(400).json({ 
        message: 'bannedKeywords and sensitiveCategories must be arrays' 
      });
    }

    if (autoApproveThreshold < 0 || autoApproveThreshold > 100) {
      return res.status(400).json({ 
        message: 'autoApproveThreshold must be between 0 and 100' 
      });
    }

    // Clean and normalize keywords (lowercase, trim)
    const cleanedKeywords = bannedKeywords
      .map((kw: string) => kw.trim().toLowerCase())
      .filter((kw: string) => kw.length > 0);

    const cleanedCategories = sensitiveCategories
      .map((cat: string) => cat.trim().toLowerCase())
      .filter((cat: string) => cat.length > 0);

    // Get existing config
    const existingConfig = await prisma.moderation_config.findFirst();

    let config;
    if (existingConfig) {
      // Update existing
      config = await prisma.moderation_config.update({
        where: { id: existingConfig.id },
        data: {
          bannedKeywords: cleanedKeywords,
          sensitiveCategories: cleanedCategories,
          autoApproveThreshold,
          updatedBy: req.admin?.id || req.user?.id,
        }
      });
    } else {
      // Create new
      config = await prisma.moderation_config.create({
        data: {
          bannedKeywords: cleanedKeywords,
          sensitiveCategories: cleanedCategories,
          autoApproveThreshold,
          updatedBy: req.admin?.id || req.user?.id,
        }
      });
    }

    return res.status(200).json({ 
      success: true,
      config,
      message: 'Moderation configuration updated successfully'
    });
  } catch (error) {
    return next(error);
  }
};

// Add banned keyword
export const addBannedKeyword = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { keyword } = req.body;

    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({ message: 'Keyword is required and must be a string' });
    }

    const cleanedKeyword = keyword.trim().toLowerCase();
    if (!cleanedKeyword) {
      return res.status(400).json({ message: 'Keyword cannot be empty' });
    }

    const config = await prisma.moderation_config.findFirst();
    
    if (!config) {
      return res.status(404).json({ message: 'Moderation config not found. Please initialize config first.' });
    }

    // Check if keyword already exists
    if (config.bannedKeywords.includes(cleanedKeyword)) {
      return res.status(400).json({ message: 'Keyword already exists in banned list' });
    }

    // Add keyword
    const updatedConfig = await prisma.moderation_config.update({
      where: { id: config.id },
      data: {
        bannedKeywords: [...config.bannedKeywords, cleanedKeyword],
        updatedBy: req.admin?.id || req.user?.id,
      }
    });

    return res.status(200).json({ 
      success: true,
      config: updatedConfig,
      message: `Banned keyword "${cleanedKeyword}" added successfully`
    });
  } catch (error) {
    return next(error);
  }
};

// Remove banned keyword
export const removeBannedKeyword = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { keyword } = req.body;

    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({ message: 'Keyword is required and must be a string' });
    }

    const cleanedKeyword = keyword.trim().toLowerCase();

    const config = await prisma.moderation_config.findFirst();
    
    if (!config) {
      return res.status(404).json({ message: 'Moderation config not found' });
    }

    // Remove keyword
    const updatedKeywords = config.bannedKeywords.filter(kw => kw !== cleanedKeyword);

    if (updatedKeywords.length === config.bannedKeywords.length) {
      return res.status(404).json({ message: 'Keyword not found in banned list' });
    }

    const updatedConfig = await prisma.moderation_config.update({
      where: { id: config.id },
      data: {
        bannedKeywords: updatedKeywords,
        updatedBy: req.admin?.id || req.user?.id,
      }
    });

    return res.status(200).json({ 
      success: true,
      config: updatedConfig,
      message: `Banned keyword "${cleanedKeyword}" removed successfully`
    });
  } catch (error) {
    return next(error);
  }
};

// Add sensitive category
export const addSensitiveCategory = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { category } = req.body;

    if (!category || typeof category !== 'string') {
      return res.status(400).json({ message: 'Category is required and must be a string' });
    }

    const cleanedCategory = category.trim().toLowerCase();
    if (!cleanedCategory) {
      return res.status(400).json({ message: 'Category cannot be empty' });
    }

    const config = await prisma.moderation_config.findFirst();
    
    if (!config) {
      return res.status(404).json({ message: 'Moderation config not found. Please initialize config first.' });
    }

    // Check if category already exists
    if (config.sensitiveCategories.includes(cleanedCategory)) {
      return res.status(400).json({ message: 'Category already exists in sensitive list' });
    }

    // Add category
    const updatedConfig = await prisma.moderation_config.update({
      where: { id: config.id },
      data: {
        sensitiveCategories: [...config.sensitiveCategories, cleanedCategory],
        updatedBy: req.admin?.id || req.user?.id,
      }
    });

    return res.status(200).json({ 
      success: true,
      config: updatedConfig,
      message: `Sensitive category "${cleanedCategory}" added successfully`
    });
  } catch (error) {
    return next(error);
  }
};

// Remove sensitive category
export const removeSensitiveCategory = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { category } = req.body;

    if (!category || typeof category !== 'string') {
      return res.status(400).json({ message: 'Category is required and must be a string' });
    }

    const cleanedCategory = category.trim().toLowerCase();

    const config = await prisma.moderation_config.findFirst();
    
    if (!config) {
      return res.status(404).json({ message: 'Moderation config not found' });
    }

    // Remove category
    const updatedCategories = config.sensitiveCategories.filter(cat => cat !== cleanedCategory);

    if (updatedCategories.length === config.sensitiveCategories.length) {
      return res.status(404).json({ message: 'Category not found in sensitive list' });
    }

    const updatedConfig = await prisma.moderation_config.update({
      where: { id: config.id },
      data: {
        sensitiveCategories: updatedCategories,
        updatedBy: req.admin?.id || req.user?.id,
      }
    });

    return res.status(200).json({ 
      success: true,
      config: updatedConfig,
      message: `Sensitive category "${cleanedCategory}" removed successfully`
    });
  } catch (error) {
    return next(error);
  }
}; 