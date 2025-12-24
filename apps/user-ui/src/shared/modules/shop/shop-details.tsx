"use client";

import React from 'react';
import ShopProfileCard from 'apps/user-ui/src/shared/components/shop/shop-profile-card';
import ShopDetailsCard from 'apps/user-ui/src/shared/components/shop/shop-details-card';
import ShopTabs from 'apps/user-ui/src/shared/components/shop/shop-tabs';
import { Shop } from 'apps/user-ui/src/types/shop';
import Image from 'next/image';

interface ShopDetailsProps {
  shop: Shop;
}

const ShopDetails: React.FC<ShopDetailsProps> = ({ shop }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner Section */}
      <div className="relative w-full h-[300px] md:h-[400px] overflow-hidden">
        {shop.coverBanner ? (
          <Image
            src={shop.coverBanner}
            alt={`${shop.name} banner`}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600" />
        )}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Shop Profile Card */}
          <div className="lg:col-span-2">
            <ShopProfileCard shop={shop} />
          </div>

          {/* Shop Details Card */}
          <div className="lg:col-span-1">
            <ShopDetailsCard shop={shop} />
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <ShopTabs shopId={shop.id} />
        </div>
      </div>
    </div>
  );
};

export default ShopDetails;

