import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../utils/axiosInstance'

interface SearchProduct {
  id: string
  title: string
  slug: string
}

interface SearchResponse {
  products: SearchProduct[]
}

/**
 * Hook để tìm kiếm sản phẩm với autocomplete
 * @param query - Từ khóa tìm kiếm
 * @param enabled - Có thực hiện query hay không (mặc định: true khi query có ít nhất 2 ký tự)
 */
export const useProductSearch = (query: string, enabled = true) => {
  return useQuery({
    queryKey: ['product-search', query],
    queryFn: async () => {
      if (!query || query.trim().length < 2) {
        return { products: [] }
      }

      const response = await axiosInstance.get<SearchResponse>(
        `/product/api/search-products?query=${encodeURIComponent(query.trim())}`
      )
      return response.data
    },
    enabled: enabled && query.trim().length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

interface FilteredProductsParams {
  minPrice?: number
  maxPrice?: number
  categories?: string[]
  colors?: string[]
  sizes?: string[]
  page?: number
  limit?: number
  searchQuery?: string
}

/**
 * Hook để lấy danh sách sản phẩm có lọc
 */
export const useFilteredProducts = (params: FilteredProductsParams) => {
  const queryParams = new URLSearchParams()
  
  if (params.minPrice !== undefined) queryParams.append('minPrice', params.minPrice.toString())
  if (params.maxPrice !== undefined) queryParams.append('maxPrice', params.maxPrice.toString())
  if (params.categories?.length) queryParams.append('categories', params.categories.join(','))
  if (params.colors?.length) queryParams.append('colors', params.colors.join(','))
  if (params.sizes?.length) queryParams.append('sizes', params.sizes.join(','))
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.limit) queryParams.append('limit', params.limit.toString())
  if (params.searchQuery) queryParams.append('search', params.searchQuery)

  const queryString = queryParams.toString()

  return useQuery({
    queryKey: ['filtered-products', queryString],
    queryFn: async () => {
      const response = await axiosInstance.get(
        `/product/api/get-filtered-products${queryString ? `?${queryString}` : ''}`
      )
      return response.data
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
