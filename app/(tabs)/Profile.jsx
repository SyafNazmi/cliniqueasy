import { View, Text, Button } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router'
import { signOut } from 'firebase/auth'
import { auth } from '@/configs/FirebaseConfig'
import { RemoveLocalStorage } from '@/service/Storage'
import Toast from 'react-native-toast-message'

export default function HomeScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Sign out from Firebase
      await signOut(auth);
      
      // Clear local storage
      await RemoveLocalStorage();
      
      // Show success message
      Toast.show({
        type: 'success',
        text1: 'Logged Out',
        text2: 'You have been successfully logged out',
      });
      
      // Redirect to login screen
      router.replace('/login');
    } catch (error) {
      console.error("Logout error:", error);
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to log out. Please try again.',
      });
    }
  }

  return (
    <View style={{ padding: 25, marginTop: 50 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Profile</Text>
      <Button title='Logout' onPress={handleLogout} color="#0AD476"/>
    </View>
  )
}