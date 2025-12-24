import axios from "axios";

const SERVER_URI = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SERVER_URI || "http://localhost:8080";
const BASE_URL = SERVER_URI;

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

let isRefreshing = false;
let refreshSubscribers: ((token?: string) => void)[] = [];

// Hàm logout an toàn
const handleLogout = () => {
  if (typeof window !== "undefined" && window.location.pathname !== '/') {
    window.location.href = '/';
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

    // Nếu đang ở trang Login mà lỗi 401 -> Dừng lại, không refresh
    if (typeof window !== "undefined" && window.location.pathname === '/') {
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
      // Gọi refresh token cho admin
      await axios.post(
        `${BASE_URL}/api/refresh-token`, 
        {},
        { withCredentials: true }
      );

      isRefreshing = false;
      onRefreshSuccess();
      return axiosInstance(originalRequest);
      
    } catch (refreshError) {
      isRefreshing = false;
      refreshSubscribers = [];
      handleLogout();
      return Promise.reject(refreshError);
    }
  }
);

export default axiosInstance;
