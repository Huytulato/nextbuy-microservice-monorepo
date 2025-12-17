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

const ProductsPage = () => {
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
      const res = await axiosInstance.get("/product/api/get-categories");
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

  // Fetch filtered products
  const fetchFilteredProducts = useCallback(async (pageNum: number = 1) => {
    setIsLoading(true);
    try {
      const query = buildQueryParams(pageNum);
      const res = await axiosInstance.get(`/product/api/get-filtered-products?${query.toString()}`);
      setProducts(res.data.products || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setCurrentPage(pageNum);
    } catch (error) {
      console.error('Error fetching filtered products:', error);
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

  // Auto-fetch when categories change
  useEffect(() => {
    const params = buildQueryParams(1);
    router.push(`/products?${params.toString()}`);
    fetchFilteredProducts(1);
  }, [selectedCategories, selectedColors, selectedSizes, priceRange]);

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

  const categories = categoriesData?.categories || [];
  const colors = ['Black', 'Red', 'Green', 'Blue', 'White', 'Yellow'];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">All Products</h1>
          <p className="text-gray-600">
            Home &gt; All Products
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
                        onChange={() => {
                          handleCategoryChange(category);
                          // Auto-fetch when category changes
                          setSelectedCategories(prev =>
                            prev.includes(category)
                              ? prev.filter(c => c !== category)
                              : [...prev, category]
                          );
                        }}
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

          {/* Products Grid */}
          <div className="md:col-span-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading products...</p>
                </div>
              </div>
            ) : products.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <p className="text-gray-600 text-lg">No products found</p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleProductClick(product.slug)}
                    >
                      {/* Product Image */}
                      <div className="relative bg-gray-200 h-48 flex items-center justify-center overflow-hidden">
                        {product.images?.[0]?.url ? (
                          <img
                            src={product.images[0].url}
                            alt={product.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="text-gray-400">No image</div>
                        )}

                        {/* Wishlist Button */}
                        <button className="absolute top-3 right-3 bg-white rounded-full p-2 hover:bg-gray-100">
                          🤍
                        </button>

                        {/* Icons */}
                        <div className="absolute bottom-3 right-3 flex gap-2">
                          <button className="bg-white rounded-full p-2 hover:bg-gray-100">
                            👁️
                          </button>
                          <button className="bg-white rounded-full p-2 hover:bg-gray-100">
                            📋
                          </button>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-4">
                        {/* Seller */}
                        <p className="text-sm text-gray-600 mb-1">
                          {product.shops?.name || 'Unknown Seller'}
                        </p>

                        {/* Title */}
                        <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
                          {product.title}
                        </h3>

                        {/* Rating */}
                        <div className="flex items-center gap-2 mb-3">
                          {renderStars(product.ratings)}
                          <span className="text-xs text-gray-600">(0 reviews)</span>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-lg font-bold text-orange-500">
                            ${product.sale_price}
                          </span>
                          {product.regular_price > product.sale_price && (
                            <>
                              <span className="text-sm text-gray-500 line-through">
                                ${product.regular_price}
                              </span>
                              <span className="text-sm font-semibold text-orange-500">
                                -{Math.round(((product.regular_price - product.sale_price) / product.regular_price) * 100)}%
                              </span>
                            </>
                          )}
                        </div>

                        {/* Add to Cart Button */}
                        <button className="w-full px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium text-sm">
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => fetchFilteredProducts(Math.max(1, currentPage - 1))}
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
                            onClick={() => fetchFilteredProducts(pageNum)}
                            className={`px-3 py-2 rounded-lg ${
                              currentPage === pageNum
                                ? 'bg-blue-500 text-white'
                                : 'bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => fetchFilteredProducts(Math.min(totalPages, currentPage + 1))}
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

export default ProductsPage;