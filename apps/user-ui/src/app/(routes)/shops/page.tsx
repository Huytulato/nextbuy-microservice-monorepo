"use client";

import { categories } from "apps/user-ui/src/configs/categories";
import axiosInstance from "apps/user-ui/src/utils/axiosInstance";
import ShopCard from "apps/user-ui/src/shared/components/cards/shop-card";
import { countries } from "apps/user-ui/src/utils/countries";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

const Page = () => {
  const router = useRouter();

  const [isShopLoading, setIsShopLoading] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  const [page, setPage] = useState(1);
  const [shops, setShops] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  const updateURL = () => {
    const params = new URLSearchParams();

    if (selectedCategories.length > 0)
      params.set("categories", selectedCategories.join(","));

    if (selectedCountries.length > 0)
      params.set("countries", selectedCountries.join(","));

    params.set("page", page.toString());

    router.replace(`/shops?${decodeURIComponent(params.toString())}`);
  };

  const fetchFilteredShops = async () => {
    setIsShopLoading(true);

    try {
      const query = new URLSearchParams();

      if (selectedCategories.length > 0)
        query.set("categories", selectedCategories.join(","));

      if (selectedCountries.length > 0)
        query.set("countries", selectedCountries.join(","));

      query.set("page", page.toString());
      query.set("limit", "12");

      const res = await axiosInstance.get(
        `/shop/api/get-filtered-shops?${query.toString()}`
      );
      setShops(res.data.shops);
      setTotalPages(res.data.pagination?.totalPages ?? 1);
    } catch (error) {
      console.error("Error fetching shops:", error);
    } finally {
      setIsShopLoading(false);
    }
  };

  useEffect(() => {
    updateURL();
    fetchFilteredShops();
  }, [selectedCategories, selectedCountries, page]);

  const toggleCategory = (label: string) => {
    setSelectedCategories((prev) =>
      prev.includes(label)
        ? prev.filter((cat) => cat !== label)
        : [...prev, label]
    );
    setPage(1);
  };

  const toggleCountry = (label: string) => {
    setSelectedCountries((prev) =>
      prev.includes(label)
        ? prev.filter((cou) => cou !== label)
        : [...prev, label]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedCountries([]);
    setPage(1);
  };

  const handlePageChange = (direction: "prev" | "next") => {
    setPage((prev) => {
      if (direction === "prev") return Math.max(1, prev - 1);
      return Math.min(totalPages, prev + 1);
    });
  };

  const visibleCountries = useMemo(() => countries.slice(0, 16), []);
  const hasActiveFilters = selectedCategories.length > 0 || selectedCountries.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-2 mb-8">
          <nav className="text-sm text-gray-500 mb-2">
            <span className="hover:text-gray-700">Home</span>
            <span className="mx-2">·</span>
            <span className="text-gray-900 font-medium">All Shops</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">All Shops</h1>
          <p className="text-sm text-gray-600">
            Discover verified shops across categories and countries.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar - Sticky */}
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Categories */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Categories</h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {categories.map((cat) => (
                    <label
                      key={cat.value}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900 transition-colors py-1"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.label)}
                        onChange={() => toggleCategory(cat.label)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span className="capitalize">{cat.label.toLowerCase()}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Countries */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Countries</h4>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                  {visibleCountries.map((country) => (
                    <label
                      key={country}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900 transition-colors py-1"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCountries.includes(country)}
                        onChange={() => toggleCountry(country)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span className="truncate">{country}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Shops Grid */}
          <div className="lg:col-span-3">
            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedCategories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium"
                  >
                    {cat}
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="hover:bg-blue-100 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {selectedCountries.map((country) => (
                  <span
                    key={country}
                    className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium"
                  >
                    {country}
                    <button
                      onClick={() => toggleCountry(country)}
                      className="hover:bg-blue-100 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Loading State */}
            {isShopLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
                  >
                    <div className="h-[140px] bg-gray-200 animate-pulse" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mx-auto" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2 mx-auto" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3 mx-auto" />
                    </div>
                  </div>
                ))}
              </div>
            ) : shops.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border border-gray-200">
                <div className="text-center">
                  <p className="text-gray-900 text-lg font-semibold mb-2">No shops found</p>
                  <p className="text-gray-500 text-sm">Try adjusting your filters to see more results.</p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {shops.map((shop) => {
                    // Transform shop data to match ShopCard interface
                    const shopData = {
                      ...shop,
                      avatar: shop.images?.[0]?.url,
                      followers: shop.followers || { count: shop.followers?.length || 0 },
                    };
                    return <ShopCard key={shop.id} shop={shopData} />;
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-10">
                    <button
                      onClick={() => handlePageChange("prev")}
                      disabled={page === 1}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              page === pageNum
                                ? "bg-blue-600 text-white"
                                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-sm text-gray-600 hidden sm:inline">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange("next")}
                      disabled={page === totalPages}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
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

export default Page;