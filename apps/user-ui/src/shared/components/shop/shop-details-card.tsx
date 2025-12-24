"use client";

import React from 'react';
import { Calendar, Globe, Youtube, Twitter, Facebook, Instagram } from 'lucide-react';
import { Shop } from 'apps/user-ui/src/types/shop';
import Link from 'next/link';

interface ShopDetailsCardProps {
  shop: Shop;
}

const ShopDetailsCard: React.FC<ShopDetailsCardProps> = ({ shop }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getSocialIcon = (platform: string) => {
    const lowerPlatform = platform.toLowerCase();
    if (lowerPlatform.includes('youtube')) return <Youtube className="w-5 h-5" />;
    if (lowerPlatform.includes('twitter') || lowerPlatform.includes('x')) return <Twitter className="w-5 h-5" />;
    if (lowerPlatform.includes('facebook')) return <Facebook className="w-5 h-5" />;
    if (lowerPlatform.includes('instagram')) return <Instagram className="w-5 h-5" />;
    return <Globe className="w-5 h-5" />;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Shop Details</h2>
      
      <div className="space-y-4">
        {/* Joined Date */}
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">Joined At</p>
            <p className="text-sm text-gray-600">{formatDate(shop.createdAt)}</p>
          </div>
        </div>

        {/* Website */}
        {shop.website && (
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Website</p>
              <Link
                href={shop.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline break-all"
              >
                {shop.website}
              </Link>
            </div>
          </div>
        )}

        {/* Social Links */}
        {shop.social_links && shop.social_links.length > 0 && (
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Follow Us</p>
              <div className="flex flex-wrap gap-3">
                {shop.social_links.map((social, index) => (
                  <Link
                    key={index}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                    title={social.platform || 'Social link'}
                  >
                    {getSocialIcon(social.platform || '')}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopDetailsCard;

