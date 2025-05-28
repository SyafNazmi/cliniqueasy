// components/RoleProtected.jsx - Simple role protection component
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { getLocalStorage } from '../service/Storage';
import RoleManager from '../configs/RoleManager';

/**
 * A component that protects routes based on user role
 * 
 * @param {Object} props
 * @param {string} props.requiredRole - The role required to access this screen ('doctor' or 'patient')
 * @param {React.ReactNode} props.children - The content to show if authorized
 * @param {string} props.redirectPath - Where to redirect if unauthorized
 */
export default function RoleProtected({ 
  requiredRole,
  children,
  redirectPath = '(tabs)'
}) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  
  useEffect(() => {
    const checkRole = async () => {
      try {
        console.log(`Checking if user has role: ${requiredRole}`);
        // Get user data
        const userData = await getLocalStorage('userDetail');
        
        if (!userData || !userData.uid) {
          console.log('No user data found, redirecting to login');
          router.replace('/login/signIn');
          return;
        }
        
        // Use RoleManager to verify role
        const hasRequiredRole = requiredRole === 'doctor' ? 
          await RoleManager.isDoctor(userData.uid) :
          !(await RoleManager.isDoctor(userData.uid));
          
        console.log(`User ${userData.uid} has required role ${requiredRole}:`, hasRequiredRole);
        
        if (!hasRequiredRole) {
          console.log(`User lacks required role, redirecting to ${redirectPath}`);
          router.replace(redirectPath);
          return;
        }
        
        // User has required role
        setAuthorized(true);
      } catch (error) {
        console.error('Error checking role:', error);
        router.replace(redirectPath);
      } finally {
        setLoading(false);
      }
    };
    
    checkRole();
  }, [requiredRole, redirectPath]);
  
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0AD476" />
        <Text style={styles.loadingText}>Checking access...</Text>
      </View>
    );
  }
  
  return authorized ? children : null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  loadingText: {
    marginTop: 15,
    color: '#666',
    fontSize: 16
  }
});