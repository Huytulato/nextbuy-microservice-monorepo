'use client'
import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useFilteredProducts } from '../../../hooks/useProductSearch'
import ProductCard from '../../../shared/components/cards/product-card'
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react'

interface Product {
  id: string
  title: string
  slug: string
  images: Array<{ url: string }>
  sale_price: number
  regular_price: number
  ratings: number
  brands: string
  shops?: { name: string }
}

const SearchResultsContent = () => {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  
  const [currentPage, setCurrentPage] = useState(1)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  
  const { data, isLoading, error } = useFilteredProducts({
    searchQuery: query,
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
    categories: selectedCategories,
    colors: selectedColors,
    sizes: selectedSizes,
    page: currentPage,
    limit: 12
  })

  const products: Product[] = data?.products || []
  const totalPages = data?.pagination?.totalPages || 1

  // Reset về trang 1 khi thay đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1)
  }, [query, priceRange, selectedCategories, selectedColors, selectedSizes])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const handleColorChange = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color)
        ? prev.filter(c => c !== color)
        : [...prev, color]
    )
  }

  const handleSizeChange = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size]
    )
  }

  const clearFilters = () => {
    setPriceRange([0, 5000])
    setSelectedCategories([])
    setSelectedColors([])
    setSelectedSizes([])
  }

  const hasActiveFilters = 
    selectedCategories.length > 0 || 
    selectedColors.length > 0 || 
    selectedSizes.length > 0 || 
    priceRange[0] !== 0 || 
    priceRange[1] !== 5000

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-6'>
          <h1 className='text-2xl md:text-3xl font-bold text-gray-900 mb-2'>
            Search Results for "{query}"
          </h1>
          <p className='text-gray-600'>
            {isLoading ? 'Loading...' : `${data?.pagination?.totalProducts || 0} products found`}
          </p>
        </div>

        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className='lg:hidden flex items-center gap-2 mb-4 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors'
        >
          <Filter size={18} />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>

        <div className='flex gap-6'>
          {/* Filters Sidebar */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block w-full lg:w-64 flex-shrink-0`}>
            <div className='bg-white rounded-lg shadow-md p-6 sticky top-4'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-lg font-semibold text-gray-900'>Filters</h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className='text-sm text-red-600 hover:text-red-700 font-medium'
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Price Range */}
              <div className='mb-6 pb-6 border-b border-gray-200'>
                <h3 className='text-sm font-semibold text-gray-900 mb-3'>Price Range</h3>
                <div className='space-y-3'>
                  <input
                    type='range'
                    min='0'
                    max='5000'
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className='w-full accent-red-600'
                  />
                  <div className='flex items-center justify-between text-sm text-gray-600'>
                    <span>${priceRange[0]}</span>
                    <span>${priceRange[1]}</span>
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className='mb-6 pb-6 border-b border-gray-200'>
                <h3 className='text-sm font-semibold text-gray-900 mb-3'>Categories</h3>
                <div className='space-y-2'>
                  {['Electronics', 'Fashion', 'Home & Living', 'Beauty', 'Sports', 'Books'].map((category) => (
                    <label key={category} className='flex items-center gap-2 cursor-pointer'>
                      <input
                        type='checkbox'
                        checked={selectedCategories.includes(category)}
                        onChange={() => handleCategoryChange(category)}
                        className='w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500'
                      />
                      <span className='text-sm text-gray-700'>{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div className='mb-6 pb-6 border-b border-gray-200'>
                <h3 className='text-sm font-semibold text-gray-900 mb-3'>Colors</h3>
                <div className='flex flex-wrap gap-2'>
                  {[
                    { name: 'Red', hex: '#EF4444' },
                    { name: 'Blue', hex: '#3B82F6' },
                    { name: 'Green', hex: '#10B981' },
                    { name: 'Yellow', hex: '#F59E0B' },
                    { name: 'Purple', hex: '#8B5CF6' },
                    { name: 'Black', hex: '#000000' }
                  ].map((color) => (
                    <button
                      key={color.name}
                      onClick={() => handleColorChange(color.name)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        selectedColors.includes(color.name)
                          ? 'border-gray-900 scale-110'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Sizes */}
              <div>
                <h3 className='text-sm font-semibold text-gray-900 mb-3'>Sizes</h3>
                <div className='flex flex-wrap gap-2'>
                  {['S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                    <button
                      key={size}
                      onClick={() => handleSizeChange(size)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        selectedSizes.includes(size)
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <main className='flex-1'>
            {isLoading && (
              <div className='flex items-center justify-center h-64'>
                <div className='animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent'></div>
              </div>
            )}

            {error && (
              <div className='bg-red-50 border border-red-200 rounded-lg p-6 text-center'>
                <p className='text-red-600'>Error loading products. Please try again.</p>
              </div>
            )}

            {!isLoading && !error && products.length === 0 && (
              <div className='bg-white rounded-lg shadow-md p-12 text-center'>
                <p className='text-xl text-gray-600 mb-2'>No products found</p>
                <p className='text-gray-500'>Try adjusting your search or filters</p>
              </div>
            )}

            {!isLoading && !error && products.length > 0 && (
              <>
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8'>
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product as any} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className='flex items-center justify-center gap-2'>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className='p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors'
                    >
                      <ChevronLeft size={20} />
                    </button>

                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }

                      return (
                        <button
                          key={i}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'bg-red-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className='p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors'
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent'></div>
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  )
}
