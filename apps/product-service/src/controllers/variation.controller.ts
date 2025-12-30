import { Request, Response, NextFunction } from 'express';
import { ValidationError, NotFoundError, AuthError } from '@packages/error-handler';
import prisma from '@packages/libs/prisma';

/**
 * Helper function to wrap async handlers
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Helper function for success responses
 */
const success = (res: Response, data: any, message?: string, statusCode: number = 200) => {
  return res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    ...(data && { data }),
  });
};

export class VariationController {

  /**
   * Get all variations for a product
   */
  getProductVariations = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;

    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: { id: true, title: true, hasVariations: true },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const [variationGroups, variations] = await Promise.all([
      prisma.variation_groups.findMany({
        where: { productId },
        orderBy: { position: 'asc' },
      }),
      prisma.product_variations.findMany({
        where: {
          productId,
          isDeleted: false,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return success(res, {
      product: {
        id: product.id,
        title: product.title,
        hasVariations: product.hasVariations,
      },
      variationGroups,
      variations,
    });
  });

  /**
   * Update a specific variation
   */
  updateProductVariation = asyncHandler(async (req: any, res: Response) => {
    const { variationId } = req.params;
    const { price, stock, isActive } = req.body;

    const variation = await prisma.product_variations.findUnique({
      where: { id: variationId },
      include: { product: { include: { shops: true } } },
    });

    if (!variation) {
      throw new NotFoundError('Variation not found');
    }

    const shopId = req.seller?.shops?.id;
    if (variation.product.shopId !== shopId) {
      throw new AuthError('You are not authorized to update this variation');
    }

    if (isActive === false && variation.hasOrders) {
      throw new ValidationError('Cannot deactivate variation with existing orders. Use soft delete instead.');
    }

    const updated = await prisma.product_variations.update({
      where: { id: variationId },
      data: {
        ...(price !== undefined && { price: parseFloat(price.toString()) }),
        ...(stock !== undefined && { stock: parseInt(stock.toString(), 10) }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return success(res, { variation: updated });
  });

  /**
   * Soft delete a variation
   */
  deleteProductVariation = asyncHandler(async (req: any, res: Response) => {
    const { variationId } = req.params;

    const variation = await prisma.product_variations.findUnique({
      where: { id: variationId },
      include: { product: { include: { shops: true } } },
    });

    if (!variation) {
      throw new NotFoundError('Variation not found');
    }

    const shopId = req.seller?.shops?.id;
    if (variation.product.shopId !== shopId) {
      throw new AuthError('You are not authorized to delete this variation');
    }

    // SOFT DELETE ONLY - Never hard delete if has orders
    if (variation.hasOrders) {
      const updated = await prisma.product_variations.update({
        where: { id: variationId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          isActive: false,
        },
      });

      return success(res, { variation: updated }, 'Variation soft deleted (has existing orders)');
    }

    // Check if variation has any orders
    const orderCount = await prisma.order_items.count({
      where: { variationId },
    });

    if (orderCount > 0) {
      const updated = await prisma.product_variations.update({
        where: { id: variationId },
        data: {
          hasOrders: true,
          isDeleted: true,
          deletedAt: new Date(),
          isActive: false,
        },
      });

      return success(res, { variation: updated }, 'Variation soft deleted (has existing orders)');
    }

    // Safe to hard delete (no orders)
    await prisma.product_variations.delete({
      where: { id: variationId },
    });

    return success(res, null, 'Variation permanently deleted');
  });

  /**
   * Bulk update variations
   */
  bulkUpdateVariations = asyncHandler(async (req: any, res: Response) => {
    const { productId } = req.params;
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      throw new ValidationError('Updates array is required');
    }

    const product = await prisma.products.findUnique({
      where: { id: productId },
      include: { shops: true },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const shopId = req.seller?.shops?.id;
    if (product.shopId !== shopId) {
      throw new AuthError('You are not authorized to update this product');
    }

    const updatedVariations = [];
    const errors = [];

    for (const update of updates) {
      try {
        const variation = await prisma.product_variations.findUnique({
          where: { id: update.variationId },
        });

        if (!variation || variation.productId !== productId) {
          errors.push({ variationId: update.variationId, error: 'Variation not found' });
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

    return success(res, {
      updated: updatedVariations.length,
      variations: updatedVariations,
      ...(errors.length > 0 && { errors }),
    });
  });

  /**
   * Quick update variation stock
   */
  updateVariationStock = asyncHandler(async (req: any, res: Response) => {
    const { productId, variationId } = req.params;
    const { stock } = req.body;

    if (stock === undefined || stock === null) {
      throw new ValidationError('Stock is required');
    }

    const stockValue = parseInt(stock.toString(), 10);
    if (isNaN(stockValue) || stockValue < 0) {
      throw new ValidationError('Stock must be a non-negative number');
    }

    const product = await prisma.products.findUnique({
      where: { id: productId },
      include: {
        variations: {
          where: { id: variationId },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product.variations.length === 0) {
      throw new NotFoundError('Variation not found');
    }

    const shopId = req.seller?.shops?.id;
    if (product.shopId !== shopId) {
      throw new AuthError('You are not authorized to update this variation');
    }

    const variation = product.variations[0];
    const oldStock = variation.stock;

    const updated = await prisma.product_variations.update({
      where: { id: variationId },
      data: { stock: stockValue },
    });

    await prisma.product_history.create({
      data: {
        productId,
        changedBy: req.seller.id,
        changeType: 'edit',
        changes: {
          action: 'variation_stock_updated',
          variationId,
          variationSku: variation.sku,
          field: 'stock',
          oldValue: oldStock,
          newValue: stockValue,
        },
      },
    });

    return success(res, { variation: updated }, 'Variation stock updated successfully');
  });

  /**
   * Quick update variation price
   */
  updateVariationPrice = asyncHandler(async (req: any, res: Response) => {
    const { productId, variationId } = req.params;
    const { price } = req.body;

    if (price === undefined || price === null) {
      throw new ValidationError('Price is required');
    }

    const priceValue = parseFloat(price.toString());
    if (isNaN(priceValue) || priceValue < 0) {
      throw new ValidationError('Price must be a non-negative number');
    }

    const product = await prisma.products.findUnique({
      where: { id: productId },
      include: {
        variations: {
          where: { id: variationId },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product.variations.length === 0) {
      throw new NotFoundError('Variation not found');
    }

    const shopId = req.seller?.shops?.id;
    if (product.shopId !== shopId) {
      throw new AuthError('You are not authorized to update this variation');
    }

    const variation = product.variations[0];
    const oldPrice = variation.price;

    const updated = await prisma.product_variations.update({
      where: { id: variationId },
      data: { price: priceValue },
    });

    await prisma.product_history.create({
      data: {
        productId,
        changedBy: req.seller.id,
        changeType: 'edit',
        changes: {
          action: 'variation_price_updated',
          variationId,
          variationSku: variation.sku,
          field: 'price',
          oldValue: oldPrice,
          newValue: priceValue,
        },
      },
    });

    return success(res, { variation: updated }, 'Variation price updated successfully');
  });

  /**
   * Quick update product stock (for products without variations)
   */
  updateProductStock = asyncHandler(async (req: any, res: Response) => {
    const { productId } = req.params;
    const { stock } = req.body;

    if (stock === undefined || stock === null) {
      throw new ValidationError('Stock is required');
    }

    const stockValue = parseInt(stock.toString(), 10);
    if (isNaN(stockValue) || stockValue < 0) {
      throw new ValidationError('Stock must be a non-negative number');
    }

    const product = await prisma.products.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const shopId = req.seller?.shops?.id;
    if (product.shopId !== shopId) {
      throw new AuthError('You are not authorized to update this product');
    }

    const oldStock = product.stock;

    const updated = await prisma.products.update({
      where: { id: productId },
      data: { stock: stockValue },
    });

    await prisma.product_history.create({
      data: {
        productId,
        changedBy: req.seller.id,
        changeType: 'edit',
        changes: {
          action: 'stock_updated',
          field: 'stock',
          oldValue: oldStock,
          newValue: stockValue,
        },
      },
    });

    return success(res, { product: updated }, 'Product stock updated successfully');
  });

  /**
   * Quick update product price (for products without variations)
   */
  updateProductPrice = asyncHandler(async (req: any, res: Response) => {
    const { productId } = req.params;
    const { price } = req.body;

    if (price === undefined || price === null) {
      throw new ValidationError('Price is required');
    }

    const priceValue = parseFloat(price.toString());
    if (isNaN(priceValue) || priceValue < 0) {
      throw new ValidationError('Price must be a non-negative number');
    }

    const product = await prisma.products.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const shopId = req.seller?.shops?.id;
    if (product.shopId !== shopId) {
      throw new AuthError('You are not authorized to update this product');
    }

    if (product.regular_price && priceValue > product.regular_price) {
      throw new ValidationError('Price cannot be higher than regular price');
    }

    const oldPrice = product.sale_price;

    const updated = await prisma.products.update({
      where: { id: productId },
      data: { sale_price: priceValue },
    });

    await prisma.product_history.create({
      data: {
        productId,
        changedBy: req.seller.id,
        changeType: 'edit',
        changes: {
          action: 'price_updated',
          field: 'sale_price',
          oldValue: oldPrice,
          newValue: priceValue,
        },
      },
    });

    return success(res, { product: updated }, 'Product price updated successfully');
  });

  /**
   * Bulk hide products
   */
  bulkHideProducts = asyncHandler(async (req: any, res: Response) => {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      throw new ValidationError('Product IDs array is required');
    }

    const shopId = req.seller?.shops?.id;

    const products = await prisma.products.findMany({
      where: {
        id: { in: productIds },
        shopId,
      },
    });

    if (products.length !== productIds.length) {
      throw new AuthError('Some products do not belong to your shop');
    }

    const result = await prisma.products.updateMany({
      where: {
        id: { in: productIds },
        shopId,
      },
      data: {
        status: 'hidden',
      },
    });

    for (const productId of productIds) {
      await prisma.product_history.create({
        data: {
          productId,
          changedBy: req.seller.id,
          changeType: 'edit',
          changes: {
            action: 'bulk_hide',
            field: 'status',
            newValue: 'hidden',
          },
        },
      });
    }

    return success(res, { count: result.count }, `${result.count} products hidden successfully`);
  });

  /**
   * Bulk delete products (soft delete)
   */
  bulkDeleteProducts = asyncHandler(async (req: any, res: Response) => {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      throw new ValidationError('Product IDs array is required');
    }

    const shopId = req.seller?.shops?.id;

    const products = await prisma.products.findMany({
      where: {
        id: { in: productIds },
        shopId,
      },
    });

    if (products.length !== productIds.length) {
      throw new AuthError('Some products do not belong to your shop');
    }

    const result = await prisma.products.updateMany({
      where: {
        id: { in: productIds },
        shopId,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    for (const productId of productIds) {
      await prisma.product_history.create({
        data: {
          productId,
          changedBy: req.seller.id,
          changeType: 'edit',
          changes: {
            action: 'bulk_delete',
            field: 'isDeleted',
            newValue: true,
          },
        },
      });
    }

    return success(res, { count: result.count }, `${result.count} products deleted successfully`);
  });

  /**
   * Toggle hide/show product
   */
  toggleHideProduct = asyncHandler(async (req: any, res: Response) => {
    const { productId } = req.params;

    if (!productId) {
      throw new ValidationError('Product ID is required');
    }

    const shopId = req.seller?.shops?.id;
    if (!shopId) {
      throw new ValidationError('Seller must have a shop');
    }

    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: { id: true, shopId: true, status: true, isDeleted: true },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product.shopId !== shopId) {
      throw new AuthError('You are not authorized to modify this product');
    }

    if (product.isDeleted) {
      throw new ValidationError('Cannot hide a deleted product');
    }

    const newStatus = product.status === 'hidden' ? 'active' : 'hidden';
    const oldStatus = product.status;

    const updatedProduct = await prisma.products.update({
      where: { id: productId },
      data: { status: newStatus },
    });

    await prisma.product_history.create({
      data: {
        productId,
        changedBy: req.seller.id,
        changeType: 'edit',
        changes: {
          action: 'toggle_visibility',
          field: 'status',
          oldValue: oldStatus,
          newValue: newStatus,
        },
      },
    });

    return success(
      res,
      { product: updatedProduct },
      `Product ${newStatus === 'hidden' ? 'hidden' : 'shown'} successfully`
    );
  });

  /**
   * Get shop events (products with starting_date and ending_date)
   */
  getShopEvents = asyncHandler(async (req: any, res: Response) => {
    if (!req.seller || !req.seller.id) {
      throw new AuthError('Unauthorized: Seller information missing');
    }

    const shopId = req.seller?.shops?.id;
    if (!shopId) {
      throw new ValidationError('Seller must have a shop. Please create a shop first.');
    }

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
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: {
        starting_date: 'desc',
      },
    });

    return success(res, { events });
  });

  /**
   * Update event dates (starting_date and ending_date)
   */
  updateEventDates = asyncHandler(async (req: any, res: Response) => {
    const { productId } = req.params;
    const { starting_date, ending_date } = req.body;

    if (!starting_date || !ending_date) {
      throw new ValidationError('Starting date and ending date are required');
    }

    const shopId = req.seller?.shops?.id;
    if (!shopId) {
      throw new ValidationError('Seller must have a shop');
    }

    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: { id: true, shopId: true },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product.shopId !== shopId) {
      throw new AuthError('You are not authorized to modify this product');
    }

    const startDate = new Date(starting_date);
    const endDate = new Date(ending_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new ValidationError('Invalid date format');
    }

    if (endDate <= startDate) {
      throw new ValidationError('Ending date must be after starting date');
    }

    const updatedProduct = await prisma.products.update({
      where: { id: productId },
      data: {
        starting_date: startDate,
        ending_date: endDate,
      },
      include: { images: true },
    });

    await prisma.product_history.create({
      data: {
        productId,
        changedBy: req.seller.id,
        changeType: 'edit',
        changes: {
          action: 'event_dates_updated',
          field: 'event_dates',
          starting_date: startDate.toISOString(),
          ending_date: endDate.toISOString(),
        },
      },
    });

    return success(res, { product: updatedProduct }, 'Event dates updated successfully');
  });

  /**
   * Get all events (public endpoint)
   */
  getAllEvents = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const skip = (page - 1) * limit;

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
        orderBy: { totalSales: 'desc' as any },
      }),
      prisma.products.count({ where: baseFilter }),
      prisma.products.findMany({
        where: baseFilter,
        take: 10,
        orderBy: {
          totalSales: 'desc' as any,
        },
      }),
    ]);

    return success(res, {
      events,
      total,
      top10BySales,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });
  });
}

// Export controller instance and methods
const variationController = new VariationController();

export const getProductVariations = variationController.getProductVariations;
export const updateProductVariation = variationController.updateProductVariation;
export const deleteProductVariation = variationController.deleteProductVariation;
export const bulkUpdateVariations = variationController.bulkUpdateVariations;
export const updateVariationStock = variationController.updateVariationStock;
export const updateVariationPrice = variationController.updateVariationPrice;
export const updateProductStock = variationController.updateProductStock;
export const updateProductPrice = variationController.updateProductPrice;
export const bulkHideProducts = variationController.bulkHideProducts;
export const bulkDeleteProducts = variationController.bulkDeleteProducts;
export const toggleHideProduct = variationController.toggleHideProduct;
export const getShopEvents = variationController.getShopEvents;
export const updateEventDates = variationController.updateEventDates;
export const getAllEvents = variationController.getAllEvents;

