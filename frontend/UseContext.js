import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginApi, registerApi, getUserApi, updateUserApi, updateAvatarApi, loadTokensFromStorage, saveTokens, clearTokens } from './api';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await loadTokensFromStorage();
      try {
        const res = await getUserApi();
        setUser(res.data.user);
      } catch (e) {
        setUser(null);
      }
      setLoading(false);
    };
    init();
  }, []);

  // Đăng nhập
  const login = async (account, password) => {
    const res = await loginApi(account, password);
    await saveTokens(res.data.token, res.data.refreshToken);
    const userRes = await getUserApi();
    setUser(userRes.data.user);
    return userRes.data.user;
  };

  // Đăng ký
  const register = async (data) => {
    await registerApi(data);
  };

  // Đăng xuất
  const logout = async () => {
    await clearTokens();
    setUser(null);
  };

  // Cập nhật thông tin cá nhân
  const updateProfile = async (data) => {
    await updateUserApi(data);
    const userRes = await getUserApi();
    setUser(userRes.data.user);
  };

  // Cập nhật avatar
  const updateAvatar = async (file) => {
    // Hỗ trợ cả result từ expo-image-picker v14+ (result.assets[0]) hoặc file trực tiếp
    const img = file.assets && file.assets[0] ? file.assets[0] : file;
    const formData = new FormData();
    formData.append('avatar', {
      uri: img.uri,
      name: img.fileName || 'avatar.jpg',
      type: img.type || 'image/jpeg',
    });
    await updateAvatarApi(formData);
    const userRes = await getUserApi();
    setUser(userRes.data.user);
  };

  return (
    <UserContext.Provider value={{ user, loading, login, register, logout, updateProfile, updateAvatar }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
