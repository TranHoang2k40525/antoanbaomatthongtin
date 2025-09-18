import React, { useState, useEffect } from 'react'; // Sửa: Thêm useEffect
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { requestChangePasswordOtp, verifyChangePasswordOtp } from '../api';
import { clearTokens } from '../api';

export default function ChangePasswordScreen({ navigation }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [timer, setTimer] = useState(0); // Sửa: Thêm timer (giây)

  // Đếm ngược khi gửi OTP thành công
  useEffect(() => {
    let interval;
    if (otpSent && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0 && otpSent) {
      Alert.alert('Thông báo', 'Mã OTP đã hết hạn!');
      setOtpSent(false); // Reset để gửi lại OTP
      setOtp(''); // Xóa OTP nhập
    }
    return () => clearInterval(interval); // Cleanup
  }, [otpSent, timer]);

  const handleRequestOtp = async () => {
    if (!oldPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu cũ');
      return;
    }
    setLoading(true);
    try {
      await requestChangePasswordOtp(oldPassword);
      Alert.alert('Thành công', 'Mã OTP đã được gửi về email của bạn.');
      setOtpSent(true);
      setTimer(60); // Bắt đầu đếm ngược 60 giây
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !otp) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    try {
      await verifyChangePasswordOtp(oldPassword, newPassword, otp);
      Alert.alert('Thành công', 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
      await clearTokens();
      navigation.replace('Login');
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đổi mật khẩu</Text>
      {!otpSent ? (
        <>
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Mật khẩu cũ"
              secureTextEntry={!showOldPassword}
              value={oldPassword}
              onChangeText={setOldPassword}
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
            />
            <TouchableOpacity
              onPress={() => setShowOldPassword(!showOldPassword)}
              style={styles.eyeButton}
            >
              <Ionicons name={showOldPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator size="large" />
          ) : (
            <Button title="Gửi mã OTP về email" onPress={handleRequestOtp} />
          )}
        </>
      ) : (
        <>
          {timer > 0 && <Text style={styles.timer}>Thời gian còn lại: {timer} giây</Text>}
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Mật khẩu cũ"
              secureTextEntry={!showOldPassword}
              value={oldPassword}
              onChangeText={setOldPassword}
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
            />
            <TouchableOpacity
              onPress={() => setShowOldPassword(!showOldPassword)}
              style={styles.eyeButton}
            >
              <Ionicons name={showOldPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Mật khẩu mới"
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
            />
            <TouchableOpacity
              onPress={() => setShowNewPassword(!showNewPassword)}
              style={styles.eyeButton}
            >
              <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
            </TouchableOpacity>
          </View>
          <TextInput
            placeholder="Nhập mã OTP"
            value={otp}
            onChangeText={setOtp}
            style={styles.input}
            keyboardType="numeric"
          />
          {loading ? (
            <ActivityIndicator size="large" />
          ) : (
            <Button title="Đổi mật khẩu" onPress={handleChangePassword} />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 22, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 10,
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