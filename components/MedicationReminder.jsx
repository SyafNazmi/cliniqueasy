// components/MedicationReminders.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Switch, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAllNotificationMappings, getScheduledNotifications, updateMedicationReminders, resetAllMedicationReminders } from '../service/Notification';
import { getMedications } from '../service/Storage';
import PageHeader from './PageHeader';
import { router } from 'expo-router';

export default function MedicationReminders({ navigation }) {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificationMappings, setNotificationMappings] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMedicationsAndNotifications();
  }, []);

  const loadMedicationsAndNotifications = async () => {
    setLoading(true);
    try {
      const medicationList = await getMedications();
      const mappings = await getAllNotificationMappings();
      
      setMedications(medicationList);
      setNotificationMappings(mappings);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load medication reminders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadMedicationsAndNotifications();
  };

  const toggleReminder = async (medication) => {
    try {
      // Toggle the reminder setting
      const updatedMedication = {
        ...medication,
        reminderEnabled: !medication.reminderEnabled
      };

      // Update the medication in the list
      const updatedMedications = medications.map(med => 
        med.id === medication.id ? updatedMedication : med
      );
      
      setMedications(updatedMedications);
      
      // Update the reminder in the notifications system
      await updateMedicationReminders(updatedMedication);
      
      // Reload notification mappings to reflect changes
      const mappings = await getAllNotificationMappings();
      setNotificationMappings(mappings);
      
    } catch (error) {
      console.error("Error toggling reminder:", error);
      Alert.alert("Error", "Failed to update reminder settings");
      // Reload to ensure UI is in sync with actual state
      loadMedicationsAndNotifications();
    }
  };

  const resetAllReminders = async () => {
    Alert.alert(
      "Reset All Reminders",
      "This will reset and reschedule all medication reminders. Continue?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Reset",
          onPress: async () => {
            try {
              setLoading(true);
              await resetAllMedicationReminders(medications);
              await loadMedicationsAndNotifications();
              Alert.alert("Success", "All medication reminders have been reset");
            } catch (error) {
              console.error("Error resetting reminders:", error);
              Alert.alert("Error", "Failed to reset reminders");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderMedicationItem = ({ item }) => {
    const notificationIds = notificationMappings[item.id] || [];
    const hasReminders = notificationIds.length > 0;
    
    return (
      <View style={styles.medicationCard}>
        <View style={styles.medicationHeader}>
          <View style={[styles.medicationTypeIndicator, { backgroundColor: item.color || "#1a8e2d" }]} />
          <Text style={styles.medicationName}>{item.name}</Text>
          <Text style={styles.medicationDosage}>{item.dosage}</Text>
        </View>
        
        <View style={styles.reminderSection}>
          <View style={styles.reminderInfo}>
            <Ionicons name="time-outline" size={20} color="#666" style={styles.icon} />
            <Text style={styles.reminderText}>
              {item.times.join(", ")}
            </Text>
          </View>
          
          <View style={styles.switchContainer}>
            <Switch
              value={item.reminderEnabled}
              trackColor={{ false: '#ddd', true: '#1a8e2d' }}
              thumbColor={'white'}
              onValueChange={() => toggleReminder(item)}
            />
          </View>
        </View>

        {item.reminderEnabled && hasReminders && (
          <View style={styles.activeRemindersContainer}>
            <Text style={styles.activeRemindersText}>
              {notificationIds.length} active reminder{notificationIds.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={["#1a8e2d", "#146922"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />
      <View style={styles.content}>
        <View style={styles.header}>
        <PageHeader onPress={() => router.back()}/>
          <Text style={styles.headerTitle}>Medication Reminders</Text>
        </View>

        <FlatList
          data={medications}
          renderItem={renderMedicationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={48} color="#999" />
              <Text style={styles.emptyText}>No medications found</Text>
              <Text style={styles.emptySubText}>Add medications to manage reminders</Text>
            </View>
          )}
        />

        <TouchableOpacity 
          style={styles.resetButton}
          onPress={resetAllReminders}
        >
          <Text style={styles.resetButtonText}>Reset All Reminders</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8'
  },
  headerGradient: {
    height: Platform.OS === 'ios' ? 120 : 100,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white'
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100
  },
  medicationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  medicationTypeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10
  },
  medicationName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1
  },
  medicationDosage: {
    fontSize: 16,
    color: '#666'
  },
  reminderSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  icon: {
    marginRight: 8
  },
  reminderText: {
    fontSize: 16,
    color: '#444'
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  activeRemindersContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  activeRemindersText: {
    color: '#1a8e2d',
    fontSize: 14
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 12
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 4
  },
  resetButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#1a8e2d',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center'
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
});