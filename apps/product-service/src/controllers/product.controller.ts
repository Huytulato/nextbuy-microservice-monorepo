import { BaseController } from '@packages/base';
import { ProductService } from '../services/product.service';
import { Request, Response, NextFunction } from 'express';
import { 
  CreateProductDto, 
  UpdateProductDto, 
  ProductQueryDto,
  UploadImageDto,
  DeleteImageDto 
} from '../dto/product.dto';
import { ValidationError } from '@packages/error-handler';
import { imagekit } from '@packages/libs/image-kit';

export class ProductController extends BaseController<ProductService> {
  constructor() {
    super(new ProductService());
  }

  /**
   * Get product categories
   */
  getCategories = this.asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.getCategories();
    return this.success(res, result);
  });

  /**
   * Upload product images
   */
  uploadProductImages = this.asyncHandler(async (req: Request, res: Response) => {
    const { fileData, originalFileName }: UploadImageDto = req.body;
    
    if (!fileData) {
      throw new ValidationError('File data is required');
    }

    const fileExtension = originalFileName 
      ? originalFileName.split('.').pop()?.toLowerCase() || 'jpg'
      : 'jpg';
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const shortFileName = `product-${timestamp}-${randomId}.${fileExtension}`;
    
    const response = await imagekit.upload({
      file: fileData,
      fileName: shortFileName,
      folder: '/products',
    });
    
    return this.success(res, {
      file_url: response.url,
      fileId: response.fileId,
    }, 'Image uploaded successfully', 201);
  });

  /**
   * Delete product images
   */
  deleteProductImages = this.asyncHandler(async (req: Request, res: Response) => {
    const { fileId }: DeleteImageDto = req.body;
    await imagekit.deleteFile(fileId);
    return this.success(res, null, 'Image deleted successfully');
  });

  /**
   * Create product
   */
  createProduct = this.asyncHandler(async (req: any, res: Response) => {
    const sellerId = req.seller?.id;
    if (!sellerId) {
      throw new ValidationError('Seller information is missing');
    }

    const shopId = req.seller?.shops?.id;
    if (!shopId) {
      throw new ValidationError('Seller must have a shop. Please create a shop first.');
    }

    const productData: CreateProductDto = req.body;
    const result = await this.service.createProduct(productData, sellerId, shopId);
    
    return this.success(res, result, 'Product created successfully', 200);
  });

  /**
   * Update product
   */
  updateProduct = this.asyncHandler(async (req: any, res: Response) => {
    const { productId } = req.params;
    const sellerId = req.seller?.id;
    
    if (!sellerId) {
      throw new ValidationError('Seller information is missing');
    }

    const shopId = req.seller?.shops?.id;
    if (!shopId) {
      throw new ValidationError('Seller must have a shop');
    }

    const productData: UpdateProductDto = {
      ...req.body,
      productId,
    };

    const result = await this.service.updateProduct(productId, productData, sellerId, shopId);
    
    return this.success(res, {
      product: result.product,
      requiresReReview: result.requiresReReview,
      message: result.requiresReReview
        ? 'Product updated. Significant changes detected. Product requires re-review.'
        : 'Product updated successfully',
    });
  });

  /**
   * Get shop products
   */
  getShopProducts = this.asyncHandler(async (req: any, res: Response) => {
    if (!req.seller || !req.seller.id) {
      return this.error(res, 'Unauthorized: Seller information missing', 401);
    }

    const shopId = req.seller?.shops?.id;
    if (!shopId) {
      return this.error(res, 'Seller must have a shop. Please create a shop first.', 400);
    }

    const products = await this.service.getShopProducts(shopId);
    return this.success(res, { products });
  });

  /**
   * Delete product
   */
  deleteProduct = this.asyncHandler(async (req: any, res: Response) => {
    const { productId } = req.params;
    const shopId = req.seller?.shops?.id;

    const deletedProduct = await this.service.deleteProduct(productId, shopId);
    
    return this.success(res, {
      deletedAt: deletedProduct.deletedAt,
    }, 'Product moved to deleted state. It will be permanently deleted after 24 hours.');
  });

  /**
   * Restore deleted product
   */
  restoreDeletedProduct = this.asyncHandler(async (req: any, res: Response) => {
    const { productId } = req.params;
    const shopId = req.seller?.shops?.id;

    await this.service.restoreProduct(productId, shopId);
    return this.success(res, null, 'Product has been restored successfully');
  });

  /**
   * Get all products
   */
  getAllProducts = this.asyncHandler(async (req: Request, res: Response) => {
    const query: ProductQueryDto = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      type: req.query.type as string,
      category: req.query.category as string,
      search: req.query.search as string,
      sortBy: req.query.sortBy as string,
    };

    const result = await this.service.getProducts(query);
    
    // Get top 10 products for featured section
    const top10Query = { ...query, limit: 10 };
    const top10Result = await this.service.getProducts(top10Query);
    
    return this.success(res, {
      products: result.products,
      total: result.total,
      top10By: query.type === 'latest' || query.type === 'lastest' ? 'latest' : 'rating',
      top10Products: top10Result.products,
      ...result.pagination,
    });
  });

  /**
   * Get product details by slug
   */
  getProductDetails = this.asyncHandler(async (req: Request, res: Response) => {
    const rawSlug = req.params.slug ?? '';
    const slug = decodeURIComponent(rawSlug).trim();

    if (!slug) {
      throw new ValidationError('Slug is required');
    }

    const product = await this.service.getProductBySlug(slug);
    return this.success(res, { product });
  });

  /**
   * Get filtered products
   */
  getFilteredProducts = this.asyncHandler(async (req: Request, res: Response) => {
    const query: ProductQueryDto = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 12,
      priceRange: typeof req.query.priceRange === 'string' 
        ? req.query.priceRange.split(',').map(Number) as [number, number]
        : [0, 10000],
      categories: Array.isArray(req.query.categories)
        ? req.query.categories
        : req.query.categories
        ? String(req.query.categories).split(',')
        : [],
      colors: Array.isArray(req.query.colors)
        ? req.query.colors
        : req.query.colors
        ? [req.query.colors]
        : [],
      sizes: Array.isArray(req.query.sizes)
        ? req.query.sizes
        : req.query.sizes
        ? [req.query.sizes]
        : [],
    };

    const result = await this.service.getProducts(query);
    return this.paginated(res, result.products, {
      page: query.page || 1,
      limit: query.limit || 12,
      total: result.total,
      totalPages: result.pagination.totalPages,
    });
  });

  /**
   * Search products
   */
  searchProducts = this.asyncHandler(async (req: Request, res: Response) => {
    const searchQuery = req.query.q as string;
    if (!searchQuery || searchQuery.trim().length === 0) {
      throw new ValidationError('Search query is required');
    }

    const query: ProductQueryDto = {
      search: searchQuery,
      limit: 10,
    };

    const result = await this.service.getProducts(query);
    
    const products = result.products.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
    }));

    return this.success(res, { products });
  });

  /**
   * Get public shop products
   */
  getPublicShopProducts = this.asyncHandler(async (req: Request, res: Response) => {
    const { shopId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;

    if (!shopId) {
      throw new ValidationError('Shop ID is required');
    }

    // Verify shop exists
    const { default: prisma } = await import('@packages/libs/prisma');
    const shop = await prisma.shops.findUnique({
      where: { id: shopId },
      select: { id: true },
    });

    if (!shop) {
      throw new ValidationError('Shop not found');
    }

    const products = await this.service.getShopProducts(shopId);
    
    // Apply pagination manually since getShopProducts doesn't support it yet
    const skip = (page - 1) * limit;
    const paginatedProducts = products.slice(skip, skip + limit);
    const total = products.length;
    const totalPages = Math.ceil(total / limit);

    return this.paginated(res, paginatedProducts, {
      page,
      limit,
      total,
      totalPages,
    });
  });

  /**
   * Submit draft for review
   */
  submitDraftForReview = this.asyncHandler(async (req: any, res: Response) => {
    const { productId } = req.params;
    const sellerId = req.seller?.id;

    if (!productId) {
      throw new ValidationError('Product ID is required');
    }

    const result = await this.service.submitDraftForReview(productId, sellerId);
    return this.success(res, result);
  });

  /**
   * Get product history
   */
  getProductHistory = this.asyncHandler(async (req: any, res: Response) => {
    const { productId } = req.params;
    const sellerId = req.seller?.id;
    const isAdmin = req.admin || req.user?.role === 'admin';

    if (!productId) {
      throw new ValidationError('Product ID is required');
    }

    const result = await this.service.getProductHistory(productId, sellerId, isAdmin);
    return this.success(res, result);
  });

  // Note: Variation management methods and other complex operations
  // should be added here or in separate controllers for better organization
  // For now, keeping the original controller methods that handle variations
  // These can be refactored in a follow-up iteration
}

// Export controller instance and individual methods for backward compatibility
const productController = new ProductController();

export const getCategories = productController.getCategories;
export const uploadProductImages = productController.uploadProductImages;
export const deleteProductImages = productController.deleteProductImages;
export const createProduct = productController.createProduct;
export const updateProduct = productController.updateProduct;
export const getShopProducts = productController.getShopProducts;
export const deleteProduct = productController.deleteProduct;
export const restoreDeletedProduct = productController.restoreDeletedProduct;
export const getAllProducts = productController.getAllProducts;
export const getProductDetails = productController.getProductDetails;
export const getFilteredProducts = productController.getFilteredProducts;
export const searchProducts = productController.searchProducts;
export const getPublicShopProducts = productController.getPublicShopProducts;
export const submitDraftForReview = productController.submitDraftForReview;
export const getProductHistory = productController.getProductHistory;

// Re-export variation methods from variation controller
export {
  getProductVariations,
  updateProductVariation,
  deleteProductVariation,
  bulkUpdateVariations,
  updateVariationStock,
  updateVariationPrice,
  updateProductStock,
  updateProductPrice,
  bulkHideProducts,
  bulkDeleteProducts,
  toggleHideProduct,
  getShopEvents,
  updateEventDates,
  getAllEvents,
} from './variation.controller';

