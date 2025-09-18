import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import các màn hình
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';

// Tạo Stack Navigator
const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        
        {/* Màn hình chính sau khi đăng nhập */}
        <Stack.Screen name="Home" component={HomeScreen} />

        {/* Màn hình đăng nhập */}
        <Stack.Screen name="Login" component={LoginScreen} />

        {/* Màn hình đăng ký */}
        <Stack.Screen name="Register" component={RegisterScreen} />

        {/* Màn hình quên mật khẩu */}
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

        {/* Màn hình đổi mật khẩu */}
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
