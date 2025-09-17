
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api';

export default function ForgotPasswordScreen({ navigation }) {
  // State quản lý input
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sent, setSent] = useState(false); // Trạng thái đã gửi OTP hay chưa
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /**
   * 📩 Gửi OTP đến email
   */
  const sendOtp = async () => {
    if (!email) return Alert.alert('Lỗi', 'Vui lòng nhập email');
    try {
      setLoading(true);
      await api.post('/forgot-password', { email });
      Alert.alert('Thành công', 'Mã OTP đã được gửi đến email của bạn');
      setSent(true);
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.error || e.message);
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
    try {
      setLoading(true);
      await api.post('/verify-otp', { email, code, newPassword });
      Alert.alert('Thành công', 'Mật khẩu đã được đặt lại');
      navigation.navigate('Login');
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.error || e.message);
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
});





// import React, { useState } from 'react';
// import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
// import api from '../api';

// export default function ForgotPasswordScreen({ navigation }) {
//   // State quản lý input
//   const [email, setEmail] = useState('');
//   const [code, setCode] = useState('');
//   const [newPassword, setNewPassword] = useState('');
//   const [sent, setSent] = useState(false); // Trạng thái đã gửi OTP hay chưa

//   /**
//    * 📩 Gửi OTP đến email
//    */
//   const sendOtp = async () => {
//     try {
//       await api.post('/forgot-password', { email });
//       Alert.alert('Thành công', 'Mã OTP đã được gửi đến email');
//       setSent(true);
//     } catch (e) {
//       Alert.alert('Lỗi', e.response?.data?.error || e.message);
//     }
//   };

//   /**
//    * ✅ Xác minh OTP và đặt lại mật khẩu
//    */
//   const verify = async () => {
//     try {
//       await api.post('/verify-otp', { email, code, newPassword });
//       Alert.alert('Thành công', 'Mật khẩu đã được đặt lại');
//       navigation.navigate('Login');
//     } catch (e) {
//       Alert.alert('Lỗi', e.response?.data?.error || e.message);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Quên mật khẩu</Text>

//       {/* Nhập email */}
//       <TextInput
//         placeholder="Email"
//         value={email}
//         onChangeText={setEmail}
//         style={styles.input}
//         keyboardType="email-address"
//       />

//       {!sent ? (
//         <Button title="Gửi OTP" onPress={sendOtp} />
//       ) : (
//         <>
//           {/* Nhập OTP */}
//           <TextInput
//             placeholder="Mã OTP"
//             value={code}
//             onChangeText={setCode}
//             style={styles.input}
//           />

//           {/* Nhập mật khẩu mới */}
//           <TextInput
//             placeholder="Mật khẩu mới"
//             secureTextEntry
//             value={newPassword}
//             onChangeText={setNewPassword}
//             style={styles.input}
//           />

//           <Button title="Xác minh & Đặt lại" onPress={verify} />
//         </>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     padding: 20,
//   },
//   title: {
//     fontSize: 24,
//     marginBottom: 20,
//     textAlign: 'center',
//     fontWeight: 'bold',
//   },
//   input: {
//     borderWidth: 1,
//     padding: 10,
//     marginBottom: 12,
//     borderRadius: 5,
//     borderColor: '#ccc',
//   },
// });
