'use client'
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../utils/axiosInstance';
import { useRouter } from 'next/navigation';

interface Admin {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export const useAdmin = () => {
  const router = useRouter();

  const { data: admin, isLoading, error } = useQuery<Admin>({
    queryKey: ['admin'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/logged-in-admin');
      return response.data.user || response.data.admin;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const logout = async () => {
    try {
      await axiosInstance.get('/api/logout-admin');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/');
    }
  };

  return {
    admin,
    isLoading,
    error,
    logout,
    isAuthenticated: !!admin,
  };
};
