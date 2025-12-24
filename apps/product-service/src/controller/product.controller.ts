import { AuthError, NotFoundError, ValidationError } from "@packages/error-handler";
import { imagekit } from "@packages/libs/image-kit";
import prisma from "@packages/libs/prisma";
import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { checkProductModeration } from "../services/auto-moderation.service";
import { detectSignificantChanges } from "../services/product-change-detector.service";
import { publishNotificationEvent } from "@packages/utils/kafka/producer";

// get product categories
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await prisma.site_config.findFirst();
    if (!config) {
      return res.status(404).json({ message: "Site configuration not found" });
    }

    return res.status(200).json({ categories: config.categories, subCategories: config.subCategories });
  } catch (error) {
    return next(error);
  }
}








// upload product images
export const uploadProductImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileData, originalFileName } = req.body;
    
    if (!fileData) {
      return next(new ValidationError("File data is required"));
    }

    // Extract file extension from originalFileName or default to jpg
    const fileExtension = originalFileName 
      ? originalFileName.split('.').pop()?.toLowerCase() || 'jpg'
      : 'jpg';
    
    // Create a short, unique fileName (max 900 chars for ImageKit)
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const shortFileName = `product-${timestamp}-${randomId}.${fileExtension}`;
    
    const response = await imagekit.upload({
      file: fileData, // base64 data
      fileName: shortFileName, // short, unique filename
      folder: "/products",
    });
    
    return res.status(201).json({
      file_url: response.url,
      fileId: response.fileId,  
    });
  } catch (error) {
    console.error("ImageKit upload error:", error);
    next(error);
  }
}

// delete product images
export const deleteProductImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.body;
    await imagekit.deleteFile(fileId);
    return res.status(200).json(
      { message: "Image deleted successfully" }
    )
  } catch (error) {
    return next(error);
  }
}

// create product 
export const createProduct = async (req: any, res: Response, next: NextFunction) => {
  try {
console.log("🔥 [DEBUG] Create Product Payload:");
    console.log(JSON.stringify(req.body, null, 2)); // In đẹp toàn bộ body
    console.log("👤 [DEBUG] Seller Info:", req.seller); // Kiểm tra thông tin seller
  const {
    title,
    short_description,
    detailed_description,
    warranty,
    custom_specifications,
    slug,
    tags,
    cash_on_delivery,
    brand,
    video_url,
    category,
    colors = [],
    sizes = [],
    discount_codes = [],
    stock,
    sale_price,
    regular_price,
    subCategory,
    custom_properties = {},
    starting_date,
    ending_date,
    images = [],
  } = req.body;

  const discountCodes: string[] = Array.isArray(discount_codes)
  ? discount_codes
  : discount_codes
  ? [discount_codes]
  : [];

console.log("🧐 [DEBUG] Checking required fields:", {
        hasTitle: !!title,
        hasShortDesc: !!short_description,
        hasCategory: !!category,
        hasStock: stock !== undefined && stock !== null && stock !== '', 
        // Lưu ý: Nếu stock là 0 mà dùng !stock sẽ bị lỗi (xem giải thích dưới)
        hasSalePrice: !!sale_price,
        hasRegularPrice: !!regular_price
    });
  // Validate required fields - check stock properly (0 is valid)
  if (!title || !short_description || !category || stock === undefined || stock === null || stock === '' || !sale_price || !regular_price) {
    const missingFields = [];
    if (!title) missingFields.push('title');
    if (!short_description) missingFields.push('short_description');
    if (!category) missingFields.push('category');
    if (stock === undefined || stock === null || stock === '') missingFields.push('stock');
    if (!sale_price) missingFields.push('sale_price');
    if (!regular_price) missingFields.push('regular_price');
    
    console.error("❌ [VALIDATION] Missing required fields:", missingFields);
    return next(new ValidationError(`Missing required fields: ${missingFields.join(', ')}`));
  }

  if (!req.seller.id) {
    return next(new AuthError("Seller information is missing"));
  }

  const slugChecking = await prisma.products.findUnique({
    where: { slug },
  });
  if (slugChecking) {
    return next(new ValidationError("Slug already exists"));
  }

  // Get shopId from seller - Prisma returns 'shops' (plural) from include
  const shopId = req.seller?.shops?.id;
  
  if (!shopId) {
    return next(new ValidationError("Seller must have a shop. Please create a shop first."));
  }

  // Process tags - handle both array and string
  let processedTags: string[] = [];
  if (Array.isArray(tags)) {
    processedTags = tags.filter(tag => tag && tag.trim());
  } else if (typeof tags === 'string' && tags.trim()) {
    processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
  }

  // Process discount codes - ensure they are valid ObjectId strings
  const processedDiscountCodes = discountCodes.filter((code: any) => {
    // Basic ObjectId validation (24 hex characters)
    return code && typeof code === 'string' && /^[0-9a-fA-F]{24}$/.test(code);
  });

  console.log("🔍 [DEBUG] Processed data:", {
    shopId,
    tagsCount: processedTags.length,
    discountCodesCount: processedDiscountCodes.length,
    imagesCount: images.filter((img: any) => img && img.fileId && img.file_url).length
  });

  // Run auto moderation check
  const moderationResult = checkProductModeration({
    title,
    short_description,
    detailed_description,
    tags: processedTags,
    category,
    brand: brand || undefined,
  });

  // Determine product status based on moderation result
  let productStatus: 'active' | 'pending' | 'rejected' = 'pending';
  let rejectionReason: string | null = null;
  let isAutoModerated = false;

  if (moderationResult.shouldReject) {
    productStatus = 'rejected';
    rejectionReason = moderationResult.reasons.join(', ');
    isAutoModerated = true;
  } else if (moderationResult.shouldApprove) {
    productStatus = 'active';
    isAutoModerated = true;
  } else {
    // Needs manual review
    productStatus = 'pending';
  }

  const newProduct = await prisma.products.create({
    data: {
      title,
      short_description,
      detailed_description: detailed_description || '',
      warranty: warranty || null,
      cashOnDelivery: cash_on_delivery || null,
      slug,
      shopId,
      tags: processedTags,
      brand: brand || null,
      video_url: video_url || null,
      category,
      subCategory: subCategory || '',
      colors: Array.isArray(colors) ? colors : [],
      discount_codes: processedDiscountCodes,
      sizes: Array.isArray(sizes) ? sizes : [],
      stock: parseInt(stock.toString(), 10),
      sale_price: parseFloat(sale_price.toString()),
      regular_price: parseFloat(regular_price.toString()),
      custom_specifications: custom_specifications || {},
      custom_properties: custom_properties || {},
      starting_date: starting_date ? new Date(starting_date) : new Date(),
      ending_date: ending_date ? new Date(ending_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: productStatus,
      submittedAt: new Date(),
      isAutoModerated,
      moderationScore: moderationResult.moderationScore,
      rejectionReason,
      images: {
        create: images
                .filter((img: any) => img && img.fileId && img.file_url)
                .map((img: any) => ({
                  file_id: img.fileId,
                  url: img.file_url,
                })),
      }      
    },
    include: {images: true},
  });

  // Create product history entry
  await prisma.product_history.create({
    data: {
      productId: newProduct.id,
      changedBy: req.seller.id,
      changeType: isAutoModerated ? 'auto_moderation' : 'edit',
      changes: {
        action: 'created',
        title,
        category,
        status: productStatus,
        moderationScore: moderationResult.moderationScore,
        autoModerated: isAutoModerated,
      },
      reason: rejectionReason,
    },
  });

  // Publish notification event for admin if product needs manual review
  if (productStatus === 'pending') {
    await publishNotificationEvent({
      title: "🔍 New Product Pending Review",
      message: `Seller ${req.seller.name || req.seller.email} submitted a new product "${title}" for review.`,
      creatorId: req.seller.id,
      receiverId: 'admin',
      redirect_link: `/dashboard/moderation/pending-products`,
    });
  }

  res.status(200).json({
    success: true,
    newProduct,
    moderationResult: {
      status: productStatus,
      isAutoModerated,
      moderationScore: moderationResult.moderationScore,
    },
  });
  } catch (error: any) {
    console.error("❌ [ERROR] Create Product Failed:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack?.split('\n').slice(0, 5)
    });
    return next(error);
  }
}

// update product
export const updateProduct = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const {
      title,
      short_description,
      detailed_description,
      warranty,
      custom_specifications,
      slug,
      tags,
      cash_on_delivery,
      brand,
      video_url,
      category,
      colors = [],
      sizes = [],
      discount_codes = [],
      stock,
      sale_price,
      regular_price,
      subCategory,
      custom_properties = {},
      starting_date,
      ending_date,
      images = [],
    } = req.body;

    if (!req.seller.id) {
      return next(new AuthError("Seller information is missing"));
    }

    const shopId = req.seller?.shops?.id;
    if (!shopId) {
      return next(new ValidationError("Seller must have a shop"));
    }

    // Get old product for change detection
    const oldProduct = await prisma.products.findUnique({
      where: { id: productId },
      include: { images: true },
    });

    if (!oldProduct) {
      return next(new NotFoundError("Product not found"));
    }

    // Verify product belongs to seller's shop
    if (oldProduct.shopId !== shopId) {
      return next(new ValidationError("You are not authorized to update this product"));
    }

    // Process tags
    let processedTags: string[] = [];
    if (Array.isArray(tags)) {
      processedTags = tags.filter(tag => tag && tag.trim());
    } else if (typeof tags === 'string' && tags.trim()) {
      processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    // Process discount codes
    const discountCodes: string[] = Array.isArray(discount_codes)
      ? discount_codes
      : discount_codes
      ? [discount_codes]
      : [];

    const processedDiscountCodes = discountCodes.filter((code: any) => {
      return code && typeof code === 'string' && /^[0-9a-fA-F]{24}$/.test(code);
    });

    // Detect significant changes if product is active
    let requiresReReview = false;
    let newStatus = oldProduct.status;

    // If product was rejected, resubmitting should set it to pending for review
    if (oldProduct.status === 'rejected') {
      requiresReReview = true;
      newStatus = 'pending';
      
      // Run auto moderation on updated product
      const moderationResult = checkProductModeration({
        title: title || oldProduct.title,
        short_description: short_description || oldProduct.short_description,
        detailed_description: detailed_description || oldProduct.detailed_description,
        tags: processedTags,
        category: category || oldProduct.category,
        brand: brand || oldProduct.brand || undefined,
      });

      // If auto moderation rejects again, keep as rejected
      if (moderationResult.shouldReject) {
        newStatus = 'rejected';
        requiresReReview = false;
      } else if (moderationResult.shouldApprove) {
        // If auto approves, set to active
        requiresReReview = false;
        newStatus = 'active';
      }
    }
    // If product is active, check for significant changes
    else if (oldProduct.status === 'active') {
      const changeResult = detectSignificantChanges(
        {
          title: oldProduct.title,
          short_description: oldProduct.short_description,
          detailed_description: oldProduct.detailed_description || '',
          category: oldProduct.category,
          subCategory: oldProduct.subCategory || '',
          sale_price: oldProduct.sale_price,
          regular_price: oldProduct.regular_price,
          images: oldProduct.images,
          brand: oldProduct.brand || '',
        },
        {
          title: title || oldProduct.title,
          short_description: short_description || oldProduct.short_description,
          detailed_description: detailed_description || oldProduct.detailed_description || '',
          category: category || oldProduct.category,
          subCategory: subCategory || oldProduct.subCategory || '',
          sale_price: sale_price || oldProduct.sale_price,
          regular_price: regular_price || oldProduct.regular_price,
          images: images || oldProduct.images,
          brand: brand || oldProduct.brand || '',
        }
      );

      if (changeResult.hasSignificantChanges) {
        requiresReReview = true;
        newStatus = 'pending';

        // Run auto moderation on updated product
        const moderationResult = checkProductModeration({
          title: title || oldProduct.title,
          short_description: short_description || oldProduct.short_description,
          detailed_description: detailed_description || oldProduct.detailed_description,
          tags: processedTags,
          category: category || oldProduct.category,
          brand: brand || oldProduct.brand || undefined,
        });

        // If auto moderation rejects, set to rejected
        if (moderationResult.shouldReject) {
          newStatus = 'rejected';
        } else if (moderationResult.shouldApprove) {
          // If auto approves, keep as active (no re-review needed)
          requiresReReview = false;
          newStatus = 'active';
        }
      }
    }

    // Update product
    const updatedProduct = await prisma.products.update({
      where: { id: productId },
      data: {
        title: title || oldProduct.title,
        short_description: short_description || oldProduct.short_description,
        detailed_description: detailed_description !== undefined ? detailed_description : oldProduct.detailed_description,
        warranty: warranty !== undefined ? warranty : oldProduct.warranty,
        cashOnDelivery: cash_on_delivery !== undefined ? cash_on_delivery : oldProduct.cashOnDelivery,
        slug: slug || oldProduct.slug,
        tags: processedTags.length > 0 ? processedTags : oldProduct.tags,
        brand: brand !== undefined ? brand : oldProduct.brand,
        video_url: video_url !== undefined ? video_url : oldProduct.video_url,
        category: category || oldProduct.category,
        subCategory: subCategory !== undefined ? subCategory : oldProduct.subCategory,
        colors: Array.isArray(colors) && colors.length > 0 ? colors : oldProduct.colors,
        discount_codes: processedDiscountCodes.length > 0 ? processedDiscountCodes : oldProduct.discount_codes,
        sizes: Array.isArray(sizes) && sizes.length > 0 ? sizes : oldProduct.sizes,
        stock: stock !== undefined ? parseInt(stock.toString(), 10) : oldProduct.stock,
        sale_price: sale_price !== undefined ? parseFloat(sale_price.toString()) : oldProduct.sale_price,
        regular_price: regular_price !== undefined ? parseFloat(regular_price.toString()) : oldProduct.regular_price,
        custom_specifications: custom_specifications || oldProduct.custom_specifications,
        custom_properties: custom_properties || oldProduct.custom_properties,
        starting_date: starting_date ? new Date(starting_date) : oldProduct.starting_date,
        ending_date: ending_date ? new Date(ending_date) : oldProduct.ending_date,
        status: newStatus,
        requiresReReview,
        submittedAt: requiresReReview ? new Date() : oldProduct.submittedAt,
        // Update images if provided
        ...(images && images.length > 0 && {
          images: {
            deleteMany: {},
            create: images
              .filter((img: any) => img && img.fileId && img.file_url)
              .map((img: any) => ({
                file_id: img.fileId,
                url: img.file_url,
              })),
          },
        }),
      },
      include: { images: true },
    });

    // Create product history entry
    await prisma.product_history.create({
      data: {
        productId: updatedProduct.id,
        changedBy: req.seller.id,
        changeType: requiresReReview ? 'edit_requires_review' : 'edit',
        changes: {
          action: 'updated',
          status: newStatus,
          requiresReReview,
        },
      },
    });

    // Publish notification event for admin if product needs re-review or resubmitted
    if (newStatus === 'pending' && (requiresReReview || oldProduct.status === 'rejected')) {
      const actionText = oldProduct.status === 'rejected' 
        ? 'resubmitted a previously rejected product' 
        : 'updated a product that requires re-review';
      
      await publishNotificationEvent({
        title: "🔄 Product Update Pending Review",
        message: `Seller ${req.seller.name || req.seller.email} ${actionText}: "${updatedProduct.title}".`,
        creatorId: req.seller.id,
        receiverId: 'admin',
        redirect_link: `/dashboard/moderation/pending-products`,
      });
    }

    res.status(200).json({
      success: true,
      product: updatedProduct,
      requiresReReview,
      message: requiresReReview
        ? 'Product updated. Significant changes detected. Product requires re-review.'
        : 'Product updated successfully',
    });
  } catch (error: any) {
    console.error("❌ [ERROR] Update Product Failed:", {
      message: error?.message,
      code: error?.code,
    });
    return next(error);
  }
};

// get logged in seller's products
export const getShopProducts = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (!req.seller || !req.seller.id) {
      return res.status(401).json({ success: false, message: "Unauthorized: Seller information missing" });
    }

    const shopId = req.seller?.shops?.id;
    if (!shopId) {
      return res.status(400).json({ success: false, message: "Seller must have a shop. Please create a shop first." });
    }
    
    const products = await prisma.products.findMany({
      where: {
        shopId,
      },
      include: {
        images: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    return next(error);
  }
}

// delete product
export const deleteProduct = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const sellId = req.seller?.shops?.id;
    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: { id: true, shopId: true , isDeleted: true},
    })

    if (!product) {
      return next(new ValidationError("Product not found"));
    }

    if (product.shopId !== sellId) {
      return next(new ValidationError("You are not authorized to delete this product"));
    }

    if (product.isDeleted) {
      return next(new ValidationError("Product is already in deleted state"));
    }

    const deletedProduct = await prisma.products.update({
      where: { id: productId }, 
      data: { isDeleted: true, deletedAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    return res.status(200).json({
      message: "Product moved to deleted state. It will be permanently deleted after 24 hours.",
      deletedAt: deletedProduct.deletedAt,
    });
  } catch (error) {
    return next(error);
  }
};

// restore deleted product
export const restoreDeletedProduct = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const sellId = req.seller?.shops?.id;
    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: { id: true, shopId: true , isDeleted: true},
    })
    if (!product) {
      return next(new ValidationError("Product not found"));
    }

    if (product.shopId !== sellId) {
      return next(new ValidationError("You are not authorized to restore this product"));
    }

    if (!product.isDeleted) {
      return res 
        .status(400)
        .json({ message: "Product is not in deleted state" });
    }

    await prisma.products.update({
      where: { id: productId }, 
      data: { isDeleted: false, deletedAt: null },
    });
    res.status(200).json({
      success: true,
      message: "Product has been restored successfully",
    });
  } catch (error) {
    next(error);
  }
}



// get All products 
export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const type = req.query.type as string;
    const category = req.query.category as string;
    const search = req.query.search as string;
    const sortBy = req.query.sortBy as string;
    const now = new Date();

    // Base filter: only active, non-deleted products within valid date range
    const baseFilter: Prisma.productsWhereInput = {
      isDeleted: false,
      status: 'active',
      starting_date: { lte: now },
      ending_date: { gte: now },
      ...(category && { category }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
          { tags: { has: search } },
          { brand: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        ],
      }),
    };

    // Dynamic sorting
    let orderBy: Prisma.productsOrderByWithRelationInput;
    switch (sortBy || type) {
      case 'latest':
      case 'lastest': // backward compatibility
        orderBy = { createdAt: 'desc' as Prisma.SortOrder };
        break;
      case 'price-low':
        orderBy = { sale_price: 'asc' as Prisma.SortOrder };
        break;
      case 'price-high':
        orderBy = { sale_price: 'desc' as Prisma.SortOrder };
        break;
      case 'rating':
        orderBy = { ratings: 'desc' as Prisma.SortOrder };
        break;
      default:
        orderBy = { createdAt: 'desc' as Prisma.SortOrder };
    }

    // Top 10 filter (featured products)
    const top10OrderBy: Prisma.productsOrderByWithRelationInput = 
      type === 'latest' || type === 'lastest' 
        ? { createdAt: 'desc' as Prisma.SortOrder } 
        : { ratings: 'desc' as Prisma.SortOrder };

    const [products, total, top10Products] = await Promise.all([
      prisma.products.findMany({
        skip,
        take: limit,
        where: baseFilter,
        include: {
          images: true,
          shops: {
            select: {
              id: true,
              name: true,
              rating: true,
              images: true,
            },
          },
        },
        orderBy,
      }),

      prisma.products.count({ where: baseFilter }),
      
      prisma.products.findMany({
        take: 10,
        where: baseFilter,
        include: {
          images: true,
          shops: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: top10OrderBy,
      }),
    ]);

    res.status(200).json({
      success: true,
      products,
      total,
      top10By: type === 'latest' || type === 'lastest' ? 'latest' : 'rating',
      top10Products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    });
  } catch (error) {
    next(error);
  }
}

// get all events
export const getAllEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Base filter: only active, non-deleted products within valid date range
    const baseFilter = {
      AND: [{ starting_date: { not: null } }, { ending_date: { not: null } }],
    };

    const [events, total, top10BySales] = await Promise.all([
      prisma.products.findMany({
        skip,
        take: limit,
        where: baseFilter,
        include: {
          images: true,
          shops: true,
        },
        orderBy: { totalSales: 'desc' as Prisma.SortOrder },
      }),
      prisma.products.count({ where: baseFilter }),
      prisma.products.findMany({
        where: baseFilter,
        take: 10,
        orderBy: {
          totalSales: 'desc' as Prisma.SortOrder,
        },
      }),
    ]);
    res.status(200).json({
      events,
      total,
      top10BySales,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ error: "Fail to get filtered events" });
  }
};
      
// get product details by slug
export const getProductDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Decode & chuẩn hóa slug từ URL
    const rawSlug = req.params.slug ?? "";
    const slug = decodeURIComponent(rawSlug).trim();

    if (!slug) {
      return next(new NotFoundError("Slug is required"));
    }

    // Tìm product theo slug (không phân biệt hoa/thường),
    // đồng thời chỉ lấy product đang active và chưa bị xóa
    const product = await prisma.products.findFirst({
      where: {
        slug: {
          equals: slug,
          mode: "insensitive",
        },
        isDeleted: false,
        status: "active",
      },
      include: {
        images: true,
        shops: {
          select: {
            id: true,
            name: true,
            rating: true,
            images: true,
          },
        },
      },
    });

    if (!product) {
      return next(new NotFoundError("Product not found"));
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    return next(error);
  }
};

//get filtered products 
export const getFilteredProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      priceRange = [0.1000],
      categories = [],
      colors = [],
      sizes = [],
      page = 1,
      limit = 12,
    } = req.query;

    const parsePriceRange = typeof priceRange === 'string' ? priceRange.split(',').map(Number) : [0, 10000];
    const parsePage = Number(page) ;
    const parseLimit = Number(limit);
    const skip = (parsePage - 1) * parseLimit;

    const filters: Record<string, any> = {
      isDeleted: false,
      status: 'active',
      sale_price: {
        gte: parsePriceRange[0],
        lte: parsePriceRange[1],  
      },
    };
    if (categories && (categories as string[]).length > 0) {
      filters.category = { 
        in: Array.isArray(categories) ? categories : String(categories).split(',')
      };
    }
    if (colors && (colors as string[]).length > 0) {
      filters.colors = {
        hasSome: Array.isArray(colors) ? colors : [colors],
      };
    }

    if (sizes && (sizes as string[]).length > 0) {
      filters.sizes = {
        hasSome: Array.isArray(sizes) ? sizes : [sizes],
      };
    }
    const [products, total] = await Promise.all([
      prisma.products.findMany({
        where: filters,
        skip,
        take: parseLimit,
        include: {
          images: true,
          shops: true,
        },
      }),
      prisma.products.count({ where: filters }),
    ]);

    const totalPages = Math.ceil(total / parseLimit);
    res.json({
      products,
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

// get filtered offers
export const getFilteredEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      priceRange = [0.1000],
      categories = [],
      colors = [],
      sizes = [],
      page = 1,
      limit = 12,
    } = req.query;

    const parsePriceRange = typeof priceRange === 'string' ? priceRange.split(',').map(Number) : [0, 10000];
    const parsePage = Number(page) ;
    const parseLimit = Number(limit);
    const skip = (parsePage - 1) * parseLimit;

    const filters: Record<string, any> = {
      sale_price: {
        gte: parsePriceRange[0],
        lte: parsePriceRange[1],  
    },
    NOT: {
      starting_date: null,
    }
    };
    if (categories && (categories as string[]).length > 0) {
      filters.category = { 
        in: Array.isArray(categories) ? categories : String(categories).split(',')
      };
    }
    if (colors && (colors as string[]).length > 0) {
      filters.colors = {
        hasSome: Array.isArray(colors) ? colors : [colors],
      };
    }
    if (sizes && (sizes as string[]).length > 0) {
      filters.sizes = {
        hasSome: Array.isArray(sizes) ? sizes : [sizes],
      };
    }
    const [products, total] = await Promise.all([
      prisma.products.findMany({
        where: filters,
        skip,
        take: parseLimit,
        include: {
          images: true,
          shops: true,
        },
      }),
      prisma.products.count({ where: filters }),
    ]);

    const totalPages = Math.ceil(total / parseLimit);
    res.json({
      products,
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

// search products
export const searchProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const searchQuery = req.query.q as string;
    if (!searchQuery || searchQuery.trim().length === 0) {
      return next(new ValidationError("Search query is required"));
    }

    const products = await prisma.products.findMany({
      where: {
        isDeleted: false,
        status: 'active',
        OR: [
          { title: { contains: searchQuery, mode: 'insensitive' as Prisma.QueryMode } },
          { short_description: { contains: searchQuery, mode: 'insensitive' as Prisma.QueryMode } },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
      take: 10,
      orderBy: { createdAt: 'desc' as Prisma.SortOrder },
    });
    res.status(200).json({
      success: true,
      products,
    });
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

// get shop products (public endpoint)
export const getPublicShopProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const skip = (page - 1) * limit;
    const now = new Date();

    if (!shopId) {
      return next(new ValidationError("Shop ID is required"));
    }

    // Verify shop exists
    const shop = await prisma.shops.findUnique({
      where: { id: shopId },
      select: { id: true }
    });

    if (!shop) {
      return next(new NotFoundError("Shop not found"));
    }

    // Get active, non-deleted products for this shop
    const [products, total] = await Promise.all([
      prisma.products.findMany({
        where: {
          shopId,
          isDeleted: false,
          status: 'active',
          starting_date: { lte: now },
          ending_date: { gte: now },
        },
        include: {
          images: true,
          shops: {
            select: {
              id: true,
              name: true,
              rating: true,
            }
          }
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.products.count({
        where: {
          shopId,
          isDeleted: false,
          status: 'active',
          starting_date: { lte: now },
          ending_date: { gte: now },
        }
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      products,
      pagination: {
        total,
        page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    });
  } catch (error) {
    return next(error);
  }
};