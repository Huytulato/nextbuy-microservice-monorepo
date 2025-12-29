"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { MapPin, Star, Clock, Heart } from 'lucide-react';
import { Shop } from 'apps/user-ui/src/types/shop';

interface ShopProfileCardProps {
  shop: Shop;
}

const ShopProfileCard: React.FC<ShopProfileCardProps> = ({ shop }) => {
  const [isFollowing, setIsFollowing] = useState(false);

  const avatarUrl = shop.avatar || shop.images?.[0]?.url || "https://ik.imagekit.io/nextbuy/avatar/images.png?updatedAt=1765397806718";

  const handleFollow = () => {
    // TODO: Implement follow functionality
    setIsFollowing(!isFollowing);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      {/* Avatar */}
      <div className="flex justify-center -mt-16 mb-4">
        <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden shadow-lg bg-white">
          <Image
            src={avatarUrl}
            alt={shop.name}
            width={96}
            height={96}
            className="object-cover w-full h-full"
          />
        </div>
      </div>

      {/* Shop Info */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{shop.name}</h1>
        {shop.bio && (
          <p className="text-gray-600 text-sm mb-4">{shop.bio}</p>
        )}

        {/* Rating and Followers */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="flex items-center gap-1">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium text-gray-700">
              {shop.rating ? shop.rating.toFixed(1) : 'N/A'}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {shop.followers.count} {shop.followers.count === 1 ? 'Follower' : 'Followers'}
          </div>
        </div>

        {/* Opening Hours */}
        {shop.opening_hours && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-4">
            <Clock className="w-4 h-4" />
            <span>{shop.opening_hours}</span>
          </div>
        )}

        {/* Follow Button */}
        <button
          onClick={handleFollow}
          className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors ${
            isFollowing
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFollowing ? 'fill-red-500 text-red-500' : ''}`} />
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>
    </div>
  );
};

export default ShopProfileCard;

