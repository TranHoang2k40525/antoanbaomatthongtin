import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api'; // 🔹 API backend của bạn
import { useUser } from '../UseContext';

// Custom Picker Component
const CustomPicker = ({ value, onValueChange, items, placeholder }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (selectedValue) => {
    onValueChange(selectedValue);
    setModalVisible(false);
  };

  const selectedItem = items.find(item => item.value === value);

  return (
    <View>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.pickerText, !value && styles.placeholderText]}>
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={items}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                  {value === item.value && (
                    <Ionicons name="checkmark" size={20} color="#E57373" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const RegistrationScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    dob: '',
    gender: '',
    address: '',
    phoneNumber: '',
    school: '',
    class: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const { register } = useUser();

  // Các lựa chọn cho giới tính
  const genderOptions = [
    { value: 'male', label: 'Nam' },
    { value: 'female', label: 'Nữ' },
    { value: 'other', label: 'Khác' },
  ];

  // Format ngày sinh (DD/MM/YYYY)
  const formatDateInput = (text) => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) cleaned = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
    if (cleaned.length >= 5) cleaned = cleaned.substring(0, 5) + '/' + cleaned.substring(5, 9);
    return cleaned;
  };

  const handleInputChange = (field, value) => {
    if (field === 'dob') {
      value = formatDateInput(value);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 📥 Hàm xử lý đăng ký
  const handleRegister = async () => {
    try {
      let { fullName, username, email, dob, address, gender, password, school, class: className, phoneNumber } = formData;

      // Trim input
      fullName = fullName.trim();
      username = username.trim();
      email = email.trim().toLowerCase();
      address = address.trim();

      if (!fullName || !username || !email || !dob || !address || !gender || !password || !phoneNumber) {
        Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ các trường bắt buộc.');
        return;
      }

      // Validate email phải có đuôi @gmail.com
      const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
      if (!emailRegex.test(email)) {
        Alert.alert('Email không hợp lệ', 'Vui lòng nhập email hợp lệ có đuôi @gmail.com');
        return;
      }

      // Validate ngày sinh (dd/mm/yyyy)
      const dobRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
      if (!dobRegex.test(dob)) {
        Alert.alert('Ngày sinh không hợp lệ', 'Vui lòng nhập ngày sinh theo định dạng DD/MM/YYYY');
        return;
      }

      // Validate số điện thoại: 10 số, bắt đầu bằng 0
      const phoneRegex = /^0\d{9}$/;
      if (!phoneRegex.test(phoneNumber)) {
        Alert.alert('Số điện thoại không hợp lệ', 'Số điện thoại phải có 10 số và bắt đầu bằng số 0.');
        return;
      }

      // Chuyển thành yyyy-mm-dd
      let dobFormatted = dob;
      const parts = dob.split('/');
      if (parts.length === 3) {
        dobFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      // Map to backend fields
      const payload = {
        Username: username,
        FullName: fullName,
        DateOfBirth: dobFormatted,
        Address: address,
        School: school || null,
        Class: className || null,
        Email: email,
        PhoneNumber: phoneNumber,
        Password: password,
      };

      await register(payload);

      Alert.alert('Thành công', 'Đăng ký thành công!');
      navigation.navigate('Login');
    } catch (e) {
      Alert.alert('Lỗi đăng ký', e.response?.data?.message || e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#E57373" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đăng ký</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Họ và tên */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Họ và tên <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.fullName}
              onChangeText={(value) => handleInputChange('fullName', value)}
              placeholder="Nhập họ và tên"
              placeholderTextColor="#999"
            />
          </View>

          {/* Tên đăng nhập */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Tên đăng nhập <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.username}
              onChangeText={(value) => handleInputChange('username', value)}
              placeholder="Nhập tên đăng nhập"
              placeholderTextColor="#999"
            />
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Email <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="Nhập email"
              placeholderTextColor="#999"
              keyboardType="email-address"
            />
          </View>

          {/* Mật khẩu */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Mật khẩu <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Ngày sinh */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Ngày sinh <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.dob}
              onChangeText={(value) => handleInputChange('dob', value)}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>

          {/* Giới tính */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Giới tính <Text style={styles.required}>*</Text>
            </Text>
            <CustomPicker
              value={formData.gender}
              onValueChange={(value) => handleInputChange('gender', value)}
              items={genderOptions}
              placeholder="Chọn giới tính"
            />
          </View>

          {/* Địa chỉ */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Địa chỉ <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.address}
              onChangeText={(value) => handleInputChange('address', value)}
              placeholder="Nhập địa chỉ"
              placeholderTextColor="#999"
            />
          </View>

          {/* Số điện thoại */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Số điện thoại <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData.phoneNumber}
              onChangeText={(value) => handleInputChange('phoneNumber', value)}
              placeholder="Nhập số điện thoại"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>

          {/* Nút đăng ký */}
          <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <Text style={styles.registerButtonText}>Đăng ký</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E57373',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  placeholder: { width: 40 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, color: '#333', marginBottom: 8, fontWeight: '500' },
  required: { color: '#E57373' },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  eyeButton: { paddingHorizontal: 12, paddingVertical: 12 },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  pickerText: { fontSize: 16, color: '#333' },
  placeholderText: { color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalItemText: { fontSize: 16, color: '#333' },
  registerButton: {
    backgroundColor: '#9E9E9E',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 20,
  },
  registerButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  bottomSpace: { height: 50 },
});

export default RegistrationScreen;
