'use client';
import axiosInstance from 'apps/user-ui/src/utils/axiosInstance';
import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  title: string;
  slug: string;
  images: Array<{ url: string }>;
  sale_price: number;
  regular_price: number;
  ratings: number;
  brands: string;
  shops?: { name: string };
}

const OffersPage = () => {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 1199]);
  const [tempPriceRange, setTempPriceRange] = useState([0, 1199]);
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await axiosInstance.get("/product/get-categories");
      return res.data;
    },
    staleTime: 1000 * 60 * 30,
  });

  // Build query params
  const buildQueryParams = useCallback((pageNum: number = 1) => {
    const query = new URLSearchParams();
    query.set('priceRange', priceRange.join(','));
    if (selectedCategories.length > 0) {
      query.set('categories', selectedCategories.join(','));
    }
    if (selectedColors.length > 0) {
      query.set('colors', selectedColors.join(','));
    }
    if (selectedSizes.length > 0) {
      query.set('sizes', selectedSizes.join(','));
    }
    query.set('page', pageNum.toString());
    query.set('limit', '12');
    return query;
  }, [priceRange, selectedCategories, selectedColors, selectedSizes]);

  // Fetch filtered events (offers)
  const fetchFilteredOffers = useCallback(async (pageNum: number = 1) => {
    setIsLoading(true);
    try {
      const query = buildQueryParams(pageNum);
      const res = await axiosInstance.get(`/product/get-filtered-events?${query.toString()}`);
      setProducts(res.data.products || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setCurrentPage(pageNum);
    } catch (error) {
      console.error('Error fetching offers:', error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryParams]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev => {
      const updated = prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category];
      setCurrentPage(1);
      return updated;
    });
  };

  const handleColorChange = (color: string) => {
    setSelectedColors(prev => {
      const updated = prev.includes(color)
        ? prev.filter(c => c !== color)
        : [...prev, color];
      setCurrentPage(1);
      return updated;
    });
  };

  const handleSizeChange = (size: string) => {
    setSelectedSizes(prev => {
      const updated = prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size];
      setCurrentPage(1);
      return updated;
    });
  };

  const handlePriceChange = (newRange: number[]) => {
    setTempPriceRange(newRange);
  };

  const handleApplyPrice = () => {
    setPriceRange(tempPriceRange);
    setCurrentPage(1);
  };

  // Auto-fetch when filters change
  useEffect(() => {
    const params = buildQueryParams(1);
    router.push(`/offers?${params.toString()}`);
    fetchFilteredOffers(1);
  }, [selectedCategories, selectedColors, selectedSizes, priceRange, buildQueryParams, router, fetchFilteredOffers]);

  const handleProductClick = (slug: string) => {
    router.push(`/product/${slug}`);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <span
            key={i}
            className={`text-sm ${
              i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const calculateDiscount = (sale_price: number, regular_price: number) => {
    if (regular_price <= 0) return 0;
    return Math.round(((regular_price - sale_price) / regular_price) * 100);
  };

  const categories = categoriesData?.categories || [];
  const colors = ['Black', 'Red', 'Green', 'Blue', 'White', 'Yellow'];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">All Offers</h1>
          <p className="text-gray-600">
            Home &gt; All Offers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar - Filters */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg p-6 sticky top-4">
              {/* Price Filter */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Price Filter</h3>
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="1"
                  value={tempPriceRange[1]}
                  onChange={(e) => handlePriceChange([tempPriceRange[0], parseInt(e.target.value)])}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600 mt-2 mb-4">
                  <span>${tempPriceRange[0]}</span>
                  <span>${tempPriceRange[1]}</span>
                </div>
                <button
                  onClick={handleApplyPrice}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                >
                  Apply
                </button>
              </div>

              {/* Categories */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Categories</h3>
                <div className="space-y-2">
                  {categories.map((category: string) => (
                    <label key={category} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => handleCategoryChange(category)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-gray-700">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Color Filter */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Filter by Color</h3>
                <div className="space-y-2">
                  {colors.map((color) => (
                    <label key={color} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedColors.includes(color)}
                        onChange={() => handleColorChange(color)}
                        className="w-4 h-4 rounded"
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{
                          backgroundColor: color.toLowerCase(),
                        }}
                      />
                      <span className="text-gray-700">{color}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Size Filter */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Filter by Size</h3>
                <div className="space-y-2">
                  {sizes.map((size) => (
                    <label key={size} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSizes.includes(size)}
                        onChange={() => handleSizeChange(size)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-gray-700">{size}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Offers Grid */}
          <div className="md:col-span-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading offers...</p>
                </div>
              </div>
            ) : products.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <p className="text-gray-600 text-lg">No offers available</p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {products.map((product) => {
                    const discount = calculateDiscount(product.sale_price, product.regular_price);
                    return (
                      <div
                        key={product.id}
                        className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer group"
                        onClick={() => handleProductClick(product.slug)}
                      >
                        {/* Product Image with Offer Badge */}
                        <div className="relative bg-gray-200 h-48 flex items-center justify-center overflow-hidden">
                          {product.images?.[0]?.url ? (
                            <img
                              src={product.images[0].url}
                              alt={product.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="text-gray-400">No image</div>
                          )}

                          {/* OFFER Badge */}
                          <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-md font-bold text-sm shadow-lg">
                            OFFER
                          </div>

                          {/* Discount Percentage Badge */}
                          {discount > 0 && (
                            <div className="absolute top-3 right-3 bg-red-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                              -{discount}%
                            </div>
                          )}

                          {/* Wishlist Button */}
                          <button 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-3 left-3 bg-white rounded-full p-2 hover:bg-red-50 transition-colors"
                          >
                            🤍
                          </button>

                          {/* Quick Action Icons */}
                          <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => e.stopPropagation()}
                              className="bg-white rounded-full p-2 hover:bg-gray-100 transition-colors"
                            >
                              👁️
                            </button>
                            <button 
                              onClick={(e) => e.stopPropagation()}
                              className="bg-white rounded-full p-2 hover:bg-gray-100 transition-colors"
                            >
                              📋
                            </button>
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="p-4">
                          {/* Seller */}
                          <p className="text-xs text-gray-600 mb-1 font-medium">
                            {product.shops?.name || 'Unknown Seller'}
                          </p>

                          {/* Title */}
                          <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 h-10">
                            {product.title}
                          </h3>

                          {/* Rating */}
                          <div className="flex items-center gap-2 mb-3">
                            {renderStars(product.ratings)}
                            <span className="text-xs text-gray-600">(0 reviews)</span>
                          </div>

                          {/* Price Section */}
                          <div className="mb-3 pb-3 border-b border-gray-200">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-bold text-red-600">
                                ${product.sale_price}
                              </span>
                              {product.regular_price > product.sale_price && (
                                <span className="text-sm text-gray-500 line-through">
                                  ${product.regular_price}
                                </span>
                              )}
                            </div>
                            {discount > 0 && (
                              <p className="text-xs text-green-600 font-semibold mt-1">
                                You save ${(product.regular_price - product.sale_price).toFixed(2)}
                              </p>
                            )}
                          </div>

                          {/* Add to Cart Button */}
                          <button 
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm transition-colors"
                          >
                            🛒 Add to Cart
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => fetchFilteredOffers(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      ← Previous
                    </button>

                    <div className="flex gap-1">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => fetchFilteredOffers(pageNum)}
                            className={`px-3 py-2 rounded-lg ${
                              currentPage === pageNum
                                ? 'bg-red-600 text-white'
                                : 'bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => fetchFilteredOffers(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OffersPage;