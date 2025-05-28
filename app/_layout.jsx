// Fix 1: Update app/_layout.jsx
// Modified AuthProvider component with improved authentication handling

import React, { useEffect, useState, useCallback } from "react";
import { Stack, useSegments, useRouter, SplashScreen } from "expo-router";
import Toast from 'react-native-toast-message';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { getLocalStorage, removeLocalStorage } from '../service/Storage';
import RoleManager from '../configs/RoleManager';
import { account } from '../configs/AppwriteConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore errors */
});

// Create a separate context for authentication
const AuthContext = React.createContext(null);

// Authentication provider that will handle navigation after checks
function AuthProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isDoctor, setIsDoctor] = useState(false);
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  const segments = useSegments();
  const router = useRouter();

  // Check auth status - changed to useCallback to avoid recreation
  const checkAuth = useCallback(async () => {
    try {
      // If we've just logged out, don't check auth again
      if (isLoggedOut) {
        console.log("Recently logged out - skipping auth check");
        setIsLoading(false);
        return;
      }
      
      console.log("Checking authentication state...");
      setIsLoading(true);
      
      // First check global role flag (fastest) for immediate response after reload
      const globalRoleFlag = await RoleManager.getGlobalRoleFlag();
      console.log("Global role flag check:", globalRoleFlag === null ? "Not set" : 
                 globalRoleFlag ? "Doctor" : "Patient");
      
      // Try to get current session - this confirms if the user is logged in
      let userAuthenticated = false;
      let userData = null;
      
      try {
        const session = await account.getSession('current');
        userAuthenticated = !!session;
        console.log("Authentication check:", userAuthenticated ? "User is authenticated" : "No active session");
        
        if (userAuthenticated) {
          // If authenticated, get user data
          userData = await getLocalStorage('userDetail');
          console.log("User data retrieved:", userData ? "Found" : "Not found");
          
          if (!userData || !userData.uid) {
            console.log("No user data found despite authentication");
            setUser(null);
            setIsDoctor(false);
          } else {
            // Set the user for UI response
            setUser(userData);
            
            // If we have a global role flag, use it right away
            if (globalRoleFlag !== null) {
              console.log(`Using global role flag immediately: ${globalRoleFlag ? "Doctor" : "Patient"}`);
              setIsDoctor(globalRoleFlag);
            } else {
              // Otherwise check user data for role info
              setIsDoctor(userData.isDoctor || false);
            }
            
            // Perform an additional role check in the background
            try {
              const doctorCheck = await RoleManager.isDoctor(userData.uid);
              console.log(`Full user role check completed - isDoctor: ${doctorCheck}`);
              
              // Only update if different to avoid unnecessary rerenders
              if (doctorCheck !== isDoctor) {
                setIsDoctor(doctorCheck);
              }
            } catch (err) {
              console.log("Role check error:", err);
              // Keep using the data we have
            }
          }
        } else {
          setUser(null);
          setIsDoctor(false);
        }
      } catch (e) {
        console.log("Session check error:", e.message);
        setUser(null);
        setIsDoctor(false);
      }
    } catch (error) {
      console.error("Error during auth check:", error);
      setUser(null);
      setIsDoctor(false);
    } finally {
      setIsLoading(false);
      setAuthInitialized(true);
      // Hide the splash screen
      try {
        SplashScreen.hideAsync();
      } catch (e) {
        console.log("Error hiding splash screen:", e);
      }
    }
  }, [isLoggedOut, isDoctor]);

  // Logout function with improved cleanup
  const logoutUser = useCallback(async () => {
    try {
      console.log("Starting logout process from auth context");
      setIsLoading(true);
      
      // 1. Set logged out flag to prevent auth checking loop
      setIsLoggedOut(true);
      
      // 2. Clear user state first
      setUser(null);
      setIsDoctor(false);
      
      // 3. Get userId before clearing storage
      let userId = null;
      try {
        const userData = await getLocalStorage('userDetail');
        if (userData && userData.uid) {
          userId = userData.uid;
        }
      } catch (e) {
        console.log("Error getting userId for logout:", e);
      }
      
      // 4. Clear role caches
      if (userId) {
        await RoleManager.clearRoleCache(userId);
      }
      
      // 5. Clear all relevant local storage
      await AsyncStorage.removeItem('userDetail');
      await AsyncStorage.removeItem('current_user_is_doctor');
      
      // 6. Delete Appwrite session
      try {
        await account.deleteSessions();
      } catch (e) {
        console.log("Error deleting all sessions:", e);
        try {
          await account.deleteSession('current');
        } catch (err) {
          console.log("Error deleting current session:", err);
        }
      }
      
      console.log("Logout complete - redirecting to login");
      
      // The state update + router navigation combo sometimes causes issues
      // Use a small timeout to ensure state has been updated first
      setTimeout(() => {
        router.replace('/login/signIn');
        setIsLoading(false);
      }, 50);
      
    } catch (error) {
      console.error("Error during logout:", error);
      // Ensure we still redirect to login even if there was an error
      router.replace('/login/signIn');
      setIsLoading(false);
    }
  }, [router]);

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, []);

  // Handle redirects based on auth state
  useEffect(() => {
    if (isLoading || !authInitialized) return; // Don't redirect while still checking
    if (isLoggedOut) return; // Don't redirect during logout process
    
    const inAuthGroup = segments[0] === 'login';
    const inDoctorGroup = segments[0] === 'doctor';
    const inPatientGroup = segments[0] === '(tabs)';
    
    console.log("Navigation check:", 
      `User authenticated: ${!!user}`,
      `Is doctor: ${isDoctor}`, 
      `Current segment: ${segments[0]}`
    );
    
    if (!user && !inAuthGroup) {
      // If no user and not on login screen, redirect to login
      console.log("No user detected - redirecting to login");
      router.replace('/login/signIn');
    } else if (user) {
      if (inAuthGroup) {
        // If user is authenticated but on login screen, redirect to appropriate dashboard
        if (isDoctor) {
          console.log("Doctor detected on login screen - redirecting to doctor dashboard");
          router.replace('/doctor');
        } else {
          console.log("Patient detected on login screen - redirecting to patient dashboard");
          router.replace('/(tabs)');
        }
      } else if (isDoctor && inPatientGroup) {
        // If doctor is on patient screens, redirect to doctor screens
        console.log("Doctor on patient screens - redirecting to doctor dashboard");
        router.replace('/doctor');
      } else if (!isDoctor && inDoctorGroup) {
        // If patient is on doctor screens, redirect to patient screens
        console.log("Patient on doctor screens - redirecting to patient dashboard");
        router.replace('/(tabs)');
      }
    }
  }, [user, segments, isLoading, isDoctor, isLoggedOut, authInitialized, router]);
  
  // Value to expose through context
  const value = {
    user,
    isDoctor,
    isLoading,
    setUser,
    setIsDoctor,
    logout: logoutUser,     // Expose logout function
    refresh: checkAuth      // Expose refresh function
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0AD476" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to access the auth context
export function useAuth() {
  return React.useContext(AuthContext);
}

// Root layout with Auth Provider
export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="doctor" />
        <Stack.Screen name="appointment" />
        <Stack.Screen name="medications" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="hospitals-list" />
        <Stack.Screen name="testing" />
      </Stack>
      <Toast />
    </AuthProvider>
  );
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