import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { Medication } from '../service/Storage'

// Fix: corrected the property name from 'shouldPlayAround' to 'shouldPlaySound'
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

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

export async function scheduleMedicationReminder(medication) {
  if (!medication.reminderEnabled) return;
  
  try {
    const identifiers = []; // Fix: store all created identifiers
    
    for (const time of medication.times) {
      const [hours, minutes] = time.split(":").map(Number);
      const today = new Date();
      today.setHours(hours, minutes, 0, 0);
      
      if (today < new Date()) {
        today.setDate(today.getDate() + 1);
      }
      
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Medication Reminder",
          body: `Time to take ${medication.name} (${medication.dosage})`,
          data: { medicationId: medication.id },
        },
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });
      
      identifiers.push(identifier); // Fix: collect all identifiers
    }
    
    return identifiers; // Fix: return all identifiers, not just the last one
  } catch (error) {
    console.error("Error scheduling medication reminder:", error);
    return undefined;
  }
}

export async function cancelMedicationReminders(medicationId) {
  try {
    const scheduledNotifications = 
      await Notifications.getAllScheduledNotificationsAsync();
    
    // Fix: fixed the indentation and syntax error in the loop
    for (const notification of scheduledNotifications) {
      const data = notification.content.data;
      
      if (data && data.medicationId === medicationId) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
      }
    }
  } catch (error) {
    console.error("Error canceling medication reminders:", error);
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