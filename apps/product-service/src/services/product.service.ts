import { BaseService } from '@packages/base';
import { ProductRepository } from '../repositories/product.repository';
import { 
  CreateProductDto, 
  UpdateProductDto, 
  ProductQueryDto,
  ProductResponseDto 
} from '../dto/product.dto';
import { ValidationError, NotFoundError, AuthError } from '@packages/error-handler';
import { checkProductModeration } from './auto-moderation.service';
import { detectSignificantChanges } from './product-change-detector.service';
import { 
  generateVariations, 
  generateDefaultVariation, 
  validateVariationGroups,
  calculateVariationCount,
  VariationGroup 
} from '@packages/utils/variation-generator';
import prisma from '@packages/libs/prisma';
import { broadcastNotificationToAdmins } from '@packages/utils/kafka/producer';

export class ProductService extends BaseService<ProductRepository> {
  constructor() {
    super(new ProductRepository());
  }

  /**
   * Get product categories
   */
  async getCategories() {
    const config = await prisma.site_config.findFirst();
    if (!config) {
      throw new NotFoundError('Site configuration not found');
    }
    return {
      categories: config.categories,
      subCategories: config.subCategories,
    };
  }

  /**
   * Create a new product
   */
  async createProduct(
    data: CreateProductDto,
    sellerId: string,
    shopId: string
  ): Promise<{ product: any; variations: any[]; moderationResult: any }> {
    // Validate required fields
    this.validateRequired(data, ['title', 'slug', 'category']);

    if (!data.isDraft) {
      this.validateRequired(data, [
        'short_description',
        'stock',
        'sale_price',
        'regular_price',
      ]);
    }

    // Check if slug exists
    if (await this.repository.slugExists(data.slug)) {
      throw new ValidationError('Slug already exists');
    }

    // Get shop to verify seller owns it
    const shop = await prisma.shops.findUnique({
      where: { id: shopId },
      include: { sellers: true },
    });

    if (!shop || shop.sellerId !== sellerId) {
      throw new AuthError('Seller must have a shop');
    }

    // Process tags
    const processedTags = this.processTags(data.tags);

    // Process discount codes
    const processedDiscountCodes = this.processDiscountCodes(data.discount_codes);

    // Determine product status based on draft flag and moderation
    let productStatus: 'active' | 'pending' | 'rejected' | 'draft' = 'pending';
    let rejectionReason: string | null = null;
    let isAutoModerated = false;
    let moderationResult: any = { moderationScore: 0, reasons: [], shouldApprove: false, shouldReject: false };

    if (data.isDraft) {
      productStatus = 'draft';
    } else {
      moderationResult = await checkProductModeration({
        title: data.title,
        short_description: data.short_description || '',
        detailed_description: data.detailed_description || '',
        tags: processedTags,
        category: data.category,
        brand: data.brand,
      });

      if (moderationResult.shouldReject) {
        productStatus = 'rejected';
        rejectionReason = moderationResult.reasons.join(', ');
        isAutoModerated = true;
      } else if (moderationResult.shouldApprove) {
        productStatus = 'active';
        isAutoModerated = true;
      } else {
        productStatus = 'pending';
      }
    }

    // Create product
    const newProduct = await this.repository.create({
      title: data.title,
      short_description: data.short_description || '',
      detailed_description: data.detailed_description || '',
      warranty: data.warranty || null,
      cashOnDelivery: data.cash_on_delivery || null,
      slug: data.slug,
      shopId,
      tags: processedTags,
      brand: data.brand || null,
      video_url: data.video_url || null,
      category: data.category,
      subCategory: data.subCategory || '',
      colors: Array.isArray(data.colors) ? data.colors : [],
      discount_codes: processedDiscountCodes,
      sizes: Array.isArray(data.sizes) ? data.sizes : [],
      stock: parseInt(data.stock.toString(), 10),
      sale_price: parseFloat(data.sale_price.toString()),
      regular_price: parseFloat(data.regular_price.toString()),
      custom_specifications: data.custom_specifications || {},
      custom_properties: data.custom_properties || {},
      starting_date: data.starting_date ? new Date(data.starting_date) : new Date(),
      ending_date: data.ending_date ? new Date(data.ending_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: productStatus,
      submittedAt: new Date(),
      isAutoModerated,
      moderationScore: moderationResult.moderationScore,
      rejectionReason,
      images: {
        create: (data.images || [])
          .filter((img) => img && img.fileId && img.file_url)
          .map((img) => ({
            file_id: img.fileId,
            url: img.file_url,
          })),
      },
    }, { images: true });

    // Create product history entry
    await this.repository.createHistoryEntry({
      productId: newProduct.id,
      changedBy: sellerId,
      changeType: isAutoModerated ? 'auto_moderation' : 'edit',
      changes: {
        action: 'created',
        title: data.title,
        category: data.category,
        status: productStatus,
        moderationScore: moderationResult.moderationScore,
        autoModerated: isAutoModerated,
      },
      reason: rejectionReason,
    });

    // Handle variations
    const createdVariations = await this.createProductVariations(
      newProduct.id,
      data.slug,
      data.variationGroups || [],
      data.variations || [],
      data.colors || [],
      data.sizes || [],
      data.sale_price,
      data.stock
    );

    // Publish notification for admin if product needs manual review
    if (productStatus === 'pending') {
      await broadcastNotificationToAdmins({
        title: '🔍 New Product Pending Review',
        message: `Seller ${shop.sellers?.name || shop.sellers?.email} submitted a new product "${data.title}" for review.`,
        creatorId: sellerId,
        redirect_link: '/dashboard/moderation/pending-products',
      });
    }

    return {
      product: newProduct,
      variations: createdVariations,
      moderationResult: {
        status: productStatus,
        isAutoModerated,
        moderationScore: moderationResult.moderationScore,
      },
    };
  }

  /**
   * Update product
   */
  async updateProduct(
    productId: string,
    data: UpdateProductDto,
    sellerId: string,
    shopId: string
  ): Promise<{ product: any; requiresReReview: boolean }> {
    // Get old product
    const oldProduct = await this.repository.findById(productId, { images: true });
    if (!oldProduct) {
      throw new NotFoundError('Product not found');
    }

    // Verify product belongs to seller's shop
    if (oldProduct.shopId !== shopId) {
      throw new AuthError('You are not authorized to update this product');
    }

    // Process tags and discount codes
    const processedTags = data.tags ? this.processTags(data.tags) : undefined;
    const processedDiscountCodes = data.discount_codes 
      ? this.processDiscountCodes(data.discount_codes) 
      : undefined;

    // Detect significant changes if product is active
    let requiresReReview = false;
    let newStatus = oldProduct.status;

    if (data.isDraft) {
      newStatus = 'draft';
      requiresReReview = false;
    } else if (oldProduct.status === 'rejected') {
      requiresReReview = true;
      newStatus = 'pending';
      
      const moderationResult = await checkProductModeration({
        title: data.title || oldProduct.title,
        short_description: data.short_description || oldProduct.short_description,
        detailed_description: data.detailed_description || oldProduct.detailed_description || '',
        tags: processedTags || oldProduct.tags,
        category: data.category || oldProduct.category,
        brand: data.brand || oldProduct.brand,
      });

      if (moderationResult.shouldReject) {
        newStatus = 'rejected';
        requiresReReview = false;
      } else if (moderationResult.shouldApprove) {
        requiresReReview = false;
        newStatus = 'active';
      }
    } else if (oldProduct.status === 'active') {
      const changeResult = detectSignificantChanges(
        {
          title: oldProduct.title,
          short_description: oldProduct.short_description,
          detailed_description: oldProduct.detailed_description || '',
          category: oldProduct.category,
          subCategory: oldProduct.subCategory || '',
          sale_price: oldProduct.sale_price,
          regular_price: oldProduct.regular_price,
          images: oldProduct.images as any,
          brand: oldProduct.brand || '',
        },
        {
          title: data.title || oldProduct.title,
          short_description: data.short_description || oldProduct.short_description,
          detailed_description: data.detailed_description || oldProduct.detailed_description || '',
          category: data.category || oldProduct.category,
          subCategory: data.subCategory || oldProduct.subCategory || '',
          sale_price: data.sale_price || oldProduct.sale_price,
          regular_price: data.regular_price || oldProduct.regular_price,
          images: data.images || oldProduct.images as any,
          brand: data.brand || oldProduct.brand || '',
        }
      );

      if (changeResult.hasSignificantChanges) {
        requiresReReview = true;
        newStatus = 'pending';

        const moderationResult = await checkProductModeration({
          title: data.title || oldProduct.title,
          short_description: data.short_description || oldProduct.short_description,
          detailed_description: data.detailed_description || oldProduct.detailed_description,
          tags: processedTags || oldProduct.tags,
          category: data.category || oldProduct.category,
          brand: data.brand || oldProduct.brand,
        });

        if (moderationResult.shouldReject) {
          newStatus = 'rejected';
          requiresReReview = false;
        }
      }
    }

    // Update product
    const updateData: any = {
      ...(data.title && { title: data.title }),
      ...(data.short_description !== undefined && { short_description: data.short_description }),
      ...(data.detailed_description !== undefined && { detailed_description: data.detailed_description }),
      ...(data.warranty !== undefined && { warranty: data.warranty }),
      ...(data.cash_on_delivery !== undefined && { cashOnDelivery: data.cash_on_delivery }),
      ...(data.slug && { slug: data.slug }),
      ...(processedTags && { tags: processedTags }),
      ...(data.brand !== undefined && { brand: data.brand }),
      ...(data.video_url !== undefined && { video_url: data.video_url }),
      ...(data.category && { category: data.category }),
      ...(data.subCategory !== undefined && { subCategory: data.subCategory }),
      ...(data.colors && Array.isArray(data.colors) && data.colors.length > 0 && { colors: data.colors }),
      ...(processedDiscountCodes && { discount_codes: processedDiscountCodes }),
      ...(data.sizes && Array.isArray(data.sizes) && data.sizes.length > 0 && { sizes: data.sizes }),
      ...(data.stock !== undefined && { stock: parseInt(data.stock.toString(), 10) }),
      ...(data.sale_price !== undefined && { sale_price: parseFloat(data.sale_price.toString()) }),
      ...(data.regular_price !== undefined && { regular_price: parseFloat(data.regular_price.toString()) }),
      ...(data.custom_specifications && { custom_specifications: data.custom_specifications }),
      ...(data.custom_properties && { custom_properties: data.custom_properties }),
      ...(data.starting_date && { starting_date: new Date(data.starting_date) }),
      ...(data.ending_date && { ending_date: new Date(data.ending_date) }),
      status: newStatus,
      requiresReReview,
      ...(requiresReReview && { submittedAt: new Date() }),
    };

    if (data.images && data.images.length > 0) {
      updateData.images = {
        deleteMany: {},
        create: data.images
          .filter((img) => img && img.fileId && img.file_url)
          .map((img) => ({
            file_id: img.fileId,
            url: img.file_url,
          })),
      };
    }

    const updatedProduct = await this.repository.update(productId, updateData, { images: true });

    // Create product history entry
    await this.repository.createHistoryEntry({
      productId: updatedProduct.id,
      changedBy: sellerId,
      changeType: requiresReReview ? 'edit_requires_review' : 'edit',
      changes: {
        action: 'updated',
        status: newStatus,
        requiresReReview,
      },
    });

    // Publish notification if needed
    if (newStatus === 'pending' && (requiresReReview || oldProduct.status === 'rejected')) {
      const actionText = oldProduct.status === 'rejected' 
        ? 'resubmitted a previously rejected product' 
        : 'updated a product that requires re-review';
      
      await broadcastNotificationToAdmins({
        title: '🔄 Product Update Pending Review',
        message: `Seller ${sellerId} ${actionText}: "${updatedProduct.title}".`,
        creatorId: sellerId,
        redirect_link: '/dashboard/moderation/pending-products',
      });
    }

    return {
      product: updatedProduct,
      requiresReReview,
    };
  }

  /**
   * Get products with pagination and filters
   */
  async getProducts(query: ProductQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filters: any = {
      ...(query.category && { category: query.category }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { tags: { has: query.search } },
          { brand: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.priceRange && {
        sale_price: {
          gte: query.priceRange[0],
          lte: query.priceRange[1],
        },
      }),
      ...(query.colors && query.colors.length > 0 && {
        colors: { hasSome: query.colors },
      }),
      ...(query.sizes && query.sizes.length > 0 && {
        sizes: { hasSome: query.sizes },
      }),
      ...(query.categories && query.categories.length > 0 && {
        category: { in: query.categories },
      }),
    };

    const orderBy = this.getOrderBy(query.sortBy || query.type);

    const [products, total] = await Promise.all([
      this.repository.findActiveProducts(filters, {
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
        skip,
        take: limit,
      }),
      this.repository.count({
        isDeleted: false,
        status: 'active',
        ...filters,
      }),
    ]);

    return {
      products,
      total,
      pagination: this.calculatePagination(total, page, limit),
    };
  }

  /**
   * Get product by slug
   */
  async getProductBySlug(slug: string) {
    const product = await this.repository.findBySlug(slug, {
      images: true,
      shops: {
        select: {
          id: true,
          name: true,
          rating: true,
          images: true,
          avatar: true,
        },
      },
      variations: {
        where: { isDeleted: false, isActive: true },
        orderBy: { createdAt: 'asc' },
      },
      variationGroups: {
        orderBy: { position: 'asc' },
      },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return product;
  }

  /**
   * Get shop products
   */
  async getShopProducts(shopId: string) {
    return await this.repository.findByShopId(shopId, {
      include: {
        images: true,
        variations: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' },
        },
        variationGroups: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(productId: string, shopId: string) {
    const product = await this.repository.findById(productId);
    
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product.shopId !== shopId) {
      throw new AuthError('You are not authorized to delete this product');
    }

    if (product.isDeleted) {
      throw new ValidationError('Product is already in deleted state');
    }

    return await this.repository.softDelete(productId);
  }

  /**
   * Restore deleted product
   */
  async restoreProduct(productId: string, shopId: string) {
    const product = await this.repository.findById(productId);
    
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product.shopId !== shopId) {
      throw new AuthError('You are not authorized to restore this product');
    }

    if (!product.isDeleted) {
      throw new ValidationError('Product is not in deleted state');
    }

    return await this.repository.restore(productId);
  }

  /**
   * Submit draft for review
   */
  async submitDraftForReview(productId: string, sellerId: string) {
    const product = await this.repository.findById(productId, {
      shops: { include: { sellers: true } },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if ((product.shops as any)?.sellers?.id !== sellerId) {
      throw new AuthError("You don't have permission to modify this product");
    }

    if (product.status !== 'draft') {
      throw new ValidationError('Only draft products can be submitted for review');
    }

    // Validate required fields
    if (!product.short_description || !product.category || 
        product.stock === undefined || product.stock === null || 
        !product.sale_price || !product.regular_price) {
      throw new ValidationError('Cannot submit draft - missing required fields');
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

    const updatedProduct = await this.repository.updateStatus(productId, newStatus, {
      submittedAt: new Date(),
      isAutoModerated,
      moderationScore: moderationResult.moderationScore,
      rejectionReason,
    });

    // Create history entry
    await this.repository.createHistoryEntry({
      productId: updatedProduct.id,
      changedBy: sellerId,
      changeType: isAutoModerated ? 'auto_moderation' : 'edit',
      changes: {
        action: 'draft_submitted',
        oldStatus: 'draft',
        newStatus,
        moderationScore: moderationResult.moderationScore,
        autoModerated: isAutoModerated,
      },
      reason: rejectionReason,
    });

    // Send notification if needs manual review
    if (newStatus === 'pending') {
      await broadcastNotificationToAdmins({
        title: '🔍 Draft Product Submitted for Review',
        message: `Seller ${sellerId} submitted draft product "${product.title}" for review.`,
        creatorId: sellerId,
        redirect_link: '/dashboard/moderation/pending-products',
      });
    }

    return {
      product: updatedProduct,
      moderationResult: {
        status: newStatus,
        isAutoModerated,
        moderationScore: moderationResult.moderationScore,
      },
    };
  }

  /**
   * Get product history
   */
  async getProductHistory(productId: string, sellerId?: string, isAdmin?: boolean) {
    const product = await this.repository.findById(productId, {
      shops: { include: { sellers: true } },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Check permissions
    const isSeller = sellerId === (product.shops as any)?.sellers?.id;
    if (!isSeller && !isAdmin) {
      throw new AuthError("You don't have permission to view this product's history");
    }

    const history = await this.repository.getProductHistory(productId);

    // Enrich history with user information
    const enrichedHistory = await Promise.all(
      history.map(async (entry) => {
        let changedByName = 'System';
        
        if (entry.changedBy) {
          const seller = await prisma.sellers.findUnique({
            where: { id: entry.changedBy },
            select: { name: true, email: true },
          });
          
          if (seller) {
            changedByName = seller.name || seller.email;
          } else {
            const admin = await prisma.admins.findUnique({
              where: { id: entry.changedBy },
              select: { name: true, email: true },
            });
            
            if (admin) {
              changedByName = `Admin: ${admin.name || admin.email}`;
            }
          }
        }

        return {
          ...entry,
          changedByName,
        };
      })
    );

    return {
      history: enrichedHistory,
      product: {
        id: product.id,
        title: product.title,
        status: product.status,
      },
    };
  }

  // Private helper methods

  private processTags(tags?: string | string[]): string[] {
    if (Array.isArray(tags)) {
      return tags.filter((tag) => tag && tag.trim());
    } else if (typeof tags === 'string' && tags.trim()) {
      return tags.split(',').map((tag) => tag.trim()).filter((tag) => tag);
    }
    return [];
  }

  private processDiscountCodes(codes?: string | string[]): string[] {
    const codeArray = Array.isArray(codes) ? codes : codes ? [codes] : [];
    return codeArray.filter((code: any) => {
      return code && typeof code === 'string' && /^[0-9a-fA-F]{24}$/.test(code);
    });
  }

  private async createProductVariations(
    productId: string,
    slug: string,
    variationGroups: Array<{ name: string; options: string[] }>,
    manualVariations: Array<{ attributes: Record<string, string>; price: number; stock: number }>,
    colors: string[],
    sizes: string[],
    basePrice: number,
    baseStock: number
  ): Promise<any[]> {
    const createdVariations: any[] = [];
    
    try {
      const hasVariationGroups = variationGroups.length > 0;
      const hasLegacyColorsSizes = colors.length > 0 || sizes.length > 0;
      
      if (hasVariationGroups) {
        // Validate variation groups
        const validation = validateVariationGroups(variationGroups);
        if (!validation.valid) {
          throw new ValidationError(`Variation validation failed: ${validation.errors.join(', ')}`);
        }

        const totalVariations = calculateVariationCount(variationGroups);
        if (totalVariations > 100) {
          throw new ValidationError(`Too many variations (${totalVariations}). Maximum is 100.`);
        }

        // Create variation groups
        for (let i = 0; i < variationGroups.length; i++) {
          await prisma.variation_groups.create({
            data: {
              productId,
              name: variationGroups[i].name,
              options: variationGroups[i].options,
              position: i,
            },
          });
        }

        // Generate variations
        const generatedVariations = generateVariations({
          productSlug: slug,
          variationGroups: variationGroups.map((g, i) => ({
            name: g.name,
            options: g.options,
            position: i,
          })),
          basePrice: parseFloat(basePrice.toString()),
          baseStock: Math.floor(parseInt(baseStock.toString(), 10) / totalVariations),
        });

        const finalVariations = manualVariations.length > 0 
          ? generatedVariations.map((gv) => {
              const manual = manualVariations.find((mv) => 
                JSON.stringify(mv.attributes) === JSON.stringify(gv.attributes)
              );
              return manual ? { ...gv, ...manual } : gv;
            })
          : generatedVariations;

        // Create variations
        for (const variation of finalVariations) {
          const created = await prisma.product_variations.create({
            data: {
              productId,
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
          where: { id: productId },
          data: { hasVariations: true },
        });
      } else if (hasLegacyColorsSizes) {
        // Legacy system
        const legacyGroups: VariationGroup[] = [];
        
        if (colors.length > 0) {
          await prisma.variation_groups.create({
            data: {
              productId,
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
              productId,
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
          basePrice: parseFloat(basePrice.toString()),
          baseStock: Math.floor(parseInt(baseStock.toString(), 10) / totalVariations),
        });

        for (const variation of generatedVariations) {
          const created = await prisma.product_variations.create({
            data: {
              productId,
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
          where: { id: productId },
          data: { hasVariations: true },
        });
      } else {
        // Simple product - default variation
        const defaultVariation = generateDefaultVariation(
          slug,
          parseFloat(basePrice.toString()),
          parseInt(baseStock.toString(), 10)
        );

        const created = await prisma.product_variations.create({
          data: {
            productId,
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
          where: { id: productId },
          data: { hasVariations: true },
        });
      }
    } catch (error: any) {
      console.error('❌ [VARIATIONS ERROR]:', error.message);
      // Continue even if variations fail
    }

    return createdVariations;
  }

  private getOrderBy(sortBy?: string): any {
    switch (sortBy) {
      case 'latest':
      case 'lastest':
        return { createdAt: 'desc' };
      case 'price-low':
        return { sale_price: 'asc' };
      case 'price-high':
        return { sale_price: 'desc' };
      case 'rating':
        return { ratings: 'desc' };
      default:
        return { createdAt: 'desc' };
    }
  }
}

