import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Địa chỉ backend API
const API_URL = 'http://192.168.0.102:4000/api';

// Biến lưu token trong bộ nhớ tạm (RAM)
let accessToken = null;
let refreshToken = null;

/**
 * 📥 Load token từ AsyncStorage khi app khởi động
 */
export async function loadTokensFromStorage() {
  accessToken = await AsyncStorage.getItem('accessToken');
  refreshToken = await AsyncStorage.getItem('refreshToken');
}

/**
 * 💾 Lưu token vào AsyncStorage + biến tạm
 */
export async function saveTokens(a, r) {
  accessToken = a;
  refreshToken = r;
  await AsyncStorage.setItem('accessToken', a);
  await AsyncStorage.setItem('refreshToken', r);
}

/**
 * 🗑️ Xóa token khỏi AsyncStorage + biến tạm
 */
export async function clearTokens() {
  accessToken = null;
  refreshToken = null;
  await AsyncStorage.removeItem('accessToken');
  await AsyncStorage.removeItem('refreshToken');
}

/**
 * 🚀 Tạo instance Axios
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 5000,
});

/**
 * 🔑 Request Interceptor
 * - Tự động gắn Access Token vào header Authorization trước khi gửi request
 */
api.interceptors.request.use(async (config) => {
  if (!accessToken) {
    accessToken = await AsyncStorage.getItem('accessToken');
  }
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/**
 * ♻️ Response Interceptor
 * - Nếu gặp lỗi 401 (token hết hạn) → thử refresh token
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi 401 và request chưa thử lại lần nào
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Lấy refresh token
      const rt = refreshToken || (await AsyncStorage.getItem('refreshToken'));
      if (!rt) {
        await clearTokens();
        return Promise.reject(error);
      }

      try {
        // Gọi API refresh token
        const r = await axios.post(`${API_URL}/refresh`, { refreshToken: rt });
        const newAccess = r.data.accessToken;

        // Lưu lại access token mới
        accessToken = newAccess;
        await AsyncStorage.setItem('accessToken', newAccess);

        // Gửi lại request cũ với token mới
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return axios(originalRequest);
      } catch (e) {
        // Refresh thất bại → clear token, buộc user login lại
        await clearTokens();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
