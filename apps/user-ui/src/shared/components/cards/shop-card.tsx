import { ArrowUpRight, MapPin, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

interface ShopCardProps {
  shop: {
    id: string;
    name: string;
    description?: string;
    avatar?: string;
    images?: Array<{ url: string }>;
    coverBanner?: string;
    address?: string;
    followers?: Array<any> | { count?: number };
    rating?: number;
    category?: string;
  };
}

const ShopCard: React.FC<ShopCardProps> = ({ shop }) => {
  // Get avatar from images array or avatar field
  const avatarUrl = shop.avatar || shop.images?.[0]?.url || "https://ik.imagekit.io/nextbuy/avatar/images.png?updatedAt=1765397806718";
  
  // Get followers count
  const followersCount = Array.isArray(shop.followers) 
    ? shop.followers.length 
    : shop.followers?.count || 0;

  return (
    <Link href={`/shop/${shop.id}`}>
      <div className="w-full rounded-lg cursor-pointer bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
        {/* Cover */}
        <div className="h-[140px] w-full relative overflow-hidden">
          <Image
            src={
              shop?.coverBanner ||
              "https://ik.imagekit.io/nextbuy/cover/facebook.jpg"
            }
            alt={`${shop.name} cover`}
            fill
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Avatar */}
        <div className="relative flex justify-center -mt-10 mb-2">
          <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden shadow-lg bg-white">
            <Image
              src={avatarUrl}
              alt={shop.name}
              width={80}
              height={80}
              className="object-cover w-full h-full"
            />
          </div>
        </div>

        {/* Info */}
        <div className="px-4 pb-5 pt-2 text-center">
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {shop?.name}
          </h3>

          <p className="text-xs text-gray-500 mt-1">
            {followersCount} {followersCount === 1 ? 'Follower' : 'Followers'}
          </p>

          {/* Address + Rating */}
          <div className="flex items-center justify-center gap-3 text-xs text-gray-500 mt-2.5">
            {shop.address && (
              <span className="flex items-center gap-1 max-w-[140px]">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{shop.address}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
              {shop.rating ? shop.rating.toFixed(1) : "N/A"}
            </span>
          </div>

          {/* Category */}
          {shop?.category && (
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
              <span className="bg-blue-50 capitalize text-blue-600 px-3 py-1 rounded-full font-medium">
                {shop.category}
              </span>
            </div>
          )}

          {/* Visit Button */}
          <div className="mt-4">
            <span className="inline-flex items-center text-sm text-blue-600 font-medium group-hover:text-blue-700 transition-colors">
              Visit Shop
              <ArrowUpRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ShopCard;