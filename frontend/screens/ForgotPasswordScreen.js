import React, { useState, useEffect } from 'react'; // Sửa: Thêm useEffect
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { requestForgotPasswordOtp, verifyForgotPasswordOtp } from '../api';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [timer, setTimer] = useState(0); // Sửa: Thêm timer (giây)

  // Đếm ngược khi gửi OTP thành công
  useEffect(() => {
    let interval;
    if (sent && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0 && sent) {
      Alert.alert('Thông báo', 'Mã OTP đã hết hạn!');
      setSent(false); // Reset để gửi lại OTP
      setCode(''); // Xóa OTP nhập
    }
    return () => clearInterval(interval); // Cleanup
  }, [sent, timer]);

  /**
   * 📩 Gửi OTP đến email
   */
  const sendOtp = async () => {
    if (!email) return Alert.alert('Lỗi', 'Vui lòng nhập email');
    try {
      setLoading(true);
      await requestForgotPasswordOtp(email);
      Alert.alert('Thành công', 'Mã OTP đã được gửi đến email của bạn');
      setSent(true);
      setTimer(60); // Bắt đầu đếm ngược 60 giây
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ Xác minh OTP và đặt lại mật khẩu
   */
  const verify = async () => {
    if (!code || !newPassword) {
      return Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ OTP và mật khẩu mới');
    }
    if (newPassword.length < 6) {
      return Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
    }
    try {
      setLoading(true);
      await verifyForgotPasswordOtp(email, code, newPassword);
      Alert.alert('Thành công', 'Mật khẩu đã được đặt lại');
      navigation.navigate('Login');
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quên mật khẩu</Text>

      {/* Nhập email */}
      <TextInput
        placeholder="Nhập email đã đăng ký"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {!sent ? (
        loading ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : (
          <Button title="Gửi OTP" onPress={sendOtp} />
        )
      ) : (
        <>
          {/* Hiển thị đếm ngược */}
          {timer > 0 && <Text style={styles.timer}>Thời gian còn lại: {timer} giây</Text>}
          {/* Nhập OTP */}
          <TextInput
            placeholder="Nhập mã OTP"
            value={code}
            onChangeText={setCode}
            style={styles.input}
            keyboardType="numeric"
          />

          {/* Nhập mật khẩu mới */}
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Mật khẩu mới"
              secureTextEntry={!showPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#007bff" />
          ) : (
            <Button title="Xác minh & Đặt lại" onPress={verify} />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    marginBottom: 25,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#007bff',
  },
  input: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  eyeButton: {
    padding: 10,
  },
  timer: {  // Sửa: Thêm style cho timer
    textAlign: 'center',
    color: 'red',
    marginBottom: 10,
  },
});