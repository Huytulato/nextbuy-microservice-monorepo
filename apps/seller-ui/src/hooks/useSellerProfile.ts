import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance'
import toast from 'react-hot-toast'

export const useSellerProfile = () => {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['seller-profile'],
    queryFn: async () => {
      const res = await axiosInstance.get('/seller/api/get-seller-profile')
      return res.data.seller
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await axiosInstance.put('/seller/api/update-seller-profile', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-profile'] })
      toast.success('Seller profile updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update seller profile')
    },
  })

  return {
    seller: data,
    isLoading,
    error,
    updateSeller: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  }
}

