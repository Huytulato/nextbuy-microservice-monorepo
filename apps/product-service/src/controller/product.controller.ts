import { discount_codes } from './../../../../node_modules/.prisma/client/index.d';
import { AuthError, NotFoundError, ValidationError } from "@packages/error-handler";
import { imagekit } from "@packages/libs/image-kit";
import prisma from "@packages/libs/prisma";
import { NextFunction, Request, Response } from "express";

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
    next(error);
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
    next(error);
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
    next(error);
  }
};

// upload product images
export const uploadProductImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {fileName} = req.body;
    const response = await imagekit.upload({
      file: fileName,
      fileName: `product-images/${Date.now()}-${fileName}`,
      folder: "/products",
    });
    return res.status(201).json(
      {
        file_url: response.url,
        fileName: response.fileId,  
      }
    )
  } catch (error) {
    next(error);
  }
}

// delete product images
export const deleteProductImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.body;
    const response = await imagekit.deleteFile(fileId);
    return res.status(200).json(
      { message: "Image deleted successfully" }
    )
  } catch (error) {
    next(error);
  }
}

// create product 
export const createProduct = async (req: any, res: Response, next: NextFunction) => {
  try {
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
    discountCodes,
    stock,
    sale_price,
    regular_price,
    subCategory,
    customProperties = {},
    images = [],
  } = req.body;

  if (!title || !short_description || !category || !stock || !sale_price || !regular_price) {
    return next(new ValidationError("Missing required fields"));
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

  const newProduct = await prisma.products.create({
    data: {
      title,
      short_description,
      detailed_description,
      warranty,
      cashOnDelivery: cash_on_delivery,
      slug,
      shopId: req.seller?.shop?.id,
      tags: Array.isArray(tags) ? tags : tags.split(','),
      brand,
      video_url,
      category,
      subCategory,
      colors: colors || [],
      discount_codes: discountCodes.map((codeId: string) => codeId) ,
      sizes: sizes || [],
      stock: parseInt(stock),
      sale_price: parseFloat(sale_price),
      regular_price: parseFloat(regular_price),
      custom_specifications: custom_specifications || {},
      custom_properties: customProperties || {},
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

  res.status(200).json({
    success: true,
    newProduct,
  });
  } catch (error) {
    next(error);
  }
}

// get logged in seller's products
export const getShopProducts = async (req: any, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.products.findMany({
      where: {
        shopId: req.seller?.shop?.id,
      },
      include: {
        images: true,
      },
    });
    res.status(201).json({
      success: true,
      products,
    });
  } catch (error) {
    next(error);
  }
}

// delete product
export const deleteProduct = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const sellId = req.seller?.shop?.id;
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
    next(error);
  }
};

// restore deleted product
export const restoreDeletedProduct = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const sellId = req.seller?.shop?.id;
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