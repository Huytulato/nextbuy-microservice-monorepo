import { NextFunction, Request, Response } from "express";
import { AuthError, ValidationError, NotFoundError } from "@packages/error-handler";
import prisma from "@packages/libs/prisma";
import Stripe from "stripe";
import { publishNotificationEvent } from '@packages/utils/kafka/producer';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover' as any,                 
});

// create a new shop for seller
export const createSellerShop = async (req:any,res:Response,next:NextFunction) => {
  try {
    const { name, bio, category, address, opening_hours, website, sellerId} = req.body;
    if (!name || !bio || !category || !address || !opening_hours || !sellerId) {
      return next(new ValidationError('Name, bio, category, address, and opening hours are required'));
    }

    // Check if seller is approved
    const seller = await prisma.sellers.findUnique({
      where: { id: sellerId },
      select: { verificationStatus: true },
    });

    if (!seller) {
      return next(new ValidationError('Seller not found'));
    }

    if (seller.verificationStatus !== 'APPROVED') {
      return next(new ValidationError('Seller must be approved before creating a shop'));
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

// submit seller documents for verification
export const submitSellerDocuments = async (req: any, res: Response, next: NextFunction) => {
  try {
    const sellerId = req.seller?.id;
    const { documents } = req.body;

    if (!sellerId) {
      return next(new AuthError('Seller not authenticated'));
    }

    if (!documents) {
      return next(new ValidationError('Documents are required'));
    }

    const seller = await prisma.sellers.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      return next(new ValidationError('Seller not found'));
    }

    // If seller was rejected, increment resubmission count
    const resubmissionCount = seller.verificationStatus === 'REJECTED' 
      ? (seller.resubmissionCount || 0) + 1 
      : seller.resubmissionCount || 0;

    const updatedSeller = await prisma.sellers.update({
      where: { id: sellerId },
      data: {
        documents,
        verificationStatus: 'PENDING',
        submittedAt: new Date(),
        resubmissionCount,
        rejectionReason: null, // Clear previous rejection reason
      },
    });

    // Create verification history entry
    await prisma.seller_verification_history.create({
      data: {
        sellerId,
        status: 'PENDING',
        documents,
      },
    });

    // Publish notification event for admin
    await publishNotificationEvent({
      title: "📄 New Seller Documents Submitted",
      message: `Seller ${seller.name || seller.email} has submitted verification documents for review.`,
      creatorId: sellerId,
      receiverId: 'admin',
      redirect_link: `/dashboard/moderation/pending-sellers`,
    });

    res.status(200).json({
      success: true,
      message: 'Documents submitted successfully. Waiting for admin review.',
      seller: updatedSeller,
    });
  } catch (error) {
    next(error);
  }
};

// create stripe connect account link
export const createStripeConnectLink = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { sellerId } = req.body;
    if (!sellerId) {
      return next(new ValidationError('Seller ID is required'));
    }

    const seller = await prisma.sellers.findUnique({
      where: { id: sellerId }
    });

    if (!seller) {
      return next(new ValidationError('Seller not found'));
    }

    let stripeAccountId = seller.stripeId;

    // BƯỚC 1: Nếu chưa có stripeId, tiến hành tạo mới
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: seller.email!,
        // Sử dụng country từ dữ liệu seller, nếu không có thì mặc định 'GB' hoặc 'VN'
        country: seller.country || 'GB', 
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      stripeAccountId = account.id;

      // Cập nhật stripeId vào database ngay sau khi tạo
      await prisma.sellers.update({
        where: { id: sellerId },
        data: { stripeId: stripeAccountId }
      });
    }

    // BƯỚC 2: Tạo Account Link (Onboarding)
    // Link này sẽ cho phép Seller điền nốt các mục "Actions Required" còn thiếu
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      // URL khi Seller nhấn "Back" hoặc link hết hạn
      refresh_url: `http://localhost:3000/onboarding-refresh?sellerId=${sellerId}`,
      // URL sau khi hoàn tất các bước trên Stripe
      return_url: `http://localhost:3000/success`, 
      type: 'account_onboarding',
    });

    res.json({
      success: true,
      url: accountLink.url,
      stripeId: stripeAccountId // Trả về để debug nếu cần
    });

  } catch (error) {
    next(error);
  }
};

//Create discount code
export const createDiscountCodes = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { public_name, discountType, discountValue, discountCode } = req.body;
    const isDiscountCodeExist = await prisma.discount_codes.findUnique({
      where: {
        discountCode,
      },
    });
    if (isDiscountCodeExist) {
      return next(new ValidationError("Discount code already exists"));
    }
    const discount_code = await prisma.discount_codes.create({
      data: {
        public_name,
        discountType,
        discountValue: parseFloat(discountValue),
        discountCode,
        sellerId: req.seller.id,
      },
    });
    return res.status(201).json({
      success: true,
      discount_code
    });
  } catch (error) {
    return next(error);
  }
};

// get discount codes
export const getDiscountCodes = async (req: any, res: Response, next: NextFunction) => {
  try {
    console.log("getDiscountCodes - req.seller:", req.seller ? { id: req.seller.id } : null);
    
    if (!req.seller || !req.seller.id) {
      console.error("getDiscountCodes - Seller not found in request");
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized: Seller information missing" 
      });
    }

    const discount_codes = await prisma.discount_codes.findMany({
      where: {
        sellerId: req.seller.id,
      },
    });

    return res.status(200).json({
      success: true,
      discount_codes,
    });
  }
  catch (error) {
    console.error("getDiscountCodes error:", error);
    return next(error);
  }
};

// delete discount codes
export const deleteDiscountCodes = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const sellerId = req.seller?.id;
    const discount_codes = await prisma.discount_codes.findUnique({
      where: {id},
      select: {id: true, sellerId: true},
    });

    if(!discount_codes){
      return next(new NotFoundError("Discount code not found"));
    }

    if (discount_codes.sellerId !== sellerId) {
      return next(new ValidationError("You are not authorized to delete this discount code"));
    }

    await prisma.discount_codes.delete({
      where: { id },
    });

    return res.status(200).json({
      message: "Discount code deleted successfully",
    });
  }
  catch (error) {
    return next(error);
  }
};

// get seller stripe information
export const getSellerStripeAccount = async (req: any, res: Response, next: NextFunction) => {
  try {
    const sellerId = req.seller?.id;
    
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: "Seller not authenticated",
      });
    }

    const seller = await prisma.sellers.findUnique({
      where: { id: sellerId },
      select: { 
        id: true,
        name: true,
        email: true,
        stripeId: true,
        shops: {
          select: {
            id: true,
            name: true,
          }
        }
      },
    });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    res.status(200).json({
      success: true,
      seller: {
        id: seller.id,
        name: seller.name,
        email: seller.email,
        stripeId: seller.stripeId,
        hasStripeAccount: !!seller.stripeId,
        shop: seller.shops,
      },
    });
  } catch (error) {
    return next(error);
  }
}
