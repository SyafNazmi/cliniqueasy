// app/_layout.jsx
import React, { useEffect, useRef } from 'react'
import { Tabs, useRouter } from 'expo-router'
import { FontAwesome } from '@expo/vector-icons'
import Ionicons from '@expo/vector-icons/Ionicons';
import { getLocalStorage } from "../../service/Storage";
import * as Notifications from 'expo-notifications';
import { setupNotificationHandler, registerForPushnotificationsAsync } from '../../service/Notification';

export default function TabLayout() {
  const router = useRouter();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    GetUserDetail();
    
    // Set up notification handler
    setupNotificationHandler();

    // Register for push notifications
    registerForPushnotificationsAsync();

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      
      // Extract the medicationId from the notification data
      const medicationId = response.notification.request.content.data?.medicationId;
      
      if (medicationId) {
        // Navigate to the medication details screen if you have one
        // router.push(`/medications/${medicationId}`);
        
        // Or navigate to medications tab
        router.push('/Medications');
      }
    });

    // Clean up listeners on unmount
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const GetUserDetail = async () => {
    const userInfo = await getLocalStorage('userDetail');
    if (!userInfo) {
      router.replace('/login')
    }
  }
    
  return (
    <Tabs screenOptions={{
      headerShown: false
    }}>
      <Tabs.Screen name="index" 
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="home" size={24} color="black" />
          )
        }}/>
      <Tabs.Screen name="AddNew" 
        options={{
          tabBarLabel: 'Book',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="calendar" size={24} color="black" />
          )
        }}/>
      <Tabs.Screen name="Medications" 
        options={{
          tabBarLabel: 'Medications',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medical-outline" size={24} color="black" />
          )
        }}/>
      <Tabs.Screen name="Profile" 
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="user" size={24} color="black" />
          )
        }}/>
    </Tabs>
  )
}