import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Key for storing notification identifiers
const NOTIFICATION_IDS_KEY = "medication_notification_ids";

// Save notification identifiers to AsyncStorage
async function saveNotificationIds(medicationId, identifiers) {
  try {
    // Get existing notification mappings
    const existingIdsJson = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    const existingIds = existingIdsJson ? JSON.parse(existingIdsJson) : {};
    
    // Update with new identifiers
    existingIds[medicationId] = identifiers;
    
    // Save back to storage
    await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(existingIds));
    console.log(`Saved ${identifiers.length} notification IDs for medication ${medicationId}`);
  } catch (error) {
    console.error("Error saving notification IDs:", error);
  }
}

// Get notification identifiers for a specific medication
async function getNotificationIds(medicationId) {
  try {
    const existingIdsJson = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    if (!existingIdsJson) return [];
    
    const existingIds = JSON.parse(existingIdsJson);
    return existingIds[medicationId] || [];
  } catch (error) {
    console.error("Error retrieving notification IDs:", error);
    return [];
  }
}

// Clear all stored notification IDs
async function clearAllNotificationIds() {
  try {
    await AsyncStorage.removeItem(NOTIFICATION_IDS_KEY);
    console.log("Cleared all stored notification IDs");
  } catch (error) {
    console.error("Error clearing notification IDs:", error);
  }
}

export async function scheduleMedicationReminder(medication) {
    if (!medication.reminderEnabled) return;
    console.log("Starting to schedule reminders for:", medication.name);
    
    try {
      // Cancel any existing reminders for this medication first
      await cancelMedicationReminders(medication.id);
      
      const identifiers = [];
      
      for (const time of medication.times) {
        console.log(`Processing time: ${time}`);
        const [hours, minutes] = time.split(":").map(Number);
        console.log(`Parsed hours: ${hours}, minutes: ${minutes}`);
        
        // More reliable trigger format
        const trigger = {
          hour: hours,
          minute: minutes,
          repeats: true,
        };
        console.log("Setting up notification with trigger:", trigger);
        
        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Medication Reminder",
            body: `Time to take ${medication.name} (${medication.dosage})`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            data: { medicationId: medication.id },
          },
          trigger,
        });
        
        console.log(`Notification scheduled with ID: ${identifier}`);
        identifiers.push(identifier);
      }
      
      // Save the identifiers for this medication
      await saveNotificationIds(medication.id, identifiers);
      
      return identifiers;
    } catch (error) {
      console.error("Error scheduling medication reminder:", error);
      return undefined;
    }
}

export async function cancelMedicationReminders(medicationId) {
  try {
    // First get stored identifiers
    const storedIds = await getNotificationIds(medicationId);
    
    // Cancel those specific notifications
    if (storedIds && storedIds.length > 0) {
      for (const id of storedIds) {
        await Notifications.cancelScheduledNotificationAsync(id);
        console.log(`Canceled notification with ID: ${id}`);
      }
    }
    
    // As a backup, also check scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduledNotifications) {
      const data = notification.content.data;
      
      if (data && data.medicationId === medicationId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log(`Canceled additional notification with ID: ${notification.identifier}`);
      }
    }
    
    // Clear the stored IDs for this medication
    const existingIdsJson = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    if (existingIdsJson) {
      const existingIds = JSON.parse(existingIdsJson);
      delete existingIds[medicationId];
      await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(existingIds));
    }
  } catch (error) {
    console.error("Error canceling medication reminders:", error);
  }
}

export async function resetAllMedicationReminders(medications) {
  try {
    console.log("Resetting all medication reminders...");
    
    // Cancel all existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Clear all stored notification IDs
    await clearAllNotificationIds();
    
    console.log(`Scheduling reminders for ${medications.length} medications`);
    
    // Reschedule reminders for all medications with enabled reminders
    for (const medication of medications) {
      if (medication.reminderEnabled) {
        await scheduleMedicationReminder(medication);
      }
    }
    
    console.log("All medication reminders have been reset");
  } catch (error) {
    console.error("Error resetting medication reminders:", error);
  }
}

export async function registerForPushnotificationsAsync() {
  let token = null;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  // Fix: logic error - should check if finalStatus IS granted, not if it just exists
  if (finalStatus !== 'granted') {
    return null;
  }
  
  try {
    const response = await Notifications.getExpoPushTokenAsync();
    token = response.data;
    
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1a8e2d",
      });
    }
    
    return token;
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
  }
}


export async function updateMedicationReminders(medication) {
  try {
    // Cancel existing reminders
    await cancelMedicationReminders(medication.id);
    
    // Schedule new reminders if enabled
    if (medication.reminderEnabled) {
      await scheduleMedicationReminder(medication);
    }
  } catch (error) {
    console.error("Error updating medication reminders:", error);
  }
}

