'use client'

import React from 'react'
import Hero from '../shared/modules/hero'
import SectionTitle from '../shared/components/section/section-title'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../utils/axiosInstance'
import ProductCard from '../shared/components/cards/product-card'
import ShopCard from '../shared/components/cards/shop-card'

interface Shop {
  id: string
  name: string
  description?: string
  avatar: string
  coverBanner?: string
  address?: string
  followers?: []
  rating?: number
  category?: string
}

const HomePage = () => {
  const {
    data: suggestedProducts,
    isLoading: isSuggestedLoading,
  } = useQuery({
    queryKey: ['products', 'suggested'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/product/api/get-all-products?page=1&limit=8')
        // BaseController returns { success: true, data: { products: [...] } }
        return res.data?.data?.products || []
      } catch (error) {
        console.error('Error fetching suggested products:', error)
        return []
      }
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const { data: latestProducts, isLoading: isLatestLoading } = useQuery({
    queryKey: ['products', 'latest'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/product/api/get-all-products?page=1&limit=8&type=latest')
        // BaseController returns { success: true, data: { products: [...] } }
        return res.data?.data?.products || []
      } catch (error) {
        console.error('Error fetching latest products:', error)
        return []
      }
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const { data: topOffers, isLoading: isOffersLoading } = useQuery({
    queryKey: ['products', 'offers'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/product/api/get-all-events?limit=8')
        // BaseController returns { success: true, data: { events: [...] } }
        return res.data?.data?.events || []
      } catch (error) {
        console.error('Error fetching top offers:', error)
        return []
      }
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const { data: topShops, isLoading: isShopsLoading } = useQuery({
    queryKey: ['shops', 'top'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/shop/api/top-shops')
        // Seller service returns { success: true, topShops: [...] }
        return res.data?.topShops || []
      } catch (error) {
        console.error('Error fetching top shops:', error)
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const renderProductsSection = (
    title: string,
    loading: boolean,
    items?: any[],
    emptyText?: string
  ) => (
    <div className='my-10'>
      <SectionTitle title={title} />
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-[250px] bg-gray-200 animate-pulse rounded" />
          ))}
        </div>
      ) : items && items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="text-gray-600 mt-4">{emptyText || 'No products available'}</p>
      )}
    </div>
  )

  return (
    <div>
      <Hero />
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {renderProductsSection('Suggested Products', isSuggestedLoading, suggestedProducts)}
        {renderProductsSection('Latest Products', isLatestLoading, latestProducts)}
        {renderProductsSection('Top Offers', isOffersLoading, topOffers, 'No offers available')}

        <div className='my-10'>
          <SectionTitle title='Top Shops' />
          {isShopsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-[220px] bg-gray-200 animate-pulse rounded" />
              ))}
            </div>
          ) : topShops && topShops.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {topShops.map((shop: Shop) => (
                <ShopCard key={shop.id} shop={shop} />
              ))}
            </div>
          ) : (
            <p className="text-gray-600 mt-4">No shops available</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default HomePage