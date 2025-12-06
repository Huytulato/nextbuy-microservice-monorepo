import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../utils/axiosInstance";

// Fetch seller data from API
const fetchSeller = async () => {
  try {
    const response = await axiosInstance.get('/api/logged-in-seller');
    return response.data.seller;
  } catch (error: any) {
    // Nếu lỗi là 401 (Chưa đăng nhập), chúng ta coi như user là null
    // Như vậy React Query sẽ không báo lỗi đỏ (isError = false)
    if (error.response?.status === 401) {
      return null;
    }
    // Nếu là lỗi khác (500 Server Error), thì ném lỗi ra để xử lý
    throw error;
  }
};

const useSeller = () => {
  const {
    data: seller,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['seller'],
    queryFn: fetchSeller,
    staleTime: 5 * 60 * 1000, 
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { seller, isLoading, isError, refetch };
};

export default useSeller;