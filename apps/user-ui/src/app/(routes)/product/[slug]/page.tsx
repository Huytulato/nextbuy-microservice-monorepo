import axiosInstance from 'apps/user-ui/src/utils/axiosInstance';
import { Metadata } from 'next';
import React from 'react';
import ProductDetails from 'apps/user-ui/src/shared/modules/product/product-details';

async function fetchProductDetails(slug: string) {
  try {
    // product-service routes are mounted under /api and exposed via gateway at /product
    // BaseController returns { success: true, data: { product: ... } }
    const response = await axiosInstance.get(`/product/api/get-product/${slug}`);
    const product = response.data?.data?.product;
    
    if (!product) {
      console.warn(`Product with slug "${slug}" not found in response`);
      return null;
    }
    
    return product;
  } catch (error: any) {
    console.error('Error fetching product:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductDetails(slug);

  return {
    title: `${product?.title || 'Product'} | NextBuy Marketplace`,
    description:
      product?.short_description ||
      "Discover high-quality products on NextBuy Marketplace.",
      openGraph: {
        title: `${product?.title || 'Product'} | NextBuy Marketplace`,
        description: product?.short_description || "Discover high-quality products on NextBuy Marketplace.",
        images: [product?.images?.[0]?.url || '/default-og-image.jpg'],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${product?.title || 'Product'} | NextBuy Marketplace`,
        description: product?.short_description || "Discover high-quality products on NextBuy Marketplace.",
        images: [product?.images?.[0]?.url || '/default-og-image.jpg'],
      },
  };
}

const Page = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const product = await fetchProductDetails(slug);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600">The product you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // Map backend data to component props
  const mappedProductDetails = {
    id: product.id,
    shopId: product.shopId,
    title: product.title,
    images: product.images?.map((img: any) => img.url) || [],
    rating: product.ratings || 0,
    reviewCount: product.reviews?.length || 0,
    brand: product.brand || 'No Brand',
    price: product.sale_price,
    originalPrice: product.regular_price,
    sizes: product.sizes || [],
    colors: product.colors || [],
    stock: product.stock || 0,
    description: product.detailed_description || product.short_description,
    deliveryLocation: 'Hanoi, Vietnam',
    returnDays: 7,
    warranty: product.warranty || 'not available',
    seller: product.shops?.name || 'Unknown Seller',
    sellerId: product.shops?.id,
    shopRating: product.shops?.rating || 0,
    shopAvatar: product.shops?.avatar,
    hasVariations: product.hasVariations || false,
    variations: product.variations || [],
    variationGroups: product.variationGroups || [],
  };

  return (
    <ProductDetails ProductDetails={mappedProductDetails} />
  );
};

export default Page;
