// app/medications/reminders.jsx - Updated to work with Appwrite
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  Switch,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { integratedPatientMedicationService } from '../../service/PatientMedicationService'; // 🚨 NEW: Use Appwrite service
import { scheduleMedicationReminder, cancelMedicationReminders } from '../../service/Notification';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const FREQUENCIES = [
  { id: "1", label: "Once Daily", times: ["09:00"] },
  { id: "2", label: "Twice Daily", times: ["09:00", "21:00"] },
  { id: "3", label: "Three times Daily", times: ["09:00", "15:00", "21:00"] },
  { id: "4", label: "Four times Daily", times: ["09:00", "13:00", "17:00", "21:00"] },
  { id: "5", label: "Every Morning", times: ["08:00"] },
  { id: "6", label: "Every Evening", times: ["20:00"] },
  { id: "7", label: "Every 4 Hours", times: ["08:00", "12:00", "16:00", "20:00", "00:00", "04:00"] },
  { id: "8", label: "Every 6 Hours", times: ["06:00", "12:00", "18:00", "00:00"] },
  { id: "9", label: "Every 8 Hours", times: ["08:00", "16:00", "00:00"] },
  { id: "10", label: "Every 12 Hours", times: ["08:00", "20:00"] },
  { id: "11", label: "Weekly", times: ["09:00"] },
  { id: "12", label: "As Needed", times: [] },
];

// 🚨 FIXED: Helper function to cancel medication reminders
const cancelMedicationReminderHelper = async (medicationId) => {
  try {
    console.log('🔔 Cancelling reminders for medication:', medicationId);
    
    // Use the existing notification service (note: plural function name)
    await cancelMedicationReminders(medicationId);
    
    console.log('✅ Successfully cancelled reminders for:', medicationId);
    return true;
  } catch (error) {
    console.error('❌ Error cancelling medication reminder:', error);
    return false;
  }
};

export default function MedicationReminders({ navigation }) {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTimeEditor, setShowTimeEditor] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [editingTimes, setEditingTimes] = useState([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  useEffect(() => {
  const initializeData = async () => {
    await loadPatients();
    loadMedications();
  };
  
  initializeData();
}, [selectedPatient]);

  const loadPatients = useCallback(async () => {
  try {
    console.log('👥 Loading patients for reminders...');
    const patientList = await integratedPatientMedicationService.getFormattedPatientList();
    
    console.log('📋 Available patients:', patientList);
    setPatients(patientList || []);
    
    // Auto-select owner if no patient selected
    if (!selectedPatient && patientList.length > 0) {
      const owner = patientList.find(p => p.isOwner) || patientList[0];
      setSelectedPatient(owner);
    }
  } catch (error) {
    console.error('❌ Error loading patients:', error);
    setPatients([]);
  }
}, [selectedPatient]);

  // 🚨 UPDATED: Load medications from Appwrite
  const loadMedications = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading medications for patient:', selectedPatient?.name);
      
      // Use the integrated service to get medications from Appwrite
      const medicationList = await integratedPatientMedicationService.getPatientMedications({
        patientId: selectedPatient?.id || 'all'
      });
      
      // Filter medications by selected patient
      const filteredMeds = selectedPatient 
        ? medicationList.filter(med => 
            med.patientId === selectedPatient.id || 
            (selectedPatient.isOwner && !med.patientId)
          )
        : medicationList;
      
      console.log(`📋 Loaded ${filteredMeds.length} medications for ${selectedPatient?.name}:`, filteredMeds);
      setMedications(filteredMeds);
    } catch (error) {
      console.error('❌ Error loading medications:', error);
      Alert.alert('Error', 'Failed to load medications. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const PatientDropdown = () => (
    <View style={styles.patientSelectorContainer}>
      <TouchableOpacity
        style={styles.patientDropdownButton}
        onPress={() => setShowPatientDropdown(!showPatientDropdown)}
      >
        <View style={styles.patientDropdownContent}>
          <View style={[
            styles.patientAvatar,
            selectedPatient?.isOwner ? styles.ownerAvatar : styles.familyAvatar
          ]}>
            <Ionicons 
              name={selectedPatient?.isOwner ? "person" : "people"} 
              size={16} 
              color="white" 
            />
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>
              {selectedPatient?.name || 'Select Patient'}
            </Text>
            <Text style={styles.patientType}>
              {selectedPatient?.isOwner 
                ? 'Account Owner' 
                : selectedPatient?.relationship || 'Family Member'
              }
            </Text>
          </View>
        </View>
        <Ionicons 
          name={showPatientDropdown ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>

      {showPatientDropdown && (
        <View style={styles.patientDropdownMenu}>
          {patients.map((patient) => (
            <TouchableOpacity
              key={patient.id}
              style={[
                styles.patientDropdownItem,
                selectedPatient?.id === patient.id && styles.selectedPatientItem
              ]}
              onPress={() => {
                setSelectedPatient(patient);
                setShowPatientDropdown(false);
              }}
            >
              <View style={[
                styles.patientAvatar,
                patient.isOwner ? styles.ownerAvatar : styles.familyAvatar
              ]}>
                <Ionicons 
                  name={patient.isOwner ? "person" : "people"} 
                  size={16} 
                  color="white" 
                />
              </View>
              <View style={styles.patientInfo}>
                <Text style={[
                  styles.patientName,
                  selectedPatient?.id === patient.id && styles.selectedPatientText
                ]}>
                  {patient.name}
                </Text>
                <Text style={[
                  styles.patientType,
                  selectedPatient?.id === patient.id && styles.selectedPatientText
                ]}>
                  {patient.isOwner 
                    ? 'Account Owner' 
                    : patient.relationship || 'Family Member'
                  }
                </Text>
              </View>
              {selectedPatient?.id === patient.id && (
                <Ionicons name="checkmark-circle" size={20} color="#1a8e2d" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  // Open time editor for any medication
  const openTimeEditor = (medication) => {
    if (!medication.times || medication.times.length === 0) {
      Alert.alert(
        'No Times Set',
        'This medication has no reminder times set. Would you like to add some?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Times',
            onPress: () => {
              const frequency = FREQUENCIES.find(f => f.label === medication.frequencies);
              const defaultTimes = frequency ? frequency.times : ['09:00'];
              setSelectedMedication(medication);
              setEditingTimes([...defaultTimes]);
              setShowTimeEditor(true);
            }
          }
        ]
      );
      return;
    }

    setSelectedMedication(medication);
    setEditingTimes([...medication.times]);
    setShowTimeEditor(true);
  };

  // Add new time slot
  const addTimeSlot = () => {
    const newTime = '09:00';
    setEditingTimes([...editingTimes, newTime]);
  };

  // Remove time slot
  const removeTimeSlot = (index) => {
    if (editingTimes.length <= 1) {
      Alert.alert('Warning', 'You must have at least one reminder time');
      return;
    }
    
    Alert.alert(
      'Remove Time',
      'Are you sure you want to remove this reminder time?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newTimes = editingTimes.filter((_, i) => i !== index);
            setEditingTimes(newTimes);
          }
        }
      ]
    );
  };

  // Update specific time
  const updateTime = (index, newTime) => {
    const updatedTimes = editingTimes.map((time, i) => 
      i === index ? newTime : time
    );
    setEditingTimes(updatedTimes);
  };

  // Reset to default times
  const resetToDefault = () => {
    const frequency = FREQUENCIES.find(f => f.label === selectedMedication.frequencies);
    if (frequency) {
      Alert.alert(
        'Reset to Default',
        `Reset times to default for "${frequency.label}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset',
            onPress: () => {
              setEditingTimes([...frequency.times]);
            }
          }
        ]
      );
    }
  };

  // 🚨 UPDATED: Save time changes to Appwrite with proper error handling
  const saveTimeChanges = async () => {
    try {
      setSaving(true);

      if (editingTimes.length === 0) {
        Alert.alert('Error', 'Please add at least one reminder time');
        return;
      }

      console.log('💾 Saving time changes for medication:', selectedMedication.id);
      console.log('🕐 New times:', editingTimes);

      // Update medication in Appwrite with new times
      const updatedMedication = {
        ...selectedMedication,
        times: editingTimes
      };

      // 🚨 FIXED: Use Appwrite service to update medication with correct data
      const result = await integratedPatientMedicationService.updatePatientMedication(
        selectedMedication.id, 
        { times: editingTimes }
      );

      console.log('✅ Updated medication in Appwrite:', result);

      // Handle reminders properly
      if (selectedMedication.reminderEnabled) {
        try {
          // Cancel existing reminders first
          await cancelMedicationReminderHelper(selectedMedication.id);
          
          // Schedule new reminders with updated times
          await scheduleMedicationReminder(updatedMedication);
          
          console.log('🔔 Updated reminders successfully');
        } catch (reminderError) {
          console.error('⚠️ Error updating reminders:', reminderError);
          // Don't fail the entire operation if reminder update fails
        }
      }

      // Update local state
      setMedications(prevMeds => 
        prevMeds.map(med => 
          med.id === selectedMedication.id ? { ...med, times: editingTimes } : med
        )
      );

      setShowTimeEditor(false);
      
      const isPrescription = selectedMedication.isPrescription;
      Alert.alert(
        'Success! ⏰',
        `Medication times updated successfully!\n\n${isPrescription ? '🔒 Note: This is a prescription medication. Only times can be customized.' : ''}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('❌ Error saving time changes:', error);
      
      let errorMessage = 'Failed to save time changes. Please try again.';
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
        errorMessage = 'Permission denied. Please log in again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // 🚨 UPDATED: Toggle reminder on/off with Appwrite update
  const toggleReminder = async (medication) => {
    try {
      const newReminderState = !medication.reminderEnabled;
      
      console.log(`🔔 ${newReminderState ? 'Enabling' : 'Disabling'} reminders for:`, medication.name);

      // Update medication in Appwrite
      await integratedPatientMedicationService.updatePatientMedication(
        medication.id,
        { reminder_enabled: newReminderState }
      );

      // Handle notifications
      if (newReminderState) {
        await scheduleMedicationReminder({ ...medication, reminderEnabled: true });
      } else {
        await cancelMedicationReminderHelper(medication.id);
      }

      // Update local state
      setMedications(prevMeds => 
        prevMeds.map(med => 
          med.id === medication.id ? { ...med, reminderEnabled: newReminderState } : med
        )
      );

      console.log('✅ Successfully toggled reminder state');

    } catch (error) {
      console.error('❌ Error toggling reminder:', error);
      Alert.alert('Error', 'Failed to toggle reminder. Please check your connection and try again.');
    }
  };

  // Render individual medication card
  const renderMedicationCard = ({ item: medication }) => (
    <View style={styles.medicationCard}>
      <View style={styles.cardHeader}>
        <View style={styles.medicationInfo}>
          <View style={styles.medicationNameRow}>
            <Text style={styles.medicationName}>{medication.name}</Text>
            {medication.isPrescription && (
              <View style={styles.prescriptionBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#1a8e2d" />
                <Text style={styles.prescriptionText}>Rx</Text>
              </View>
            )}
          </View>
          <Text style={styles.medicationDetails}>
            {medication.dosage} • {medication.frequencies}
          </Text>
          <Text style={styles.medicationIllness}>{medication.illnessType}</Text>
        </View>
        
        <Switch
          value={medication.reminderEnabled}
          onValueChange={() => toggleReminder(medication)}
          trackColor={{ false: '#ddd', true: '#1a8e2d' }}
          thumbColor="white"
        />
      </View>

      {medication.times && medication.times.length > 0 && (
        <View style={styles.timesSection}>
          <View style={styles.timesSectionHeader}>
            <Text style={styles.timesTitle}>Reminder Times</Text>
            <TouchableOpacity
              style={styles.editTimesButton}
              onPress={() => openTimeEditor(medication)}
            >
              <Ionicons name="time-outline" size={16} color="#1a8e2d" />
              <Text style={styles.editTimesText}>Edit Times</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.timesList}>
            {medication.times.map((time, index) => (
              <View key={index} style={styles.timeChip}>
                <Ionicons name="alarm-outline" size={14} color="#1a8e2d" />
                <Text style={styles.timeText}>{time}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {(!medication.times || medication.times.length === 0) && (
        <TouchableOpacity
          style={styles.addTimesButton}
          onPress={() => openTimeEditor(medication)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#1a8e2d" />
          <Text style={styles.addTimesText}>Add Reminder Times</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Time picker with proper modal overlay
  const renderTimePicker = () => {
    if (!showTimePicker) return null;

    return (
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerHeader}>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.timePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.timePickerTitle}>Select Time</Text>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.timePickerDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
            
            <DateTimePicker
              mode="time"
              display="spinner"
              value={(() => {
                const [hours, minutes] = editingTimes[currentTimeIndex].split(':').map(Number);
                const date = new Date();
                date.setHours(hours, minutes, 0, 0);
                return date;
              })()}
              onChange={(event, date) => {
                if (date) {
                  const newTime = date.toLocaleTimeString('default', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  });
                  updateTime(currentTimeIndex, newTime);
                }
              }}
              style={styles.timePicker}
            />
          </View>
        </View>
      </Modal>
    );
  };

  // Main time editor modal
  const renderTimeEditor = () => (
    <Modal
      visible={showTimeEditor}
      animationType="slide"
      presentationStyle="formSheet"
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowTimeEditor(false)}
          >
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>Edit Reminder Times</Text>
          
          <TouchableOpacity
            style={[styles.modalSaveButton, saving && styles.disabledButton]}
            onPress={saveTimeChanges}
            disabled={saving}
          >
            <Text style={styles.modalSaveText}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Medication info banner */}
        {selectedMedication && (
          <View style={styles.medicationInfoCard}>
            <View style={styles.medicationInfoHeader}>
              <Text style={styles.editingMedicationName}>
                {selectedMedication.name}
              </Text>
              {selectedMedication.isPrescription && (
                <View style={styles.prescriptionIndicator}>
                  <Ionicons name="shield-checkmark" size={16} color="#1a8e2d" />
                  <Text style={styles.prescriptionIndicatorText}>
                    Prescription - Times Only
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.editingMedicationDetails}>
              {selectedMedication.dosage} • {selectedMedication.frequencies}
            </Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.modalContent}>
          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={addTimeSlot}
            >
              <Ionicons name="add-circle" size={20} color="#1a8e2d" />
              <Text style={styles.actionButtonText}>Add Time</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={resetToDefault}
            >
              <Ionicons name="refresh" size={20} color="#666" />
              <Text style={styles.actionButtonText}>Reset Default</Text>
            </TouchableOpacity>
          </View>

          {/* Time slots */}
          <View style={styles.timeSlotsContainer}>
            <Text style={styles.timeSlotsTitle}>
              Reminder Times ({editingTimes.length})
            </Text>
            
            <ScrollView style={styles.timeSlotsList} showsVerticalScrollIndicator={false}>
              {editingTimes.map((time, index) => (
                <View key={index} style={styles.timeSlot}>
                  <TouchableOpacity
                    style={styles.timeSlotButton}
                    onPress={() => {
                      setCurrentTimeIndex(index);
                      setShowTimePicker(true);
                    }}
                  >
                    <Ionicons name="time" size={20} color="#1a8e2d" />
                    <Text style={styles.timeSlotText}>{time}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  </TouchableOpacity>
                  
                  {editingTimes.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeTimeButton}
                      onPress={() => removeTimeSlot(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#ff4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Time picker as separate modal */}
      {renderTimePicker()}
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="refresh-outline" size={48} color="#ccc" />
        <Text style={styles.loadingText}>Loading medications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medication Reminders</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <PatientDropdown />
        {medications.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="medical-outline" size={60} color="#ccc" />
                  <Text style={styles.emptyStateTitle}>No Medications</Text>
                  <Text style={styles.emptyStateText}>
                    {selectedPatient?.name || 'This patient'} has no medications with reminders
                  </Text>
                  <TouchableOpacity 
                    style={styles.addMedicationButton}
                    onPress={() => router.push('/medications/add')}
                  >
                    <Text style={styles.addMedicationButtonText}>Add Medication</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={medications}
                  renderItem={renderMedicationCard}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.medicationsList}
                />
              )}
            </View>

      {/* Time Editor Modal */}
      {renderTimeEditor()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a8e2d',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  medicationsList: {
    paddingBottom: 20,
  },
  medicationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  medicationInfo: {
    flex: 1,
    marginRight: 15,
  },
  medicationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  prescriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7e9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  prescriptionText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a8e2d',
    marginLeft: 2,
  },
  medicationDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  medicationIllness: {
    fontSize: 12,
    color: '#999',
  },
  timesSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  timesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  editTimesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editTimesText: {
    fontSize: 12,
    color: '#1a8e2d',
    fontWeight: '500',
    marginLeft: 4,
  },
  timesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a8e2d20',
  },
  timeText: {
    fontSize: 12,
    color: '#1a8e2d',
    fontWeight: '500',
    marginLeft: 4,
  },
  addTimesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9f0',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a8e2d20',
    borderStyle: 'dashed',
  },
  addTimesText: {
    fontSize: 14,
    color: '#1a8e2d',
    fontWeight: '500',
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  addMedicationButton: {
    backgroundColor: '#1a8e2d',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addMedicationButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#1a8e2d',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    color: 'white',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  modalSaveButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSaveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  medicationInfoCard: {
    backgroundColor: '#f8fdf9',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e6f7e9',
  },
  medicationInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  editingMedicationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  prescriptionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7e9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  prescriptionIndicatorText: {
    fontSize: 12,
    color: '#1a8e2d',
    fontWeight: '500',
    marginLeft: 4,
  },
  editingMedicationDetails: {
    fontSize: 14,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 25,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginLeft: 6,
  },
  timeSlotsContainer: {
    flex: 1,
  },
  timeSlotsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  timeSlotsList: {
    flex: 1,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeSlotButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timeSlotText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  removeTimeButton: {
    marginLeft: 10,
    padding: 5,
  },
  // Time picker styles
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    margin: 20,
    width: width - 40,
    maxWidth: 350,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timePickerButton: {
    padding: 5,
  },
  timePickerCancelText: {
    color: '#666',
    fontSize: 16,
  },
  timePickerDoneText: {
    color: '#1a8e2d',
    fontSize: 16,
    fontWeight: '600',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  timePicker: {
    height: 200,
  },

  patientSelectorContainer: {
  marginBottom: 20,
  zIndex: 1000,
  },
  patientDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  patientDropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  patientAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ownerAvatar: {
    backgroundColor: '#1a8e2d',
  },
  familyAvatar: {
    backgroundColor: '#2196F3',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  patientType: {
    fontSize: 12,
    color: '#666',
  },
  patientDropdownMenu: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  patientDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  selectedPatientItem: {
    backgroundColor: '#f8fdf9',
  },
  selectedPatientText: {
    color: '#1a8e2d',
},
});