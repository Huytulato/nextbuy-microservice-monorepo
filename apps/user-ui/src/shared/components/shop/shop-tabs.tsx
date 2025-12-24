"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from 'apps/user-ui/src/utils/axiosInstance';
import ProductCard from 'apps/user-ui/src/shared/components/cards/product-card';
import { Package, Tag, Star } from 'lucide-react';

interface ShopTabsProps {
  shopId: string;
}

type TabType = 'products' | 'offers' | 'reviews';

const ShopTabs: React.FC<ShopTabsProps> = ({ shopId }) => {
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [productsPage, setProductsPage] = useState(1);
  const [offersPage, setOffersPage] = useState(1);
  const limit = 12;

  // Fetch products
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['shop-products', shopId, productsPage],
    queryFn: async () => {
      const res = await axiosInstance.get(
        `/shop/api/get-shop-products/${shopId}?page=${productsPage}&limit=${limit}`
      );
      return res.data;
    },
    enabled: activeTab === 'products' || activeTab === 'offers',
  });

  // Filter products for offers (products with discount)
  const offersProducts = productsData?.products?.filter((product: any) => {
    return product.regular_price > product.sale_price;
  }) || [];

  // Fetch shop reviews (we'll need to get this from shop data or create a separate endpoint)
  // For now, we'll show a placeholder
  const reviews = []; // TODO: Fetch reviews from shop data

  const tabs = [
    { id: 'products' as TabType, label: 'Products', icon: Package },
    { id: 'offers' as TabType, label: 'Offers', icon: Tag },
    { id: 'reviews' as TabType, label: 'Reviews', icon: Star },
  ];

  const renderProducts = () => {
    if (isLoadingProducts) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="bg-gray-200 rounded-lg h-[300px] animate-pulse"
            />
          ))}
        </div>
      );
    }

    const products = activeTab === 'offers' ? offersProducts : productsData?.products || [];

    if (products.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <Package className="w-16 h-16 text-gray-300 mb-4" />
          <p className="text-gray-600 text-lg font-medium mb-2">
            {activeTab === 'offers' ? 'No offers available' : 'No products found'}
          </p>
          <p className="text-gray-500 text-sm text-center">
            {activeTab === 'offers'
              ? 'This shop doesn\'t have any active offers at the moment.'
              : 'This shop hasn\'t added any products yet.'}
          </p>
        </div>
      );
    }

    return (
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Pagination for products */}
        {productsData?.pagination?.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => {
                const setter = activeTab === 'offers' ? setOffersPage : setProductsPage;
                setter((prev) => Math.max(1, prev - 1));
              }}
              disabled={
                (activeTab === 'offers' ? offersPage : productsPage) === 1
              }
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {activeTab === 'offers' ? offersPage : productsPage} of{' '}
              {productsData?.pagination?.totalPages}
            </span>
            <button
              onClick={() => {
                const setter = activeTab === 'offers' ? setOffersPage : setProductsPage;
                setter((prev) =>
                  Math.min(productsData?.pagination?.totalPages || 1, prev + 1)
                );
              }}
              disabled={
                (activeTab === 'offers' ? offersPage : productsPage) >=
                (productsData?.pagination?.totalPages || 1)
              }
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderReviews = () => {
    // TODO: Implement reviews fetching and display
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <Star className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-600 text-lg font-medium mb-2">No reviews yet</p>
        <p className="text-gray-500 text-sm text-center">
          Be the first to review this shop!
        </p>
      </div>
    );
  };

  return (
    <div>
      {/* Tab Headers */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-4 font-semibold text-sm transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'offers' && renderProducts()}
        {activeTab === 'reviews' && renderReviews()}
      </div>
    </div>
  );
};

export default ShopTabs;

