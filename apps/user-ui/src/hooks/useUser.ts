import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../utils/axiosInstance";

// Fetch user data from API
const fetchUser = async () => {
  try {
    const response = await axiosInstance.get('/logged-in-user');
    return response.data.user;
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

const useUser = () => {
  const {
    data: user,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000, 
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { user, isLoading, isError, refetch };
};

export default useUser;