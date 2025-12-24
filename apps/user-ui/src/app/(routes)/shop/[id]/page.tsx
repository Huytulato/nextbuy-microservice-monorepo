import axiosInstance from 'apps/user-ui/src/utils/axiosInstance';
import { Metadata } from 'next';
import React from 'react';
import ShopDetails from 'apps/user-ui/src/shared/modules/shop/shop-details';
import { Shop } from 'apps/user-ui/src/types/shop';

async function fetchShopDetails(id: string): Promise<Shop | null> {
  try {
    const response = await axiosInstance.get(`/shop/api/get-shop/${id}`);
    const shop = response.data.shop;
    
    // Ensure createdAt is a string
    if (shop && shop.createdAt) {
      shop.createdAt = typeof shop.createdAt === 'string' 
        ? shop.createdAt 
        : new Date(shop.createdAt).toISOString();
    }
    
    // Ensure reviews have createdAt as string
    if (shop && shop.reviews) {
      shop.reviews = shop.reviews.map((review: any) => ({
        ...review,
        createdAt: typeof review.createdAt === 'string'
          ? review.createdAt
          : new Date(review.createdAt).toISOString(),
      }));
    }
    
    return shop;
  } catch (error) {
    console.error('Error fetching shop:', error);
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const shop = await fetchShopDetails(id);

  return {
    title: `${shop?.name || 'Shop'} | E-Shop Marketplace`,
    description: shop?.bio || `Visit ${shop?.name || 'this shop'} on E-Shop Marketplace.`,
    openGraph: {
      title: `${shop?.name || 'Shop'} | E-Shop Marketplace`,
      description: shop?.bio || `Visit ${shop?.name || 'this shop'} on E-Shop Marketplace.`,
      images: shop?.coverBanner ? [shop.coverBanner] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${shop?.name || 'Shop'} | E-Shop Marketplace`,
      description: shop?.bio || `Visit ${shop?.name || 'this shop'} on E-Shop Marketplace.`,
      images: shop?.coverBanner ? [shop.coverBanner] : [],
    },
  };
}

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const shop = await fetchShopDetails(id);

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Shop Not Found</h1>
          <p className="text-gray-600 mb-6">The shop you're looking for doesn't exist or has been removed.</p>
          <a
            href="/shops"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse All Shops
          </a>
        </div>
      </div>
    );
  }

  return <ShopDetails shop={shop} />;
};

export default Page;

