import { NextFunction, Request, Response } from "express";
import { AuthError, ValidationError, NotFoundError } from "@packages/error-handler";
import prisma from "@packages/libs/prisma";
import { imagekit } from "@packages/libs/image-kit";
import Stripe from "stripe";
import bcrypt from "bcryptjs";
import { publishNotificationEvent } from '@packages/utils/kafka/producer';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover' as any,                 
});

// upload seller documents
export const uploadSellerDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileData, originalFileName } = req.body;
    
    if (!fileData) {
      return next(new ValidationError("File data is required"));
    }

    // Extract file extension from originalFileName or default to pdf
    const fileExtension = originalFileName 
      ? originalFileName.split('.').pop()?.toLowerCase() || 'pdf'
      : 'pdf';
    
    // Create a short, unique fileName (max 900 chars for ImageKit)
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const shortFileName = `seller-doc-${timestamp}-${randomId}.${fileExtension}`;
    
    const response = await imagekit.upload({
      file: fileData, // base64 data
      fileName: shortFileName, // short, unique filename
      folder: "/seller-documents",
    });
    
    return res.status(201).json({
      file_url: response.url,
      fileId: response.fileId,  
    });
  } catch (error) {
    console.error("ImageKit upload error:", error);
    next(error);
  }
};

// upload shop image (logo, banner, etc.)
export const uploadShopImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileData, originalFileName } = req.body;
    
    if (!fileData) {
      return next(new ValidationError("File data is required"));
    }

    // Extract file extension from originalFileName or default to jpg
    const fileExtension = originalFileName 
      ? originalFileName.split('.').pop()?.toLowerCase() || 'jpg'
      : 'jpg';
    
    // Create a short, unique fileName
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const shortFileName = `shop-${timestamp}-${randomId}.${fileExtension}`;
    
    const response = await imagekit.upload({
      file: fileData, // base64 data
      fileName: shortFileName, // short, unique filename
      folder: "/shop-images",
    });
    
    return res.status(201).json({
      file_url: response.url,
      fileId: response.fileId,  
    });
  } catch (error) {
    console.error("ImageKit upload error:", error);
    next(error);
  }
};

// create a new shop for seller
export const createSellerShop = async (req:any,res:Response,next:NextFunction) => {
  try {
    const { name, bio, category, address, opening_hours, website, sellerId: bodySellerId} = req.body;
    
    // Get sellerId from req.seller (if authenticated as seller) or from body (during registration)
    const sellerId = req.seller?.id || bodySellerId;
    
    if (!name || !bio || !category || !address || !opening_hours || !sellerId) {
      return next(new ValidationError('Name, bio, category, address, and opening hours are required'));
    }

    // Check if seller exists and has submitted documents
    const seller = await prisma.sellers.findUnique({
      where: { id: sellerId },
      select: { 
        id: true,
        verificationStatus: true,
        documents: true,
      },
    });

    if (!seller) {
      return next(new ValidationError('Seller not found'));
    }

    // Allow shop creation if seller has submitted documents (PENDING or APPROVED)
    // During registration flow, seller can create shop after submitting documents
    if (!seller.documents || (typeof seller.documents === 'object' && Object.keys(seller.documents).length === 0)) {
      return next(new ValidationError('Please submit verification documents before creating a shop'));
    }

    // Check if shop already exists for this seller
    const existingShop = await prisma.shops.findUnique({
      where: { sellerId },
    });

    if (existingShop) {
      return next(new ValidationError('Shop already exists for this seller'));
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
    // Allow sellerId from req.seller or from body during registration flow
    const sellerId = req.seller?.id || req.body.sellerId;
    const { documents } = req.body;

    if (!sellerId) {
      return next(new AuthError('Seller ID is required'));
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
        // verificationStatus: 'PENDING', // Moved to Step 4 (Stripe Connection)
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

    // Don't notify admin yet - wait until seller completes all 4 steps
    // Notification will be sent after step 4 (Stripe connection)

    res.status(200).json({
      success: true,
      message: 'Documents submitted successfully. You can now proceed to setup your shop.',
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
    let isNewStripeAccount = false;

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
      isNewStripeAccount = true;

      // Cập nhật stripeId vào database ngay sau khi tạo
      await prisma.sellers.update({
        where: { id: sellerId },
        data: { 
          stripeId: stripeAccountId,
          verificationStatus: 'PENDING' // Set pending status here (Step 4)
        }
      });
    }

    // Check if seller has completed all 4 steps (documents, shop, stripe)
    // Only notify admin once when all steps are complete
    const sellerWithRelations = await prisma.sellers.findUnique({
      where: { id: sellerId },
      include: {
        shops: true,
      },
    });

    // If seller has completed all steps (documents, shop, and stripe), notify admin
    // Only notify if this is a new stripe account creation (to avoid duplicate notifications)
    if (isNewStripeAccount && 
        sellerWithRelations && 
        sellerWithRelations.documents && 
        typeof sellerWithRelations.documents === 'object' &&
        Object.keys(sellerWithRelations.documents).length > 0 &&
        sellerWithRelations.shops) {
      await publishNotificationEvent({
        title: "✅ New Seller Registration Complete",
        message: `Seller ${seller.name || seller.email} has completed all registration steps (documents, shop, and bank connection) and is ready for review.`,
        creatorId: sellerId,
        receiverId: 'admin',
        redirect_link: `/dashboard/moderation/pending-sellers`,
      });
    }

    // BƯỚC 2: Tạo Account Link (Onboarding)
    // Link này sẽ cho phép Seller điền nốt các mục "Actions Required" còn thiếu
    const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      // URL khi Seller nhấn "Back" hoặc link hết hạn
      refresh_url: `${CLIENT_URL}/onboarding-refresh?sellerId=${sellerId}`,
      // URL sau khi hoàn tất các bước trên Stripe
      return_url: `${CLIENT_URL}/success`, 
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

// get shop profile
export const getShopProfile = async (req: any, res: Response, next: NextFunction) => {
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
      include: {
        shops: {
          include: {
            images: true
          }
        }
      }
    });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    if (!seller.shops) {
      return res.status(404).json({
        success: false,
        message: "Shop not found. Please create a shop first.",
      });
    }

    res.status(200).json({
      success: true,
      shop: seller.shops,
    });
  } catch (error) {
    return next(error);
  }
}

// update shop profile
export const updateShopProfile = async (req: any, res: Response, next: NextFunction) => {
  try {
    const sellerId = req.seller?.id;
    
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: "Seller not authenticated",
      });
    }

    const { name, bio, category, address, opening_hours, website, social_links, coverBanner, avatar } = req.body;

    const seller = await prisma.sellers.findUnique({
      where: { id: sellerId },
      include: { shops: true }
    });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    if (!seller.shops) {
      return res.status(404).json({
        success: false,
        message: "Shop not found. Please create a shop first.",
      });
    }

    // Validate required fields
    if (!name || !category || !address || !opening_hours) {
      return next(new ValidationError('Name, category, address, and opening hours are required'));
    }

    // Process social_links - ensure it's an array
    let processedSocialLinks: any[] = [];
    if (social_links) {
      if (Array.isArray(social_links)) {
        processedSocialLinks = social_links;
      } else if (typeof social_links === 'object') {
        processedSocialLinks = Object.entries(social_links).map(([platform, url]) => ({
          platform,
          url
        }));
      }
    }

    const updatedShop = await prisma.shops.update({
      where: { id: seller.shops.id },
      data: {
        name,
        bio: bio || null,
        category,
        address,
        opening_hours,
        website: website || null,
        social_links: processedSocialLinks.length > 0 ? processedSocialLinks : seller.shops.social_links,
        coverBanner: coverBanner || seller.shops.coverBanner,
        avatar: avatar || (seller.shops as any).avatar,
      },
      include: {
        images: true
      }
    });

    res.status(200).json({
      success: true,
      message: "Shop profile updated successfully",
      shop: updatedShop,
    });
  } catch (error) {
    return next(error);
  }
}

// update shipping settings
export const updateShippingSettings = async (req: any, res: Response, next: NextFunction) => {
  try {
    const sellerId = req.seller?.id;
    
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: "Seller not authenticated",
      });
    }

    const { shippingSettings } = req.body;

    const seller = await prisma.sellers.findUnique({
      where: { id: sellerId },
      include: { shops: true }
    });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    if (!seller.shops) {
      return res.status(404).json({
        success: false,
        message: "Shop not found. Please create a shop first.",
      });
    }

    // Validate shippingSettings structure
    if (shippingSettings && typeof shippingSettings !== 'object') {
      return next(new ValidationError('Shipping settings must be an object'));
    }

    const updatedShop = await prisma.shops.update({
      where: { id: seller.shops.id },
      data: {
        shippingSettings: shippingSettings || null,
      },
      include: {
        images: true
      }
    });

    res.status(200).json({
      success: true,
      message: "Shipping settings updated successfully",
      shop: updatedShop,
    });
  } catch (error) {
    return next(error);
  }
}

// get seller profile
export const getSellerProfile = async (req: any, res: Response, next: NextFunction) => {
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
        phone_number: true,
        country: true,
        createdAt: true,
        updateAt: true,
        verificationStatus: true,
      }
    });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    res.status(200).json({
      success: true,
      seller,
    });
  } catch (error) {
    return next(error);
  }
}

// update seller profile
export const updateSellerProfile = async (req: any, res: Response, next: NextFunction) => {
  try {
    const sellerId = req.seller?.id;
    
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: "Seller not authenticated",
      });
    }

    const { name, email, phone_number, country } = req.body;

    const seller = await prisma.sellers.findUnique({
      where: { id: sellerId }
    });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    // Validate required fields
    if (!name || !email || !phone_number || !country) {
      return next(new ValidationError('Name, email, phone number, and country are required'));
    }

    // Check if email is being changed and if new email already exists
    if (email !== seller.email) {
      const existingSeller = await prisma.sellers.findUnique({
        where: { email }
      });
      if (existingSeller) {
        return next(new ValidationError('Email already exists'));
      }
    }

    // Check if phone_number is being changed and if new phone already exists
    if (phone_number !== seller.phone_number) {
      const existingSeller = await prisma.sellers.findUnique({
        where: { phone_number }
      });
      if (existingSeller) {
        return next(new ValidationError('Phone number already exists'));
      }
    }

    const updatedSeller = await prisma.sellers.update({
      where: { id: sellerId },
      data: {
        name,
        email,
        phone_number,
        country,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone_number: true,
        country: true,
        createdAt: true,
        updateAt: true,
      }
    });

    res.status(200).json({
      success: true,
      message: "Seller profile updated successfully",
      seller: updatedSeller,
    });
  } catch (error) {
    return next(error);
  }
}

// change password
export const changePassword = async (req: any, res: Response, next: NextFunction) => {
  try {
    const sellerId = req.seller?.id;
    
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: "Seller not authenticated",
      });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return next(new ValidationError('Old password and new password are required'));
    }

    if (newPassword.length < 6) {
      return next(new ValidationError('New password must be at least 6 characters long'));
    }

    const seller = await prisma.sellers.findUnique({
      where: { id: sellerId }
    });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, seller.password);
    if (!isMatch) {
      return next(new ValidationError('Old password is incorrect'));
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.sellers.update({
      where: { id: sellerId },
      data: {
        password: hashedPassword,
      }
    });

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    return next(error);
  }
}

// --- Public Shop Read Operations (Moved from Product Service) ---

// get filtered shop
export const getFilteredShops = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      categories = [],
      page = 1,
      limit = 12,
    } = req.query;

    const parsePage = Number(page) ;
    const parseLimit = Number(limit);
    const skip = (parsePage - 1) * parseLimit;

    const filters: Record<string, any> = {};

    if (categories && (categories as string[]).length > 0) {
      filters.category = { 
        in: Array.isArray(categories) ? categories : String(categories).split(',')
      };
    }

    const [shops, total] = await Promise.all([
      prisma.shops.findMany({
        where: filters,
        skip,
        take: parseLimit,
        include: {
          sellers: true,
          followers: true,
          products: true,
        },
      }),
      prisma.shops.count({ where: filters }),
    ]);

    const totalPages = Math.ceil(total / parseLimit);
    res.json({
      shops,
      pagination:{
        total,  
        page: parsePage,
        totalPages,
      }
    })
  } catch (error) {
    return next(error);
  }
};

// top shops
export const topShops = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get top shops by rating and product count
    const shops = await prisma.shops.findMany({
      select: {
        id: true,
        name: true,
        images: true,
        coverBanner: true,
        address: true,
        followers: true,
        rating: true,
        category: true,
        _count: {
          select: { products: true }
        }
      },
      take: 10,
      orderBy: [
        { rating: 'desc' },
        { followers: { _count: 'desc' } }
      ]
    });

    const enrichedShops = shops.map((shop: any) => ({
      ...shop,
      totalProducts: shop._count.products
    }));

    res.status(200).json({
      success: true,
      topShops: enrichedShops,
    });
  } catch (error) {
    return next(error); 
  }
};

// get shop by ID
export const getShopById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ValidationError("Shop ID is required"));
    }

    const shop = await prisma.shops.findUnique({
      where: { id },
      include: {
        images: true,
        followers: {
          select: {
            id: true,
            name: true,
            images: true,
          }
        },
        reviews: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                images: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            products: true,
            followers: true,
            reviews: true,
          }
        }
      }
    });

    if (!shop) {
      return next(new NotFoundError("Shop not found"));
    }

    // Format the response
    const formattedShop = {
      id: shop.id,
      name: shop.name,
      bio: shop.bio,
      category: shop.category,
      images: shop.images,
      coverBanner: shop.coverBanner,
      address: shop.address,
      opening_hours: shop.opening_hours,
      website: shop.website,
      social_links: shop.social_links,
      rating: shop.rating,
      createdAt: shop.createdAt,
      followers: {
        count: shop._count.followers,
        users: shop.followers
      },
      products: {
        count: shop._count.products
      },
      reviews: shop.reviews.map((review: any) => ({
        id: review.id,
        rating: review.rating,
        review: review.reviews,
        createdAt: review.createdAt,
        user: review.users
      }))
    };

    res.status(200).json({
      success: true,
      shop: formattedShop,
    });
  } catch (error) {
    return next(error);
  }
};
