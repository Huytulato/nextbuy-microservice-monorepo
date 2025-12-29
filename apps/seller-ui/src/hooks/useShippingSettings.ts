import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance'
import toast from 'react-hot-toast'

export const useShippingSettings = () => {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['shop-profile'],
    queryFn: async () => {
      const res = await axiosInstance.get('/seller/api/get-shop-profile')
      return res.data.shop?.shippingSettings || null
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (shippingSettings: any) => {
      const res = await axiosInstance.put('/seller/api/update-shipping-settings', {
        shippingSettings
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-profile'] })
      toast.success('Shipping settings updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update shipping settings')
    },
  })

  return {
    shippingSettings: data,
    isLoading,
    error,
    updateShipping: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  }
}

