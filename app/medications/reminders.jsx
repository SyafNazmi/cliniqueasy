// app/Medications/reminders.jsx
import React, { useEffect } from 'react';
import { SafeAreaView, StyleSheet, Platform, StatusBar } from 'react-native';
import { router } from 'expo-router';
import MedicationReminders from '../../components/MedicationReminder';
import { setupNotificationHandler, registerForPushnotificationsAsync } from '../../service/Notification';


export default function RemindersScreen() {
  useEffect(() => {
    // Set up notification handler
    setupNotificationHandler();
    
    // Request notification permissions
    const requestPermissions = async () => {
      await registerForPushnotificationsAsync();
    };
    
    requestPermissions();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <MedicationReminders navigation={router} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  }
});