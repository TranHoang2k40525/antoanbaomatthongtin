import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import api, { clearTokens } from '../api';

export default function HomeScreen({ navigation }) {
  /**
   * 📡 Gọi API yêu cầu xác thực
   */
  const callProtected = async () => {
    try {
      const r = await api.get('/protected');
      Alert.alert('Kết quả API', JSON.stringify(r.data));
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.error || e.message);
    }
  };

  /**
   * 🚪 Đăng xuất
   */
  const logout = async () => {
    try {
      // Gọi API logout (nếu có xử lý trên server)
      await api.post('/logout');
    } catch (e) {
      // Bỏ qua lỗi nếu server không hỗ trợ logout
    }

    // Xóa token trong AsyncStorage
    await clearTokens();

    // Quay lại màn hình Login, thay thế stack
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Màn hình chính</Text>

      <View style={styles.buttonWrapper}>
        <Button title="Gọi API bảo vệ" onPress={callProtected} />
      </View>

      <View style={styles.buttonWrapper}>
        <Button
          title="Đổi mật khẩu"
          onPress={() => navigation.navigate('ChangePassword')}
        />
      </View>

      <View style={styles.buttonWrapper}>
        <Button title="Đăng xuất" onPress={logout} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 25,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  buttonWrapper: {
    marginVertical: 8,
  },
});
