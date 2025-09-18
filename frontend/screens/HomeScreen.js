import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useUser } from '../UseContext';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user, loading, logout, updateProfile, updateAvatar } = useUser();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [avatarUploading, setAvatarUploading] = useState(false);

  React.useEffect(() => {
    if (user) {
      setForm({
        FullName: user.FullName || '',
        DateOfBirth: user.DateOfBirth || '',
        Address: user.Address || '',
        School: user.School || '',
        Class: user.Class || '',
        Email: user.Email || '',
        PhoneNumber: user.PhoneNumber || '',
      });
    }
  }, [user]);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#E57373" /></View>;

  if (!user) {
    // Hiển thị nút đăng nhập/đăng ký nếu chưa đăng nhập
    return (
      <View style={styles.container}>
        <Image source={require('../assets/image3.png')} style={styles.avatar} />
        <Text style={{ fontSize: 18, marginBottom: 20 }}>Chào mừng bạn đến với ứng dụng!</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('Login')}><Text style={styles.editText}>Đăng nhập</Text></TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={() => navigation.navigate('Register')}><Text style={styles.saveText}>Đăng ký</Text></TouchableOpacity>
      </View>
    );
  }

  const handleSave = async () => {
    try {
      await updateProfile(form);
      setEditMode(false);
      Alert.alert('Thành công', 'Cập nhật thông tin thành công!');
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || e.message);
    }
  };

  const pickAvatar = async () => {
    // Request permission if needed
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Lỗi', 'Bạn cần cấp quyền truy cập thư viện ảnh để đổi avatar.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [ImagePicker.MediaType.IMAGE], // Use new API
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUploading(true);
      try {
        // expo-image-picker v14+ returns {assets: [{uri, ...}]}
        await updateAvatar(result.assets[0]);
        Alert.alert('Thành công', 'Cập nhật ảnh đại diện thành công!');
      } catch (e) {
        Alert.alert('Lỗi', e.response?.data?.message || e.message || 'Lỗi mạng khi tải ảnh.');
      }
      setAvatarUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarSection}>
        <Image
          source={user.avatarUrl ? { uri: `http://192.168.1.105:4000${user.avatarUrl}` } : require('../assets/image3.png')}
          style={styles.avatar}
        />
        <TouchableOpacity style={styles.avatarBtn} onPress={pickAvatar} disabled={avatarUploading}>
          <Text style={{ color: '#E57373' }}>{avatarUploading ? 'Đang tải...' : 'Đổi ảnh'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.infoSection}>
        {['FullName', 'DateOfBirth', 'Address', 'School', 'Class', 'Email', 'PhoneNumber'].map((field) => (
          <View key={field} style={styles.infoRow}>
            <Text style={styles.label}>{field}:</Text>
            {editMode && field !== 'Email' && field !== 'PhoneNumber' ? (
              <TextInput
                style={styles.input}
                value={form[field]}
                onChangeText={v => setForm(f => ({ ...f, [field]: v }))}
              />
            ) : (
              <Text style={styles.value}>{user[field]}</Text>
            )}
          </View>
        ))}
      </View>
      <View style={styles.buttonRow}>
        {editMode ? (
          <>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveText}>Lưu</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditMode(false)}><Text style={styles.cancelText}>Hủy</Text></TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(true)}><Text style={styles.editText}>Sửa thông tin</Text></TouchableOpacity>
        )}
        <TouchableOpacity style={styles.logoutBtn} onPress={async () => { await logout(); }}><Text style={styles.logoutText}>Đăng xuất</Text></TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={() => navigation.navigate('ChangePassword')}><Text style={styles.saveText}>Đổi mật khẩu</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#E57373', marginBottom: 10 },
  avatarBtn: { padding: 8, borderWidth: 1, borderColor: '#E57373', borderRadius: 20, marginBottom: 10 },
  infoSection: { marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  label: { width: 110, color: '#333', fontWeight: 'bold' },
  value: { color: '#555', flex: 1 },
  input: { flex: 1, borderBottomWidth: 1, borderColor: '#E57373', paddingVertical: 4, color: '#333' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  editBtn: { backgroundColor: '#E57373', padding: 12, borderRadius: 20 },
  editText: { color: 'white', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#388E3C', padding: 12, borderRadius: 20, marginRight: 10 },
  saveText: { color: 'white', fontWeight: 'bold' },
  cancelBtn: { backgroundColor: '#BDBDBD', padding: 12, borderRadius: 20 },
  cancelText: { color: 'white', fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E57373', padding: 12, borderRadius: 20, marginLeft: 10 },
  logoutText: { color: '#E57373', fontWeight: 'bold' },
});
