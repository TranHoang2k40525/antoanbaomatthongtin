import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Địa chỉ backend API (chỉ sửa ở đây, các file khác chỉ import api.js)
export const API_URL = 'http://192.168.1.105:4000/api';

// Biến lưu token trong bộ nhớ tạm (RAM)
let accessToken = null;
let refreshToken = null;

export function getApiUrl() {
  return API_URL;
}

/**
 * Load token từ AsyncStorage khi app khởi động
 */
export async function loadTokensFromStorage() {
  accessToken = await AsyncStorage.getItem('accessToken');
  refreshToken = await AsyncStorage.getItem('refreshToken');
}

/**
 * Lưu token vào AsyncStorage + biến tạm
 */
export async function saveTokens(a, r) {
  accessToken = a;
  refreshToken = r;
  await AsyncStorage.setItem('accessToken', a);
  await AsyncStorage.setItem('refreshToken', r);
}

/**
 * Xóa token khỏi AsyncStorage + biến tạm
 */
export async function clearTokens() {
  accessToken = null;
  refreshToken = null;
  await AsyncStorage.removeItem('accessToken');
  await AsyncStorage.removeItem('refreshToken');
}

/**
 * Tạo instance Axios
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 5000,
});

/**
 * Request Interceptor
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
 *  Response Interceptor
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
        const r = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: rt });
        const newAccess = r.data.token;

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

// Endpoint chuẩn hóa cho các màn hình khác chỉ cần import từ đây
export const loginApi = (EmailOrPhone, Password) => api.post('/auth/login', { EmailOrPhone, Password });
export const registerApi = (data) => api.post('/auth/register', data);
export const getUserApi = () => api.get('/user/me');
export const updateUserApi = (data) => api.put('/user/me', data);
export const updateAvatarApi = (formData) => api.post('/user/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// Forgot password (OTP)
export const requestForgotPasswordOtp = (email) => api.post('/auth/forgot-password/request-otp', { email });
export const verifyForgotPasswordOtp = (email, code, newPassword) => api.post('/auth/forgot-password/verify', { email, code, newPassword });
// Change password (OTP, must be logged in) - SỬA: Gửi oldPassword khi request OTP
export const requestChangePasswordOtp = (oldPassword) => api.post('/auth/change-password/request-otp', { oldPassword });
export const verifyChangePasswordOtp = (oldPassword, newPassword, code) => api.post('/auth/change-password/verify', { oldPassword, newPassword, code });

export default api;