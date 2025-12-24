import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../utils/axiosInstance";

// Fetch user orders from API
const fetchUserOrders = async () => {
  try {
    const response = await axiosInstance.get('/order/api/user-orders');
    return response.data.orders || [];
  } catch (error: any) {
    if (error.response?.status === 401) {
      return [];
    }
    throw error;
  }
};

// Fetch user order details
const fetchUserOrderDetails = async (orderId: string) => {
  try {
    const response = await axiosInstance.get(`/order/api/user-order-details/${orderId}`);
    return response.data.order;
  } catch (error: any) {
    if (error.response?.status === 401) {
      return null;
    }
    throw error;
  }
};

export const useOrders = () => {
  const {
    data: orders,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['user-orders'],
    queryFn: fetchUserOrders,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { orders: orders || [], isLoading, isError, refetch };
};

export const useOrderDetails = (orderId: string | null) => {
  const {
    data: order,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['user-order-details', orderId],
    queryFn: () => fetchUserOrderDetails(orderId!),
    enabled: !!orderId,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { order, isLoading, isError, refetch };
};

