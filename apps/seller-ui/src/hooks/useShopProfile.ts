import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance'
import toast from 'react-hot-toast'

export const useShopProfile = () => {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['shop-profile'],
    queryFn: async () => {
      const res = await axiosInstance.get('/seller/api/get-shop-profile')
      return res.data.shop
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await axiosInstance.put('/seller/api/update-shop-profile', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-profile'] })
      toast.success('Shop profile updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update shop profile')
    },
  })

  return {
    shop: data,
    isLoading,
    error,
    updateShop: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  }
}

