import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import api, { saveTokens } from '../api';

export default function LoginScreen({ navigation }) {
  const [account, setAccount] = useState(''); // nhập email hoặc username
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  /**
   * 📥 Xử lý đăng nhập
   */
  const handleLogin = async () => {
    const trimmedAccount = account.trim();
    const trimmedPassword = password.trim();

    if (!trimmedAccount || !trimmedPassword) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ email/tài khoản và mật khẩu');
      return;
    }

    try {
      const res = await api.post('/login', {
        usernameOrEmail: trimmedAccount,
        password: trimmedPassword,
      });

      const data = res.data;
      await saveTokens(data.accessToken, data.refreshToken);

      navigation.replace('Home'); // 🔹 Chuyển sang Home sau khi login thành công
    } catch (e) {
      Alert.alert('Lỗi đăng nhập', e.response?.data?.error || e.message);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#E57373" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đăng nhập</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Cinema Section */}
      <View style={styles.cinemaSection}>
        <View style={styles.movieScreen}>
          <Image
            source={require('../assets/image3.png')}
            style={styles.cinemaImage}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Form */}
      <ScrollView 
        style={styles.formSection}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          {/* Tài khoản */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email hoặc tên đăng nhập"
              placeholderTextColor="#999"
              value={account}
              onChangeText={setAccount}
              autoCapitalize="none"
            />
          </View>

          {/* Mật khẩu */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Mật khẩu"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeText}>
                {showPassword ? '👁️' : '🙈'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Nút đăng nhập */}
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>Đăng nhập</Text>
          </TouchableOpacity>

          {/* Quên mật khẩu */}
          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={() => navigation.navigate('ForgotPassword')}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotPasswordText}>Quên mật khẩu ?</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>hoặc</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Nút đăng ký */}
          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.8}
          >
            <Text style={styles.createAccountText}>
              Đăng kí tài khoản mTB 67CS1
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E57373',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: StatusBar.currentHeight + 15,
    paddingBottom: 10,
  },
  backButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  headerSpacer: {
    width: 30,
  },
  cinemaSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  movieScreen: {
    borderRadius: 15,
    borderWidth: 3,
    borderColor: 'white',
    overflow: 'hidden',
    height: 200,
  },
  cinemaImage: {
    width: '100%',
    height: '100%',
  },
  formSection: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingTop: 30,
  },
  formContainer: {
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  inputContainer: {
    marginBottom: 25,
    position: 'relative',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 15,
    paddingHorizontal: 5,
    fontSize: 14,
    color: '#333',
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeButton: {
    position: 'absolute',
    right: 5,
    top: 15,
    padding: 5,
  },
  eyeText: {
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#E57373',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 25,
    shadowColor: '#E57373',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: '#999',
    fontSize: 14,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    color: '#999',
    fontSize: 14,
    marginHorizontal: 15,
  },
  createAccountButton: {
    borderWidth: 1,
    borderColor: '#E57373',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  createAccountText: {
    color: '#E57373',
    fontSize: 14,
    fontWeight: '400',
  },
});




// import React, { useState } from 'react';
// import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
// import api, { saveTokens } from '../api';

// export default function LoginScreen({ navigation }) {
//   // State quản lý input
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');

//   /**
//    * 📥 Xử lý đăng nhập
//    */
//   const handleLogin = async () => {
//     try {
//       const res = await api.post('/login', { username, password });
//       const data = res.data;

//       // Lưu token vào AsyncStorage
//       await saveTokens(data.accessToken, data.refreshToken);

//       // Điều hướng sang Home và thay thế stack (không quay lại được Login)
//       navigation.replace('Home');
//     } catch (e) {
//       Alert.alert(
//         'Lỗi đăng nhập',
//         e.response?.data?.error || e.message
//       );
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Đăng nhập</Text>

//       <TextInput
//         placeholder="Tên đăng nhập"
//         value={username}
//         onChangeText={setUsername}
//         style={styles.input}
//       />

//       <TextInput
//         placeholder="Mật khẩu"
//         secureTextEntry
//         value={password}
//         onChangeText={setPassword}
//         style={styles.input}
//       />

//       <Button title="Đăng nhập" onPress={handleLogin} />

//       <View style={{ marginTop: 10 }}>
//         <Button
//           title="Đăng ký"
//           onPress={() => navigation.navigate('Register')}
//         />
//       </View>

//       <View style={{ marginTop: 10 }}>
//         <Button
//           title="Quên mật khẩu"
//           onPress={() => navigation.navigate('ForgotPassword')}
//         />
//       </View>
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
