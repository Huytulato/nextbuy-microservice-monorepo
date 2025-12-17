"use client";

import { categories } from "apps/user-ui/src/configs/categories";
import axiosInstance from "apps/user-ui/src/utils/axiosInstance";
import ShopCard from "apps/user-ui/src/shared/components/cards/shop-card";
import { countries } from "apps/user-ui/src/utils/countries";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  const handlePageChange = (direction: "prev" | "next") => {
    setPage((prev) => {
      if (direction === "prev") return Math.max(1, prev - 1);
      return Math.min(totalPages, prev + 1);
    });
  };

  const visibleCountries = useMemo(() => countries.slice(0, 16), []);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-2 mb-8">
          <p className="text-sm text-gray-500">Home · All Shops</p>
          <h1 className="text-3xl font-semibold text-gray-900">All Shops</h1>
          <p className="text-sm text-gray-600">
            Discover verified shops across categories and countries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 h-fit">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
            <div className="space-y-2 mb-6 max-h-[360px] overflow-auto pr-1">
              {categories.map((cat) => (
                <label key={cat.value} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.label)}
                    onChange={() => toggleCategory(cat.label)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="capitalize">{cat.label.toLowerCase()}</span>
                </label>
              ))}
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">Countries</h3>
            <div className="space-y-2 max-h-[240px] overflow-auto pr-1">
              {visibleCountries.map((country) => (
                <label key={country} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedCountries.includes(country)}
                    onChange={() => toggleCountry(country)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">{country}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Shops */}
          <div className="md:col-span-3">
            {isShopLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading shops...</p>
                </div>
              </div>
            ) : shops.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <p className="text-gray-600 text-lg">No shops found</p>
                  <p className="text-gray-500 text-sm mt-1">Try adjusting filters.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {shops.map((shop) => (
                    <ShopCard key={shop.id} shop={shop} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-10">
                    <button
                      onClick={() => handlePageChange("prev")}
                      disabled={page === 1}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange("next")}
                      disabled={page === totalPages}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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