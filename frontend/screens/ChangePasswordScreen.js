//import React, { useState } from 'react'; import { View, Text, TextInput, Button, StyleSheet } from 'react-native'; import api, { clearTokens } from '../api'; export default function ChangePasswordScreen({ navigation }){ const [oldPassword,setOldPassword]=useState(''); const [newPassword,setNewPassword]=useState(''); const doChange=async ()=>{ try{ await api.post('/change-password',{ oldPassword, newPassword }); alert('Password changed - please login again'); await clearTokens(); navigation.replace('Login'); }catch(e){ alert('Error: '+(e.response?.data?.error||e.message)); } }; return (<View style={styles.container}><Text style={styles.title}>Change Password</Text><TextInput placeholder="Old password" secureTextEntry value={oldPassword} onChangeText={setOldPassword} style={styles.input}/><TextInput placeholder="New password" secureTextEntry value={newPassword} onChangeText={setNewPassword} style={styles.input}/><Button title="Change" onPress={doChange}/></View>); } const styles=StyleSheet.create({ container:{flex:1,justifyContent:'center',padding:20}, title:{fontSize:22,marginBottom:20}, input:{borderWidth:1,padding:10,marginBottom:10,borderRadius:5} });
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from 'react-native';
import api, { clearTokens } from '../api';

export default function ChangePasswordScreen({ navigation }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const doChange = async () => {
    if (!oldPassword || !newPassword) {
      alert('Please fill in both fields');
      return;
    }
    if (newPassword.length < 6) {
      alert('New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/change-password', { oldPassword, newPassword });
      alert('Password changed - please login again');
      await clearTokens();
      navigation.replace('Login');
    } catch (e) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Change Password</Text>

      <TextInput
        placeholder="Old password"
        secureTextEntry
        value={oldPassword}
        onChangeText={setOldPassword}
        style={styles.input}
      />

      <TextInput
        placeholder="New password"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
        style={styles.input}
      />

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <Button title="Change" onPress={doChange} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 22, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
});
