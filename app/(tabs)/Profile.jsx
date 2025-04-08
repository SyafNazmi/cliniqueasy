import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router'
import { account } from '@/configs/AppwriteConfig'
import { removeSpecificStorageKey } from '@/service/Storage'
import Toast from 'react-native-toast-message'

export default function Profile() {
  const router = useRouter();
  
  const handleLogout = async () => {
    try {
      console.log("Starting logout process...");
      
      // Sign out from Appwrite by deleting the current session
      try {
        await account.deleteSession('current');
        console.log("Appwrite session deleted successfully");
      } catch (sessionError) {
        console.log("Error deleting Appwrite session:", sessionError);
        // Continue with logout even if session deletion fails
      }
      
      // Only clear authentication-related data
      await removeSpecificStorageKey('userDetail');
      console.log("User details removed from storage");
      
      // Show success message
      Toast.show({
        type: 'success',
        text1: 'Logged Out',
        text2: 'You have been successfully logged out',
      });
      
      // Redirect to login screen
      console.log("Redirecting to login screen...");
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
      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={{ fontSize: 17, color: 'white', textAlign: 'center' }}>Logout</Text>
      </TouchableOpacity>
      <Toast />
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    padding: 15,
    backgroundColor: '#0AD476',
    borderRadius: 10,
    marginTop: 15
  }
});