import { useMutation } from '@tanstack/react-query'
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance'
import toast from 'react-hot-toast'

export const useChangePassword = () => {
  const mutation = useMutation({
    mutationFn: async (data: { oldPassword: string; newPassword: string }) => {
      const res = await axiosInstance.put('/seller/api/change-password', data)
      return res.data
    },
    onSuccess: () => {
      toast.success('Password changed successfully!')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to change password')
    },
  })

  return {
    changePassword: mutation.mutate,
    isChanging: mutation.isPending,
  }
}

