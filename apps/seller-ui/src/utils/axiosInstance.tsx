import axios from "axios";

// 1. Lấy URI từ biến môi trường
const SERVER_URI = process.env.NEXT_PUBLIC_SERVER_URI || "http://localhost:8080";
const BASE_URL = SERVER_URI;

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

let isRefreshing = false;
let refreshSubscribers: ((token?: string) => void)[] = [];

// Hàm logout an toàn
const handleLogout = () => {
  if (typeof window !== "undefined" && window.location.pathname !== '/login') {
    // Xóa cache hoặc localStorage nếu cần thiết ở đây
    window.location.href = '/login';
  }
};

const subscribeTokenRefresh = (callback: (token?: string) => void) => {
  refreshSubscribers.push(callback);
};

const onRefreshSuccess = (token?: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

axiosInstance.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu không phải lỗi 401 hoặc đã retry rồi thì bỏ qua
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // [QUAN TRỌNG] Nếu đang ở trang Login mà lỗi 401 -> Dừng lại, không refresh
    if (typeof window !== "undefined" && window.location.pathname === '/login') {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh(() => resolve(axiosInstance(originalRequest)));
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Gọi refresh token
      // Lưu ý: BASE_URL đã chuẩn hóa có đuôi /api nên gọi trực tiếp /refresh-token
      const refreshResponse = await axios.post(
        `${BASE_URL}/api/refresh-token`, 
        {},
        { withCredentials: true }
      );

      console.log("Token refreshed successfully, retrying original request");
      isRefreshing = false;
      onRefreshSuccess();
      
      // Retry original request với config mới để đảm bảo cookies mới được gửi
      return axiosInstance({
        ...originalRequest,
        headers: {
          ...originalRequest.headers,
        }
      });
      
    } catch (refreshError) {
      console.error("Token refresh failed:", refreshError);
      isRefreshing = false;
      refreshSubscribers = [];
      handleLogout();
      return Promise.reject(refreshError);
    }
  }
);

export default axiosInstance;