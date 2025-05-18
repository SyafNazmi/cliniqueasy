import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { getLocalStorage } from '../service/Storage';

/**
 * A component that restricts access based on user role
 * @param {Object} props
 * @param {string} props.requiredRole - The role required to access the content
 * @param {React.ReactNode} props.children - The content to display if the user has the required role
 * @param {string} props.redirectPath - Where to redirect if role check fails
 * @param {string} props.loadingMessage - Message to show during role check
 */
export default function RoleGuard({ 
  requiredRole, 
  children, 
  redirectPath = '(tabs)',
  loadingMessage = 'Checking access...'
}) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        // Get user data from local storage
        const userData = await getLocalStorage('userDetail');
        
        if (!userData) {
          // User is not logged in
          router.replace('/login/signIn');
          return;
        }
        
        // Check if user has the required role
        const hasRole = userData.role === requiredRole;
        
        if (!hasRole) {
          // User doesn't have the required role, redirect
          router.replace(redirectPath);
          return;
        }
        
        // User has the required role, show the protected content
        setIsAuthorized(true);
      } catch (error) {
        console.error('Role check error:', error);
        // On error, redirect to safe route
        router.replace(redirectPath);
      } finally {
        setLoading(false);
      }
    };
    
    checkUserRole();
  }, [requiredRole, redirectPath]);
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0AD476" />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </View>
    );
  }
  
  // Only render children if user is authorized
  return isAuthorized ? children : null;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
});