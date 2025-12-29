import { AuthError, NotFoundError, ValidationError } from "@packages/error-handler";
import { imagekit } from "@packages/libs/image-kit";
import prisma from "@packages/libs/prisma";
import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { checkProductModeration } from "../services/auto-moderation.service";
import { detectSignificantChanges } from "../services/product-change-detector.service";
import { publishNotificationEvent, broadcastNotificationToAdmins } from "@packages/utils/kafka/producer";
import { 
  generateVariations, 
  generateDefaultVariation, 
  validateVariationGroups,
  calculateVariationCount,
  VariationGroup 
} from "@packages/utils/variation-generator";

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
    isDraft = false, // New parameter for draft functionality
    variationGroups = [], // NEW: Array of {name, options} for creating variation groups
    variations = [], // NEW: Array of {attributes, price, stock} for manual variation entry
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
  // For drafts, only title is required. For non-drafts, all fields are required.
  if (!title) {
    return next(new ValidationError('Title is required'));
  }
  
  if (!isDraft) {
    if (!short_description || !category || stock === undefined || stock === null || stock === '' || !sale_price || !regular_price) {
      const missingFields = [];
      if (!short_description) missingFields.push('short_description');
      if (!category) missingFields.push('category');
      if (stock === undefined || stock === null || stock === '') missingFields.push('stock');
      if (!sale_price) missingFields.push('sale_price');
      if (!regular_price) missingFields.push('regular_price');
      
      console.error("❌ [VALIDATION] Missing required fields:", missingFields);
      return next(new ValidationError(`Missing required fields: ${missingFields.join(', ')}. Tip: Save as draft to continue later.`));
    }
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

  // Determine product status based on draft flag and moderation
  let productStatus: 'active' | 'pending' | 'rejected' | 'draft' = 'pending';
  let rejectionReason: string | null = null;
  let isAutoModerated = false;
  let moderationResult: any = { moderationScore: 0, reasons: [], shouldApprove: false, shouldReject: false };

  if (isDraft) {
    // Save as draft - no moderation
    productStatus = 'draft';
    console.log("💾 [DEBUG] Saving product as draft - skipping moderation");
  } else {
    // Run auto moderation check only for non-draft products
    moderationResult = await checkProductModeration({
      title,
      short_description,
      detailed_description,
      tags: processedTags,
      category,
      brand: brand || undefined,
    });

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

  // ========== VARIATION SYSTEM ==========
  // Generate and create product variations
  let createdVariations: any[] = [];
  
  try {
    const hasVariationGroups = Array.isArray(variationGroups) && variationGroups.length > 0;
    const hasLegacyColorsSizes = (colors.length > 0 || sizes.length > 0);
    
    if (hasVariationGroups) {
      // NEW SYSTEM: Use variation groups from request
      console.log(`📦 [VARIATIONS] Creating variations from ${variationGroups.length} groups`);
      
      // Validate variation groups
      const validation = validateVariationGroups(variationGroups);
      if (!validation.valid) {
        throw new ValidationError(`Variation validation failed: ${validation.errors.join(', ')}`);
      }

      // Check total variation count
      const totalVariations = calculateVariationCount(variationGroups);
      if (totalVariations > 100) {
        throw new ValidationError(`Too many variations (${totalVariations}). Maximum is 100.`);
      }

      // Create variation groups in database
      for (let i = 0; i < variationGroups.length; i++) {
        await prisma.variation_groups.create({
          data: {
            productId: newProduct.id,
            name: variationGroups[i].name,
            options: variationGroups[i].options,
            position: i,
          },
        });
      }

      // Generate all variations using Cartesian product
      const generatedVariations = generateVariations({
        productSlug: slug,
        variationGroups: variationGroups.map((g: any, i: number) => ({
          name: g.name,
          options: g.options,
          position: i,
        })),
        basePrice: parseFloat(sale_price.toString()),
        baseStock: Math.floor(parseInt(stock.toString(), 10) / totalVariations), // Distribute evenly
      });

      // If manual variations provided, merge with generated
      const finalVariations = variations.length > 0 
        ? generatedVariations.map((gv: any) => {
            const manual = variations.find((mv: any) => 
              JSON.stringify(mv.attributes) === JSON.stringify(gv.attributes)
            );
            return manual ? { ...gv, ...manual } : gv;
          })
        : generatedVariations;

      // Bulk create variations
      for (const variation of finalVariations) {
        const created = await prisma.product_variations.create({
          data: {
            productId: newProduct.id,
            sku: variation.sku,
            attributes: variation.attributes,
            price: variation.price,
            stock: variation.stock,
            isActive: true,
            isDeleted: false,
          },
        });
        createdVariations.push(created);
      }

      // Mark product as having variations
      await prisma.products.update({
        where: { id: newProduct.id },
        data: { hasVariations: true },
      });

      console.log(`✅ [VARIATIONS] Created ${createdVariations.length} variations`);
      
    } else if (hasLegacyColorsSizes) {
      // LEGACY SYSTEM: Convert colors/sizes to variation groups
      console.log(`📦 [VARIATIONS] Converting legacy colors/sizes to variations`);
      
      const legacyGroups: VariationGroup[] = [];
      
      if (colors.length > 0) {
        await prisma.variation_groups.create({
          data: {
            productId: newProduct.id,
            name: 'Color',
            options: colors,
            position: 0,
          },
        });
        legacyGroups.push({ name: 'Color', options: colors, position: 0 });
      }
      
      if (sizes.length > 0) {
        await prisma.variation_groups.create({
          data: {
            productId: newProduct.id,
            name: 'Size',
            options: sizes,
            position: 1,
          },
        });
        legacyGroups.push({ name: 'Size', options: sizes, position: 1 });
      }

      const totalVariations = calculateVariationCount(legacyGroups);
      const generatedVariations = generateVariations({
        productSlug: slug,
        variationGroups: legacyGroups,
        basePrice: parseFloat(sale_price.toString()),
        baseStock: Math.floor(parseInt(stock.toString(), 10) / totalVariations),
      });

      for (const variation of generatedVariations) {
        const created = await prisma.product_variations.create({
          data: {
            productId: newProduct.id,
            sku: variation.sku,
            attributes: variation.attributes,
            price: variation.price,
            stock: variation.stock,
            isActive: true,
            isDeleted: false,
          },
        });
        createdVariations.push(created);
      }

      await prisma.products.update({
        where: { id: newProduct.id },
        data: { hasVariations: true },
      });

      console.log(`✅ [VARIATIONS] Created ${createdVariations.length} variations from legacy system`);
      
    } else {
      // SIMPLE PRODUCT: Create single default variation
      console.log(`📦 [VARIATIONS] Creating default variation for simple product`);
      
      const defaultVariation = generateDefaultVariation(
        slug,
        parseFloat(sale_price.toString()),
        parseInt(stock.toString(), 10)
      );

      const created = await prisma.product_variations.create({
        data: {
          productId: newProduct.id,
          sku: defaultVariation.sku,
          attributes: defaultVariation.attributes,
          price: defaultVariation.price,
          stock: defaultVariation.stock,
          isActive: true,
          isDeleted: false,
        },
      });

      createdVariations.push(created);

      await prisma.products.update({
        where: { id: newProduct.id },
        data: { hasVariations: true },
      });

      console.log(`✅ [VARIATIONS] Created default variation`);
    }
  } catch (variationError: any) {
    console.error("❌ [VARIATIONS ERROR]:", variationError.message);
    // Continue even if variations fail - product is already created
  }
  // ========== END VARIATION SYSTEM ==========

  // Publish notification event for admin if product needs manual review (not for drafts)
  if (productStatus === 'pending') {
    await broadcastNotificationToAdmins({
      title: "🔍 New Product Pending Review",
      message: `Seller ${req.seller.name || req.seller.email} submitted a new product "${title}" for review.`,
      creatorId: req.seller.id,
      redirect_link: `/dashboard/moderation/pending-products`,
    });
  } else if (productStatus === 'draft') {
    console.log("📝 [DEBUG] Draft saved - no notification sent");
  }

  res.status(200).json({
    success: true,
    newProduct,
    variations: createdVariations,
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
      isDraft,
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

    if (isDraft) {
      newStatus = 'draft';
      requiresReReview = false;
    }
    // If product was rejected, resubmitting should set it to pending for review
    else if (oldProduct.status === 'rejected') {
      requiresReReview = true;
      newStatus = 'pending';
      
      // Run auto moderation on updated product
      const moderationResult = await checkProductModeration({
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
        const moderationResult = await checkProductModeration({
          title: title || oldProduct.title,
          short_description: short_description || oldProduct.short_description,
          detailed_description: detailed_description || oldProduct.detailed_description,
          tags: processedTags,
          category: category || oldProduct.category,
          brand: brand || oldProduct.brand || undefined,
        });

        // If auto moderation rejects, set to rejected
        // IMPORTANT: Do NOT auto-approve when there are significant changes
        // Significant changes MUST go through manual admin review
        if (moderationResult.shouldReject) {
          newStatus = 'rejected';
          requiresReReview = false; // Already rejected, no need to review
        }
        // else: keep status as 'pending' for manual review
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
      
      await broadcastNotificationToAdmins({
        title: "🔄 Product Update Pending Review",
        message: `Seller ${req.seller.name || req.seller.email} ${actionText}: "${updatedProduct.title}".`,
        creatorId: req.seller.id,
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
        variations: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' }
        },
        variationGroups: {
          orderBy: { position: 'asc' }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Transform to include variations array for backwards compatibility
    const transformedProducts = products.map(product => ({
      ...product,
      variations: product.variations || []
    }));
    
    return res.status(200).json({
      success: true,
      products: transformedProducts,
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
        variations: {
          where: { isDeleted: false, isActive: true },
          orderBy: { createdAt: 'asc' }
        },
        variationGroups: {
          orderBy: { position: 'asc' }
        }
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

// get public shop products
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
        currentPage: page,
        totalPages,
        totalItems: total,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    return next(error);
  }
};

// Submit draft product for review
export const submitDraftForReview = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return next(new ValidationError("Product ID is required"));
    }

    // Find the draft product
    const product = await prisma.products.findUnique({
      where: { id: productId },
      include: { shops: { include: { sellers: true } } }
    });

    if (!product) {
      return next(new NotFoundError("Product not found"));
    }

    // Verify seller owns this product
    if (product.shops?.sellers?.id !== req.seller.id) {
      return next(new AuthError("You don't have permission to modify this product"));
    }

    // Check if product is draft
    if (product.status !== 'draft') {
      return next(new ValidationError("Only draft products can be submitted for review"));
    }

    // Validate required fields before submission
    if (!product.short_description || !product.category || 
        product.stock === undefined || product.stock === null || 
        !product.sale_price || !product.regular_price) {
      const missingFields = [];
      if (!product.short_description) missingFields.push('short_description');
      if (!product.category) missingFields.push('category');
      if (product.stock === undefined || product.stock === null) missingFields.push('stock');
      if (!product.sale_price) missingFields.push('sale_price');
      if (!product.regular_price) missingFields.push('regular_price');
      
      return next(new ValidationError(
        `Cannot submit draft - missing required fields: ${missingFields.join(', ')}`
      ));
    }

    // Run auto moderation
    const moderationResult = await checkProductModeration({
      title: product.title,
      short_description: product.short_description,
      detailed_description: product.detailed_description || '',
      tags: product.tags,
      category: product.category,
      brand: product.brand || undefined,
    });

    // Determine new status
    let newStatus: 'active' | 'pending' | 'rejected' = 'pending';
    let rejectionReason: string | null = null;
    let isAutoModerated = false;

    if (moderationResult.shouldReject) {
      newStatus = 'rejected';
      rejectionReason = moderationResult.reasons.join(', ');
      isAutoModerated = true;
    } else if (moderationResult.shouldApprove) {
      newStatus = 'active';
      isAutoModerated = true;
    }

    // Update product
    const updatedProduct = await prisma.products.update({
      where: { id: productId },
      data: {
        status: newStatus,
        submittedAt: new Date(),
        isAutoModerated,
        moderationScore: moderationResult.moderationScore,
        rejectionReason,
      },
      include: { images: true }
    });

    // Create history entry
    await prisma.product_history.create({
      data: {
        productId: updatedProduct.id,
        changedBy: req.seller.id,
        changeType: isAutoModerated ? 'auto_moderation' : 'edit',
        changes: {
          action: 'draft_submitted',
          oldStatus: 'draft',
          newStatus,
          moderationScore: moderationResult.moderationScore,
          autoModerated: isAutoModerated,
        },
        reason: rejectionReason,
      },
    });

    // Send notification to admin if needs manual review
    if (newStatus === 'pending') {
      await broadcastNotificationToAdmins({
        title: "🔍 Draft Product Submitted for Review",
        message: `Seller ${req.seller.name || req.seller.email} submitted draft product "${product.title}" for review.`,
        creatorId: req.seller.id,
        redirect_link: `/dashboard/moderation/pending-products`,
      });
    }

    return res.status(200).json({
      success: true,
      product: updatedProduct,
      moderationResult: {
        status: newStatus,
        isAutoModerated,
        moderationScore: moderationResult.moderationScore,
        message: newStatus === 'active' 
          ? 'Product auto-approved and is now live!' 
          : newStatus === 'rejected'
          ? 'Product auto-rejected. Please review and fix issues.'
          : 'Product submitted for manual review.'
      }
    });
  } catch (error) {
    console.error("❌ [ERROR] Submit Draft Failed:", error);
    return next(error);
  }
};

// Get product history
export const getProductHistory = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return next(new ValidationError("Product ID is required"));
    }

    // Find the product and verify ownership (for sellers) or allow for admins
    const product = await prisma.products.findUnique({
      where: { id: productId },
      include: { shops: { include: { sellers: true } } }
    });

    if (!product) {
      return next(new NotFoundError("Product not found"));
    }

    // Check permissions
    const isSeller = req.seller?.id === product.shops?.sellers?.id;
    const isAdmin = req.admin || req.user?.role === 'admin';

    if (!isSeller && !isAdmin) {
      return next(new AuthError("You don't have permission to view this product's history"));
    }

    // Fetch product history
    const history = await prisma.product_history.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to last 50 entries
    });

    // Enrich history with user information
    const enrichedHistory = await Promise.all(
      history.map(async (entry) => {
        let changedByName = 'System';
        
        // Try to get seller name
        if (entry.changedBy) {
          const seller = await prisma.sellers.findUnique({
            where: { id: entry.changedBy },
            select: { name: true, email: true }
          });
          
          if (seller) {
            changedByName = seller.name || seller.email;
          } else {
            // Try admin
            const admin = await prisma.admins.findUnique({
              where: { id: entry.changedBy },
              select: { name: true, email: true }
            });
            
            if (admin) {
              changedByName = `Admin: ${admin.name || admin.email}`;
            }
          }
        }

        return {
          ...entry,
          changedByName
        };
      })
    );

    res.status(200).json({
      success: true,
      history: enrichedHistory,
      product: {
        id: product.id,
        title: product.title,
        status: product.status
      }
    });
  } catch (error) {
    console.error("❌ [ERROR] Get Product History Failed:", error);
    return next(error);
  }
};

// ========== VARIATION MANAGEMENT ENDPOINTS ==========

/**
 * Get all variations for a product
 * GET /product/api/:productId/variations
 */
export const getProductVariations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;

    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: { id: true, title: true, hasVariations: true },
    });

    if (!product) {
      return next(new NotFoundError("Product not found"));
    }

    const variationGroups = await prisma.variation_groups.findMany({
      where: { productId },
      orderBy: { position: 'asc' },
    });

    const variations = await prisma.product_variations.findMany({
      where: { 
        productId,
        isDeleted: false, // Only return non-deleted variations
      },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json({
      success: true,
      product: {
        id: product.id,
        title: product.title,
        hasVariations: product.hasVariations,
      },
      variationGroups,
      variations,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Update a specific variation
 * PUT /product/api/variations/:variationId
 */
export const updateProductVariation = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { variationId } = req.params;
    const { price, stock, isActive } = req.body;

    const variation = await prisma.product_variations.findUnique({
      where: { id: variationId },
      include: { product: { include: { shops: true } } },
    });

    if (!variation) {
      return next(new NotFoundError("Variation not found"));
    }

    // Verify seller owns this product
    const shopId = req.seller?.shops?.id;
    if (variation.product.shopId !== shopId) {
      return next(new AuthError("You are not authorized to update this variation"));
    }

    // Prevent deactivating if there are orders
    if (isActive === false && variation.hasOrders) {
      return next(new ValidationError("Cannot deactivate variation with existing orders. Use soft delete instead."));
    }

    const updated = await prisma.product_variations.update({
      where: { id: variationId },
      data: {
        ...(price !== undefined && { price: parseFloat(price.toString()) }),
        ...(stock !== undefined && { stock: parseInt(stock.toString(), 10) }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.status(200).json({
      success: true,
      variation: updated,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Soft delete a variation (NEVER hard delete if hasOrders = true)
 * DELETE /product/api/variations/:variationId
 */
export const deleteProductVariation = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { variationId } = req.params;

    const variation = await prisma.product_variations.findUnique({
      where: { id: variationId },
      include: { product: { include: { shops: true } } },
    });

    if (!variation) {
      return next(new NotFoundError("Variation not found"));
    }

    // Verify seller owns this product
    const shopId = req.seller?.shops?.id;
    if (variation.product.shopId !== shopId) {
      return next(new AuthError("You are not authorized to delete this variation"));
    }

    // SOFT DELETE ONLY - Never hard delete if has orders
    if (variation.hasOrders) {
      console.log(`⚠️ [SOFT DELETE] Variation ${variationId} has orders - performing soft delete`);
      
      const updated = await prisma.product_variations.update({
        where: { id: variationId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          isActive: false,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Variation soft deleted (has existing orders)",
        variation: updated,
      });
    }

    // Check if variation has any orders
    const orderCount = await prisma.order_items.count({
      where: { variationId },
    });

    if (orderCount > 0) {
      // Update hasOrders flag and soft delete
      const updated = await prisma.product_variations.update({
        where: { id: variationId },
        data: {
          hasOrders: true,
          isDeleted: true,
          deletedAt: new Date(),
          isActive: false,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Variation soft deleted (has existing orders)",
        variation: updated,
      });
    }

    // Safe to hard delete (no orders)
    await prisma.product_variations.delete({
      where: { id: variationId },
    });

    res.status(200).json({
      success: true,
      message: "Variation permanently deleted",
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Bulk update variations
 * PUT /product/api/:productId/variations/bulk
 */
export const bulkUpdateVariations = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { updates } = req.body; // Array of {variationId, price, stock, isActive}

    if (!Array.isArray(updates) || updates.length === 0) {
      return next(new ValidationError("Updates array is required"));
    }

    const product = await prisma.products.findUnique({
      where: { id: productId },
      include: { shops: true },
    });

    if (!product) {
      return next(new NotFoundError("Product not found"));
    }

    // Verify seller owns this product
    const shopId = req.seller?.shops?.id;
    if (product.shopId !== shopId) {
      return next(new AuthError("You are not authorized to update this product"));
    }

    const updatedVariations = [];
    const errors = [];

    for (const update of updates) {
      try {
        const variation = await prisma.product_variations.findUnique({
          where: { id: update.variationId },
        });

        if (!variation || variation.productId !== productId) {
          errors.push({ variationId: update.variationId, error: "Variation not found" });
          continue;
        }

        const updated = await prisma.product_variations.update({
          where: { id: update.variationId },
          data: {
            ...(update.price !== undefined && { price: parseFloat(update.price.toString()) }),
            ...(update.stock !== undefined && { stock: parseInt(update.stock.toString(), 10) }),
            ...(update.isActive !== undefined && { isActive: update.isActive }),
          },
        });

        updatedVariations.push(updated);
      } catch (err: any) {
        errors.push({ variationId: update.variationId, error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      updated: updatedVariations.length,
      variations: updatedVariations,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Quick update variation stock
 * PUT /product/api/update-variation-stock/:productId/:variationId
 */
export const updateVariationStock = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId, variationId } = req.params;
    const { stock } = req.body;

    if (stock === undefined || stock === null) {
      return next(new ValidationError("Stock is required"));
    }

    const stockValue = parseInt(stock.toString(), 10);
    if (isNaN(stockValue) || stockValue < 0) {
      return next(new ValidationError("Stock must be a non-negative number"));
    }

    // Get product and variation in one query
    const product = await prisma.products.findUnique({
      where: { id: productId },
      include: {
        variations: {
          where: { id: variationId }
        }
      }
    });

    if (!product) {
      return next(new NotFoundError("Product not found"));
    }

    if (product.variations.length === 0) {
      return next(new NotFoundError("Variation not found"));
    }

    // Verify seller owns this product
    const shopId = req.seller?.shops?.id;
    if (product.shopId !== shopId) {
      return next(new AuthError("You are not authorized to update this variation"));
    }

    const variation = product.variations[0];
    const oldStock = variation.stock;

    // Update the variation stock
    const updated = await prisma.product_variations.update({
      where: { id: variationId },
      data: { stock: stockValue }
    });

    // Log the change to product history
    await prisma.product_history.create({
      data: {
        productId,
        changedBy: req.seller.id,
        changeType: 'edit',
        changes: {
          action: "variation_stock_updated",
          variationId,
          variationSku: variation.sku,
          field: "stock",
          oldValue: oldStock,
          newValue: stockValue
        },
      }
    });

    res.status(200).json({
      success: true,
      message: "Variation stock updated successfully",
      variation: updated
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Quick update variation price
 * PUT /product/api/update-variation-price/:productId/:variationId
 */
export const updateVariationPrice = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId, variationId } = req.params;
    const { price } = req.body;

    if (price === undefined || price === null) {
      return next(new ValidationError("Price is required"));
    }

    const priceValue = parseFloat(price.toString());
    if (isNaN(priceValue) || priceValue < 0) {
      return next(new ValidationError("Price must be a non-negative number"));
    }

    // Get product and variation in one query
    const product = await prisma.products.findUnique({
      where: { id: productId },
      include: {
        variations: {
          where: { id: variationId }
        }
      }
    });

    if (!product) {
      return next(new NotFoundError("Product not found"));
    }

    if (product.variations.length === 0) {
      return next(new NotFoundError("Variation not found"));
    }

    // Verify seller owns this product
    const shopId = req.seller?.shops?.id;
    if (product.shopId !== shopId) {
      return next(new AuthError("You are not authorized to update this variation"));
    }

    const variation = product.variations[0];
    const oldPrice = variation.price;

    // Update the variation price
    const updated = await prisma.product_variations.update({
      where: { id: variationId },
      data: { price: priceValue }
    });

    // Log the change to product history
    await prisma.product_history.create({
      data: {
        productId,
        changedBy: req.seller.id,
        changeType: 'edit',
        changes: {
          action: "variation_price_updated",
          variationId,
          variationSku: variation.sku,
          field: "price",
          oldValue: oldPrice,
          newValue: priceValue
        },
      }
    });

    res.status(200).json({
      success: true,
      message: "Variation price updated successfully",
      variation: updated
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Quick update product stock (for products without variations)
 * PUT /product/api/update-product-stock/:productId
 */
export const updateProductStock = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { stock } = req.body;

    if (stock === undefined || stock === null) {
      return next(new ValidationError("Stock is required"));
    }

    const stockValue = parseInt(stock.toString(), 10);
    if (isNaN(stockValue) || stockValue < 0) {
      return next(new ValidationError("Stock must be a non-negative number"));
    }

    const product = await prisma.products.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return next(new NotFoundError("Product not found"));
    }

    // Verify seller owns this product
    const shopId = req.seller?.shops?.id;
    if (product.shopId !== shopId) {
      return next(new AuthError("You are not authorized to update this product"));
    }

    const oldStock = product.stock;

    // Update the product stock
    const updated = await prisma.products.update({
      where: { id: productId },
      data: { stock: stockValue }
    });

    // Log the change to product history
    await prisma.product_history.create({
      data: {
        productId,
        changedBy: req.seller.id,
        changeType: 'edit',
        changes: {
          action: "stock_updated",
          field: "stock",
          oldValue: oldStock,
          newValue: stockValue
        },
      }
    });

    res.status(200).json({
      success: true,
      message: "Product stock updated successfully",
      product: updated
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Quick update product price (for products without variations)
 * PUT /product/api/update-product-price/:productId
 */
export const updateProductPrice = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { price } = req.body;

    if (price === undefined || price === null) {
      return next(new ValidationError("Price is required"));
    }

    const priceValue = parseFloat(price.toString());
    if (isNaN(priceValue) || priceValue < 0) {
      return next(new ValidationError("Price must be a non-negative number"));
    }

    const product = await prisma.products.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return next(new NotFoundError("Product not found"));
    }

    // Verify seller owns this product
    const shopId = req.seller?.shops?.id;
    if (product.shopId !== shopId) {
      return next(new AuthError("You are not authorized to update this product"));
    }

    // Price cannot be higher than regular_price
    if (product.regular_price && priceValue > product.regular_price) {
      return next(new ValidationError("Price cannot be higher than regular price"));
    }

    const oldPrice = product.sale_price;

    // Update the product price
    const updated = await prisma.products.update({
      where: { id: productId },
      data: { sale_price: priceValue }
    });

    // Log the change to product history
    await prisma.product_history.create({
      data: {
        productId,
        changedBy: req.seller.id,
        changeType: 'edit',
        changes: {
          action: "price_updated",
          field: "sale_price",
          oldValue: oldPrice,
          newValue: priceValue
        },
      }
    });

    res.status(200).json({
      success: true,
      message: "Product price updated successfully",
      product: updated
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Bulk hide products
 * PUT /product/api/bulk-hide-products
 */
export const bulkHideProducts = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return next(new ValidationError("Product IDs array is required"));
    }

    const shopId = req.seller?.shops?.id;

    // Verify all products belong to the seller
    const products = await prisma.products.findMany({
      where: {
        id: { in: productIds },
        shopId
      }
    });

    if (products.length !== productIds.length) {
      return next(new AuthError("Some products do not belong to your shop"));
    }

    // Update products to hidden status
    const result = await prisma.products.updateMany({
      where: {
        id: { in: productIds },
        shopId
      },
      data: {
        status: "hidden"
      }
    });

    // Log the change for each product
    for (const productId of productIds) {
      await prisma.product_history.create({
        data: {
          productId,
          changedBy: req.seller.id,
          changeType: 'edit',
          changes: {
            action: "bulk_hide",
            field: "status",
            newValue: "hidden"
          },
        }
      });
    }

    res.status(200).json({
      success: true,
      message: `${result.count} products hidden successfully`,
      count: result.count
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Bulk delete products (soft delete)
 * DELETE /product/api/bulk-delete-products
 */
export const bulkDeleteProducts = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return next(new ValidationError("Product IDs array is required"));
    }

    const shopId = req.seller?.shops?.id;

    // Verify all products belong to the seller
    const products = await prisma.products.findMany({
      where: {
        id: { in: productIds },
        shopId
      }
    });

    if (products.length !== productIds.length) {
      return next(new AuthError("Some products do not belong to your shop"));
    }

    // Soft delete products
    const result = await prisma.products.updateMany({
      where: {
        id: { in: productIds },
        shopId
      },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    // Log the change for each product
    for (const productId of productIds) {
      await prisma.product_history.create({
        data: {
          productId,
          changedBy: req.seller.id,
          changeType: 'edit',
          changes: {
            action: "bulk_delete",
            field: "isDeleted",
            newValue: true
          },
        }
      });
    }

    res.status(200).json({
      success: true,
      message: `${result.count} products deleted successfully`,
      count: result.count
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get shop events (products with starting_date and ending_date)
 * GET /product/api/get-shop-events
 */
export const getShopEvents = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (!req.seller || !req.seller.id) {
      return res.status(401).json({ success: false, message: "Unauthorized: Seller information missing" });
    }

    const shopId = req.seller?.shops?.id;
    if (!shopId) {
      return res.status(400).json({ success: false, message: "Seller must have a shop. Please create a shop first." });
    }
    
    // Get products that have starting_date and ending_date (events)
    const events = await prisma.products.findMany({
      where: {
        shopId,
        isDeleted: false,
        starting_date: { not: null } as any,
        ending_date: { not: null } as any,
      },
      include: {
        images: true,
        variations: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' }
        },
      },
      orderBy: {
        starting_date: 'desc'
      }
    });
    
    return res.status(200).json({
      success: true,
      events,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Update event dates (starting_date and ending_date)
 * PUT /product/api/update-event-dates/:productId
 */
export const updateEventDates = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { starting_date, ending_date } = req.body;

    if (!starting_date || !ending_date) {
      return next(new ValidationError("Starting date and ending date are required"));
    }

    const shopId = req.seller?.shops?.id;
    if (!shopId) {
      return next(new ValidationError("Seller must have a shop"));
    }

    // Find the product
    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: { id: true, shopId: true }
    });

    if (!product) {
      return next(new NotFoundError("Product not found"));
    }

    // Verify product belongs to seller's shop
    if (product.shopId !== shopId) {
      return next(new AuthError("You are not authorized to modify this product"));
    }

    // Validate dates
    const startDate = new Date(starting_date);
    const endDate = new Date(ending_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return next(new ValidationError("Invalid date format"));
    }

    if (endDate <= startDate) {
      return next(new ValidationError("Ending date must be after starting date"));
    }

    // Update product with event dates
    const updatedProduct = await prisma.products.update({
      where: { id: productId },
      data: {
        starting_date: startDate,
        ending_date: endDate
      },
      include: { images: true }
    });

    // Log the change to product history
    await prisma.product_history.create({
      data: {
        productId,
        changedBy: req.seller.id,
        changeType: 'edit',
        changes: {
          action: "event_dates_updated",
          field: "event_dates",
          starting_date: startDate.toISOString(),
          ending_date: endDate.toISOString()
        },
      }
    });

    res.status(200).json({
      success: true,
      message: "Event dates updated successfully",
      product: updatedProduct
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Toggle hide/show product
 * PUT /product/api/toggle-hide-product/:productId
 */
export const toggleHideProduct = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return next(new ValidationError("Product ID is required"));
    }

    const shopId = req.seller?.shops?.id;
    if (!shopId) {
      return next(new ValidationError("Seller must have a shop"));
    }

    // Find the product
    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: { id: true, shopId: true, status: true, isDeleted: true }
    });

    if (!product) {
      return next(new NotFoundError("Product not found"));
    }

    // Verify product belongs to seller's shop
    if (product.shopId !== shopId) {
      return next(new AuthError("You are not authorized to modify this product"));
    }

    // Cannot hide deleted products
    if (product.isDeleted) {
      return next(new ValidationError("Cannot hide a deleted product"));
    }

    // Determine new status: toggle between 'active' and 'hidden'
    const newStatus = product.status === 'hidden' ? 'active' : 'hidden';
    const oldStatus = product.status;

    // Update product status
    const updatedProduct = await prisma.products.update({
      where: { id: productId },
      data: { status: newStatus }
    });

    // Log the change to product history
    await prisma.product_history.create({
      data: {
        productId,
        changedBy: req.seller.id,
        changeType: 'edit',
        changes: {
          action: "toggle_visibility",
          field: "status",
          oldValue: oldStatus,
          newValue: newStatus
        },
      }
    });

    res.status(200).json({
      success: true,
      message: `Product ${newStatus === 'hidden' ? 'hidden' : 'shown'} successfully`,
      product: updatedProduct
    });
  } catch (error) {
    return next(error);
  }
};