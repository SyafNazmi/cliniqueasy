// app/medications/add.jsx - Updated to use shared constants

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';

import PageHeader from '../../components/PageHeader';
import QRScannerModal from '../../components/QRScannerModal';
import { integratedPatientMedicationService } from '../../service/PatientMedicationService';
import { getLocalStorage } from '../../service/Storage';
import { scheduleMedicationReminder } from '../../service/Notification';

// 🚨 UPDATED: Import shared constants
import {
  MEDICATION_TYPES,
  ILLNESS_TYPES,
  FREQUENCIES,
  DURATIONS,
  MEDICATION_COLORS,
  generateRandomColor
} from '../../constants/MedicationConstants';

const { width } = Dimensions.get('window');

// ===== UTILITY FUNCTIONS =====
const getInitialFormState = (params) => ({
  name: params?.name || '',
  type: params?.type || '',
  illnessType: params?.illnessType || '',
  dosage: params?.dosage || '',
  frequencies: params?.frequencies || '',
  duration: params?.duration || '',
  startDate: params?.startDate ? new Date(params.startDate) : new Date(),
  times: params?.times ? JSON.parse(params.times) : ['09:00'],
  notes: params?.notes || '',
  reminderEnabled: params?.reminderEnabled !== 'false',
  refillReminder: params?.refillReminder === 'true',
  currentSupply: params?.currentSupply || '',
  refillAt: params?.refillAt || '',
});

// ===== CUSTOM HOOKS =====
const useUserInitialization = () => {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const userDetail = await getLocalStorage('userDetail');
        if (userDetail) {
          setCurrentUser(userDetail);
          console.log('Current user loaded:', userDetail.uid || userDetail.userId);
        } else {
          console.warn('No user found in storage');
          Alert.alert(
            'Login Required',
            'Please log in to add medications to your account.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };

    initializeUser();
  }, []);

  return currentUser;
};

// ===== COMPONENTS =====
const LoadingScreen = () => (
  <View style={styles.container}>
    <LinearGradient 
      colors={['#1a8e2d', '#146922']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGradient}
    />
    <View style={styles.content}>
      <View style={styles.header}>
        <PageHeader onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Add Medication</Text>
      </View>
      
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a8e2d" />
        <Text style={styles.loadingText}>Saving to your account...</Text>
        <Text style={styles.loadingSubText}>
          Connecting prescription to your personal medication tracker
        </Text>
      </View>
    </View>
  </View>
);

const PrescriptionLockBanner = ({ isPrescriptionLocked }) => {
  if (!isPrescriptionLocked) return null;
  
  return (
    <View style={styles.prescriptionLockBanner}>
      <View style={styles.lockBannerContent}>
        <Ionicons name="shield-checkmark" size={20} color="#1a8e2d" />
        <Text style={styles.lockBannerText}>
          Prescription from Healthcare Provider
        </Text>
      </View>
      <View style={styles.lockBannerNote}>
        <Ionicons name="information-circle-outline" size={16} color="#666" />
        <Text style={styles.lockBannerNoteText}>
          Medication details are locked. Only times can be customized. ✅ Saved permanently to your account.
        </Text>
      </View>
    </View>
  );
};

const ScanButton = ({ isPrescriptionLocked, onPress, enableManualEntry, loading }) => {
  if (!isPrescriptionLocked) {
    return (
      <TouchableOpacity 
        style={[styles.scanPrescriptionButton, loading && styles.disabledButton]}
        onPress={onPress}
        disabled={loading}
      >
        <Ionicons name="qr-code" size={24} color="#1a8e2d" />
        <Text style={styles.scanPrescriptionText}>Scan Prescription QR</Text>
        <Text style={styles.scanPrescriptionSubText}>From your healthcare provider</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.manualEntryButton}
      onPress={enableManualEntry}
    >
      <Ionicons name="create-outline" size={24} color="#ff6b35" />
      <Text style={styles.manualEntryText}>Switch to Manual Entry</Text>
    </TouchableOpacity>
  );
};

const MedicationSelector = ({ 
  scannedMedications, 
  selectedMedicationIndex, 
  showMedicationDropdown,
  setShowMedicationDropdown,
  setSelectedMedicationIndex,
  handleSingleMedication,
  handleAddAllPrescriptionMedications,
  currentUser,
  loading 
}) => {
  if (scannedMedications.length <= 1) return null;

  return (
    <View style={styles.medicationSelectorContainer}>
      <View style={styles.medicationSelectorHeader}>
        <View style={styles.medicationSelectorInfo}>
          <Ionicons name="medical" size={20} color="#1a8e2d" />
          <Text style={styles.medicationSelectorTitle}>
            Prescription Medications ({selectedMedicationIndex + 1}/{scannedMedications.length})
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.addAllButton, loading && styles.disabledButton]}
          onPress={() => handleAddAllPrescriptionMedications(scannedMedications, currentUser?.uid || currentUser?.userId)}
          disabled={loading}
        >
          <Ionicons name="add-circle" size={16} color="#1a8e2d" />
          <Text style={styles.addAllButtonText}>
            {loading ? 'Adding...' : 'Add All'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressIndicator}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((selectedMedicationIndex + 1) / scannedMedications.length) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          Medication {selectedMedicationIndex + 1} of {scannedMedications.length}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.medicationDropdownButton}
        onPress={() => setShowMedicationDropdown(!showMedicationDropdown)}
        disabled={loading}
      >
        <View style={styles.medicationDropdownInfo}>
          <Text style={styles.medicationDropdownLabel}>Current Medication:</Text>
          <Text style={styles.medicationDropdownName}>
            {scannedMedications[selectedMedicationIndex]?.name || 'Select medication'}
          </Text>
          <Text style={styles.medicationDropdownDosage}>
            {scannedMedications[selectedMedicationIndex]?.dosage} • {scannedMedications[selectedMedicationIndex]?.frequencies}
          </Text>
        </View>
        <Ionicons 
          name={showMedicationDropdown ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>

      {showMedicationDropdown && (
        <View style={styles.medicationDropdownMenu}>
          <ScrollView style={{ maxHeight: 200 }}>
            {scannedMedications.map((medication, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.medicationDropdownItem,
                  selectedMedicationIndex === index && styles.selectedMedicationDropdownItem
                ]}
                onPress={() => {
                  setSelectedMedicationIndex(index);
                  handleSingleMedication(scannedMedications[index]);
                  setShowMedicationDropdown(false);
                }}
                disabled={loading}
              >
                <View style={styles.medicationDropdownItemContent}>
                  <Text style={[
                    styles.medicationDropdownItemName,
                    selectedMedicationIndex === index && styles.selectedMedicationDropdownItemText
                  ]}>
                    {index + 1}. {medication.name}
                  </Text>
                  <Text style={[
                    styles.medicationDropdownItemDetails,
                    selectedMedicationIndex === index && styles.selectedMedicationDropdownItemText
                  ]}>
                    {medication.dosage} • {medication.type} • {medication.frequencies}
                  </Text>
                </View>
                {selectedMedicationIndex === index && (
                  <Ionicons name="checkmark-circle" size={20} color="#1a8e2d" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const InputField = ({ 
  value, 
  onChangeText, 
  placeholder, 
  error, 
  isLocked, 
  onLockedTouch,
  style = {},
  ...props 
}) => (
  <View style={styles.inputContainer}>
    <TextInput 
      style={[
        styles.mainInput, 
        error && styles.inputError,
        isLocked && styles.lockedInput,
        style
      ]}
      placeholder={placeholder}
      placeholderTextColor="#999"
      value={value}
      editable={!isLocked}
      onChangeText={onChangeText}
      onTouchStart={isLocked ? onLockedTouch : undefined}
      {...props}
    />
    {isLocked && (
      <View style={styles.lockIcon}>
        <Ionicons name="lock-closed" size={16} color="#666" />
      </View>
    )}
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const OptionGrid = ({ options, selectedOption, onSelect, renderOption }) => (
  <View style={styles.optionGrid}>
    {options.map((option) => (
      <TouchableOpacity 
        key={option.id}
        style={[
          styles.optionCard, 
          selectedOption === option.label && styles.selectedOptionCard
        ]}
        onPress={() => onSelect(option)}
      >
        {renderOption ? renderOption(option, selectedOption === option.label) : (
          <>
            <View style={[
              styles.optionIcon, 
              selectedOption === option.label && styles.selectedOptionIcon
            ]}>
              <Ionicons 
                name={option.icon}
                size={24}
                color={selectedOption === option.label ? 'white' : '#666'}
              />
            </View>
            <Text style={[
              styles.optionLabel, 
              selectedOption === option.label && styles.selectedOptionLabel
            ]}>
              {option.label}
            </Text>
          </>
        )}
      </TouchableOpacity>
    ))}
  </View>
);

const Dropdown = ({ 
  options, 
  selectedOption, 
  onSelect, 
  placeholder, 
  showDropdown, 
  setShowDropdown,
  error 
}) => (
  <View>
    <TouchableOpacity
      style={[styles.dropdownButton, error && styles.inputError]}
      onPress={() => setShowDropdown(!showDropdown)}
    >
      <Text style={selectedOption ? styles.dropdownText : styles.dropdownPlaceholder}>
        {selectedOption || placeholder}
      </Text>
      <Ionicons name={showDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
    </TouchableOpacity>
    
    {error && <Text style={styles.errorText}>{error}</Text>}
    
    {showDropdown && (
      <View style={styles.dropdownMenu}>
        <ScrollView style={{ maxHeight: 200 }}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.dropdownItem,
                selectedOption === option.label && styles.selectedDropdownItem
              ]}
              onPress={() => {
                onSelect(option);
                setShowDropdown(false);
              }}
            >
              <Text style={[
                styles.dropdownItemText,
                selectedOption === option.label && styles.selectedDropdownItemText
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )}
  </View>
);

// ===== MAIN COMPONENT =====
export default function AddMedicationScreen() {
  const params = useLocalSearchParams();
  const currentUser = useUserInitialization();
  
  // ===== STATE =====
  const [showQRModal, setShowQRModal] = useState(true);
  const [isPrescriptionLocked, setIsPrescriptionLocked] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [scannedMedications, setScannedMedications] = useState([]);
  const [selectedMedicationIndex, setSelectedMedicationIndex] = useState(0);
  const [showMedicationDropdown, setShowMedicationDropdown] = useState(false);
  const [form, setForm] = useState(getInitialFormState(params));
  const [errors, setErrors] = useState({});
  const [selectedType, setSelectedType] = useState(params?.type || '');
  const [selectedIllnessType, setSelectedIllnessType] = useState(params?.illnessType || '');
  const [showIllnessDropdown, setShowIllnessDropdown] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState(params?.frequencies || '');
  const [selectedDuration, setSelectedDuration] = useState(params?.duration || '');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // ===== REFS =====
  const scanProcessingRef = useRef(false);
  const lastProcessedResult = useRef(null);

  // ===== HANDLERS =====
  const handleQRModalClose = () => {
    setShowQRModal(false);
    setTimeout(() => {
      scanProcessingRef.current = false;
      lastProcessedResult.current = null;
    }, 500);
  };

  const handleScanSuccess = async (scanResult) => {
    console.log('Scan success with result:', scanResult);
    
    if (scanProcessingRef.current) {
        console.log('Scan result ignored: already processing');
        return;
    }

    const resultKey = typeof scanResult === 'string' ? scanResult : JSON.stringify(scanResult);
    if (lastProcessedResult.current === resultKey) {
        console.log('Scan result ignored: duplicate result');
        return;
    }

    scanProcessingRef.current = true;
    lastProcessedResult.current = resultKey;
    
    try {
        if (!currentUser) {
        throw new Error('No user logged in');
        }

        const userId = currentUser.uid || currentUser.userId || currentUser.$id;
        
        if (typeof scanResult === 'string' && scanResult.startsWith('APPT:')) {
        console.log('Processing prescription QR code:', scanResult);
        
        const prescriptionResult = await integratedPatientMedicationService.getPrescriptionByQR(scanResult);
        console.log('Prescription data loaded:', prescriptionResult);
        
        await handlePrescriptionScan(prescriptionResult, userId);
        
        } else if (typeof scanResult === 'object' && scanResult.medications && scanResult.action) {
        console.log('Processing scanned medications object:', scanResult);
        
        const mockPrescriptionResult = {
            prescription: {
            $id: `scanned_${Date.now()}`,
            reference_code: scanResult.medications[0]?.referenceCode || 'SCANNED',
            prescribed_by: 'Healthcare Provider'
            },
            medications: scanResult.medications,
            qrData: {
            appointmentId: scanResult.medications[0]?.appointmentId || 'scanned',
            referenceCode: scanResult.medications[0]?.referenceCode || 'SCANNED'
            }
        };
        
        switch (scanResult.action) {
            case 'add_all':
            await handlePrescriptionScanWithAction(mockPrescriptionResult, userId, 'add_all');
            break;
            
            case 'add_single':
            await handlePrescriptionScanWithAction(mockPrescriptionResult, userId, 'add_single');
            break;
            
            case 'review_edit':
            default:
            await handlePrescriptionScanWithAction(mockPrescriptionResult, userId, 'review_edit');
            break;
        }
        
        } else {
        throw new Error('Unsupported QR code format. Please use a prescription QR code from your healthcare provider.');
        }
        
    } catch (error) {
        console.error('Error handling scan success:', error);
        Alert.alert(
        'Scan Error',
        `Failed to process QR code: ${error.message}`,
        [{ text: 'OK', onPress: () => { scanProcessingRef.current = false; }}]
        );
    }
  };

  const handlePrescriptionScanWithAction = async (prescriptionResult, userId, action) => {
    try {
        console.log('Handling prescription scan with action:', action, prescriptionResult);
        
        if (!prescriptionResult.medications || prescriptionResult.medications.length === 0) {
        throw new Error('No medications found in this prescription');
        }

        setIsPrescriptionLocked(true);
        setPrescriptionData({
        prescriptionId: prescriptionResult.prescription.$id,
        referenceCode: prescriptionResult.prescription.reference_code,
        appointmentId: prescriptionResult.qrData.appointmentId,
        isFromHealthPractitioner: true,
        lockFields: ['name', 'type', 'illnessType', 'dosage', 'frequencies', 'duration'],
        appointmentInfo: prescriptionResult.appointment
        });
        
        const patientMedications = prescriptionResult.medications.map(med => ({
        ...med,
        id: `med_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        color: generateRandomColor(),
        isPrescription: true,
        prescriptionId: prescriptionResult.prescription.$id,
        prescribedBy: 'Healthcare Provider',
        referenceCode: prescriptionResult.prescription.reference_code,
        appointmentId: prescriptionResult.qrData.appointmentId
        }));
        
        setScannedMedications(patientMedications);
        setSelectedMedicationIndex(0);
        setShowQRModal(false);
        
        switch (action) {
        case 'add_all':
            console.log('Auto-adding all medications...');
            setTimeout(() => {
            handleAddAllPrescriptionMedications(patientMedications, userId);
            }, 500);
            break;
            
        case 'add_single':
            if (patientMedications.length === 1) {
            handleSingleMedication(patientMedications[0]);
            setTimeout(() => {
                handleAddAllPrescriptionMedications(patientMedications, userId);
            }, 500);
            } else {
            handleSingleMedication(patientMedications[0]);
            scanProcessingRef.current = false;
            }
            break;
            
        case 'review_edit':
        default:
            handleSingleMedication(patientMedications[0]);
            scanProcessingRef.current = false;
            
            if (patientMedications.length === 1) {
            setTimeout(() => {
                Alert.alert(
                'Prescription Loaded! 💊',
                `Medication "${patientMedications[0].name}" is ready for customization.\n\n🔒 Prescription details are locked for safety.\n⏰ You can customize medication times.\n\n✅ Save when ready to add to your account.`,
                [{ text: 'OK' }]
                );
            }, 500);
            } else {
            setTimeout(() => {
                Alert.alert(
                'Prescription Loaded! 💊',
                `${patientMedications.length} medications are ready for review.\n\n🔒 Prescription details are locked for safety.\n⏰ You can customize medication times.\n\n✅ Save each medication or use "Add All" when ready.`,
                [{ text: 'OK' }]
                );
            }, 500);
            }
            break;
        }
        
    } catch (error) {
        console.error('Error handling prescription scan with action:', error);
        Alert.alert(
        'Error',
        `Failed to process prescription: ${error.message}`,
        [{ text: 'OK', onPress: () => { scanProcessingRef.current = false; }}]
        );
    }
  };

  const handlePrescriptionScan = async (prescriptionResult, userId) => {
    try {
      console.log('Handling prescription scan with result:', prescriptionResult);
      
      if (!prescriptionResult.medications || prescriptionResult.medications.length === 0) {
        throw new Error('No medications found in this prescription');
      }

      setIsPrescriptionLocked(true);
      setPrescriptionData({
        prescriptionId: prescriptionResult.prescription.$id,
        referenceCode: prescriptionResult.prescription.reference_code,
        appointmentId: prescriptionResult.qrData.appointmentId,
        isFromHealthPractitioner: true,
        lockFields: ['name', 'type', 'illnessType', 'dosage', 'frequencies', 'duration'],
        appointmentInfo: prescriptionResult.appointment
      });
      
      const patientMedications = prescriptionResult.medications.map(med => ({
        ...med,
        id: `med_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        color: generateRandomColor(),
        isPrescription: true,
        prescriptionId: prescriptionResult.prescription.$id,
        prescribedBy: 'Healthcare Provider',
        referenceCode: prescriptionResult.prescription.reference_code,
        appointmentId: prescriptionResult.qrData.appointmentId
      }));
      
      setScannedMedications(patientMedications);
      setSelectedMedicationIndex(0);
      setShowQRModal(false);
      
      if (patientMedications.length === 1) {
        handleSingleMedication(patientMedications[0]);
        
        setTimeout(() => {
          Alert.alert(
            'Prescription Scanned! 💊',
            `Found 1 medication prescribed by your healthcare provider.\n\n🔒 Medication details are locked for safety. You can customize medication times to fit your schedule.\n\n✅ Will be saved to your account permanently.`,
            [
              {
                text: 'Add to My Medications',
                onPress: () => handleAddAllPrescriptionMedications(patientMedications, userId)
              },
              { 
                text: 'Customize Times First',
                style: 'cancel',
                onPress: () => { scanProcessingRef.current = false; }
              }
            ]
          );
        }, 500);
      } else {
        handleSingleMedication(patientMedications[0]);
        
        setTimeout(() => {
          Alert.alert(
            'Prescription Scanned Successfully! 💊',
            `Found ${patientMedications.length} medications prescribed by your healthcare provider.\n\n🔒 Medication details are locked for safety. You can customize medication times only.\n\n✅ Will be saved to your account permanently.`,
            [
              {
                text: 'Add All to My Medications',
                onPress: () => handleAddAllPrescriptionMedications(patientMedications, userId)
              },
              { 
                text: 'Customize Individual',
                style: 'cancel',
                onPress: () => { scanProcessingRef.current = false; }
              }
            ]
          );
        }, 500);
      }
      
    } catch (error) {
      console.error('Error handling prescription scan:', error);
      Alert.alert(
        'Error',
        `Failed to process prescription: ${error.message}`,
        [{ text: 'OK', onPress: () => { scanProcessingRef.current = false; }}]
      );
    }
  };

  const handleAddAllPrescriptionMedications = async (medications, userId) => {
    if (loading) {
      console.log('Add all medications ignored: already processing');
      return;
    }

    try {
      setLoading(true);
      
      console.log('Adding prescription medications to patient account...');
      console.log('User ID:', userId);
      console.log('Appointment ID:', prescriptionData?.appointmentId);
      
      const result = await integratedPatientMedicationService.addPrescriptionMedicationsToPatient(
        prescriptionData.appointmentId,
        userId
      );
      
      console.log('Prescription medications added:', result);
      
      for (const successfulMed of result.successful) {
        try {
          if (successfulMed.times && successfulMed.times.length > 0) {
            await scheduleMedicationReminder({
              id: successfulMed.id,
              name: successfulMed.name,
              times: successfulMed.times,
              reminderEnabled: true
            });
            console.log(`Reminder scheduled for ${successfulMed.name}`);
          }
        } catch (reminderError) {
          console.error(`Failed to schedule reminder for ${successfulMed.name}:`, reminderError);
        }
      }
      
      if (result.successful.length > 0 && result.failed.length === 0) {
        const successList = result.successful
          .map(med => `${med.name} (${med.times.join(', ')})`)
          .join('\n');
        
        Alert.alert(
          'Success! 🎉',
          `Successfully added all ${result.successful.length} prescription medications to your account:\n\n${successList}\n\n✅ Your medications are now saved permanently and will sync across all your devices.`,
          [{ 
            text: 'OK', 
            onPress: () => {
              scanProcessingRef.current = false;
              router.back();
            }
          }]
        );
      } else if (result.successful.length > 0 && result.failed.length > 0) {
        const successList = result.successful.map(med => `✓ ${med.name}`).join('\n');
        const failedList = result.failed.map(med => `✗ ${med.name}: ${med.error}`).join('\n');
        
        Alert.alert(
          'Partial Success',
          `Added ${result.successful.length} of ${result.totalCount} medications:\n\n${successList}\n\nFailed:\n${failedList}`,
          [{ 
            text: 'OK', 
            onPress: () => {
              scanProcessingRef.current = false;
              router.back();
            }
          }]
        );
      } else {
        const failedList = result.failed.map(med => `${med.name}: ${med.error}`).join('\n');
        
        Alert.alert(
          'Error', 
          `Failed to add prescription medications:\n\n${failedList}\n\nPlease try again or contact support.`,
          [{ 
            text: 'OK',
            onPress: () => { scanProcessingRef.current = false; }
          }]
        );
      }
      
    } catch (error) {
      console.error('Error adding prescription medications:', error);
      Alert.alert(
        'Error', 
        `Failed to add prescription medications: ${error.message}\n\nPlease try again.`,
        [{ 
          text: 'OK',
          onPress: () => { scanProcessingRef.current = false; }
        }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSingleMedication = (medication) => {
    console.log('Loading medication for editing:', medication);
    
    let medicationTimes = [];
    if (medication.times && Array.isArray(medication.times) && medication.times.length > 0) {
      medicationTimes = medication.times;
    } else {
      const frequencyData = FREQUENCIES.find(freq => freq.label === medication.frequencies);
      medicationTimes = frequencyData ? frequencyData.times : ['09:00'];
    }
    
    setForm({
      name: medication.name || '',
      type: medication.type || '',
      illnessType: medication.illnessType || '',
      dosage: medication.dosage || '',
      frequencies: medication.frequencies || '',
      duration: medication.duration || '',
      startDate: new Date(),
      times: medicationTimes,
      notes: medication.notes || '',
      reminderEnabled: true,
      refillReminder: false,
      currentSupply: medication.currentSupply || '',
      refillAt: medication.refillAt || '',
    });
    
    setSelectedType(medication.type || '');
    setSelectedIllnessType(medication.illnessType || '');
    setSelectedFrequency(medication.frequencies || '');
    setSelectedDuration(medication.duration || '');
  };

  const isFieldLocked = (fieldName) => {
    return isPrescriptionLocked && prescriptionData?.lockFields?.includes(fieldName);
  };

  const handleLockedFieldTouch = (fieldName) => {
    Alert.alert(
      'Field Locked 🔒',
      `This ${fieldName} was prescribed by your healthcare provider and cannot be modified for safety reasons.`,
      [{ text: 'OK' }]
    );
  };

  const enableManualEntry = () => {
    Alert.alert(
      'Enable Manual Entry',
      'Are you sure you want to enable manual entry? This will unlock all fields but medication data will no longer be verified by healthcare provider.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enable Manual Entry',
          style: 'destructive',
          onPress: () => {
            setIsPrescriptionLocked(false);
            setPrescriptionData(null);
            setScannedMedications([]);
            setForm(getInitialFormState({}));
            setSelectedType('');
            setSelectedIllnessType('');
            setSelectedFrequency('');
            setSelectedDuration('');
          }
        }
      ]
    );
  };

  const validateForm = () => {
    const newErrors = {}; 
    if (!form.name.trim()) newErrors.name = 'Medication name is required';
    if (!form.type.trim()) newErrors.type = 'Medication type is required';
    if (!form.illnessType.trim()) newErrors.illnessType = 'Illness type is required';
    if (!form.dosage.trim()) newErrors.dosage = 'Dosage is required';
    if (!form.frequencies.trim()) newErrors.frequencies = 'Frequency is required';
    if (!form.duration.trim()) newErrors.duration = 'Duration is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const prepareMedicationData = (formData) => {
    let medicationTimes = [];
    if (Array.isArray(formData.times) && formData.times.length > 0) {
      medicationTimes = formData.times.map(time => String(time));
    } else {
      const frequencyData = FREQUENCIES.find(freq => freq.label === formData.frequencies);
      medicationTimes = frequencyData ? frequencyData.times : ['09:00'];
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name || 'Unknown Medication',
      type: formData.type || 'Tablet',
      illnessType: formData.illnessType || 'General',
      dosage: formData.dosage || 'As prescribed',
      frequencies: formData.frequencies || 'Once Daily',
      duration: formData.duration || '30 days',
      startDate: new Date().toISOString(),
      times: medicationTimes,
      notes: formData.notes || (isPrescriptionLocked ? 'Added from prescription scan' : ''),
      reminderEnabled: formData.reminderEnabled !== false,
      refillReminder: formData.refillReminder || false,
      currentSupply: 0,
      totalSupply: 0,
      refillAt: 0,
      color: generateRandomColor(),
      isPrescription: isPrescriptionLocked,
      prescriptionId: prescriptionData?.prescriptionId || null,
      prescribedBy: isPrescriptionLocked ? 'Healthcare Provider' : null,
      referenceCode: prescriptionData?.referenceCode || null,
      appointmentId: prescriptionData?.appointmentId || null,
    };
  };

  const saveCurrentMedication = async (showSuccessAlert = true) => {
    try {
      if (!validateForm()) {
        Alert.alert('Error', 'Please fill in all required fields correctly!');
        return false;
      }

      if (!currentUser) {
        Alert.alert('Error', 'No user logged in. Please log in to save medications.');
        return false;
      }

      const userId = currentUser.uid || currentUser.userId || currentUser.$id;
      const medicationData = prepareMedicationData(form);
      
      console.log('Saving medication for user:', userId);
      console.log('Medication data:', medicationData);
      
      let savedMedication;
      if (isPrescriptionLocked && prescriptionData?.appointmentId) {
        savedMedication = await integratedPatientMedicationService.addManualMedication(medicationData, userId);
      } else {
        savedMedication = await integratedPatientMedicationService.addManualMedication(medicationData, userId);
      }

      console.log('Medication saved to Appwrite:', savedMedication);

      if (medicationData.reminderEnabled) {
        if (!Array.isArray(medicationData.times) || medicationData.times.length === 0) {
          console.error('No medication times found!');
          Alert.alert('Error', 'Please add at least one medication time');
          return false;
        }
        
        await scheduleMedicationReminder(savedMedication);
      }

      if (showSuccessAlert) {
        const prescriptionNote = isPrescriptionLocked ? ' (Prescription)' : '';
        const persistenceNote = '✅ Medication saved to your account and will sync across all devices.';
        
        Alert.alert(
          'Success',
          `Medication "${savedMedication.name}"${prescriptionNote} added with times: ${savedMedication.times.join(', ')}\n\n${persistenceNote}`,
          [{ text: 'OK', onPress: () => router.back() }],
          { cancelable: false }
        );
      }

      return true;
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert(
        'Error',
        `Failed to save medication: ${error.message}\n\nPlease try again.`,
        [{ text: 'OK' }],
        { cancelable: false }
      );
      return false;
    }
  };

  const handleSave = async () => {
    try {
      if (isSubmitting) return;
      setIsSubmitting(true);

      if (scannedMedications.length > 1) {
        const currentIndex = selectedMedicationIndex;
        const remainingCount = scannedMedications.length - currentIndex - 1;
        
        Alert.alert(
          'Save Options',
          remainingCount > 0 
            ? `Save current medication to your account?\n\n${remainingCount} more medication(s) remaining in this prescription.`
            : 'Save this medication to your account?',
          [
            {
              text: 'Save & Continue',
              onPress: async () => {
                const success = await saveCurrentMedication(false);
                if (success && remainingCount > 0) {
                  const nextIndex = currentIndex + 1;
                  setSelectedMedicationIndex(nextIndex);
                  handleSingleMedication(scannedMedications[nextIndex]);
                  setIsSubmitting(false);
                  
                  Alert.alert(
                    'Success!',
                    `Medication ${currentIndex + 1} saved to your account!\n\nNow editing medication ${nextIndex + 1}: ${scannedMedications[nextIndex].name}`,
                    [{ text: 'Continue' }]
                  );
                } else if (success) {
                  Alert.alert(
                    'All Done!',
                    'All medications from this prescription have been added to your account!',
                    [{ text: 'OK', onPress: () => router.back() }]
                  );
                }
              }
            },
            {
              text: 'Save & Finish',
              onPress: async () => {
                const success = await saveCurrentMedication(true);
                if (success && remainingCount > 0) {
                  Alert.alert(
                    'Reminder',
                    `You have ${remainingCount} more medication(s) from this prescription that weren't added. You can scan the QR code again to add them later.`,
                    [{ text: 'OK' }]
                  );
                }
              }
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setIsSubmitting(false)
            }
          ]
        );
      } else {
        await saveCurrentMedication(true);
      }

    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save medication, Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type.label);
    updateFormField('type', type.label);
  };

  const handleIllnessSelect = (illness) => {
    setSelectedIllnessType(illness.label);
    updateFormField('illnessType', illness.label);
  };

  const handleFrequencySelect = (freq) => {
    setSelectedFrequency(freq.label);
    setForm(prev => ({ ...prev, frequencies: freq.label, times: freq.times }));
    if (errors.frequencies) {
      setErrors(prev => ({ ...prev, frequencies: '' }));
    }
  };

  const handleDurationSelect = (dur) => {
    setSelectedDuration(dur.label);
    updateFormField('duration', dur.label);
  };

  const renderDurationOption = (option, isSelected) => (
    <>
      <Text style={[
        styles.durationNumber, 
        isSelected && styles.selectedDurationNumber
      ]}>
        {option.value > 0 ? option.value : '∞'}
      </Text>
      <Text style={[
        styles.optionLabel,
        isSelected && styles.selectedOptionLabel
      ]}>
        {option.label}
      </Text>
    </>
  );

  // ===== EARLY RETURNS =====
  if (loading) {
    return <LoadingScreen />;
  }

  // ===== RENDER =====
  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#1a8e2d', '#146922']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />
      
      <QRScannerModal
        visible={showQRModal}
        onClose={handleQRModalClose}
        onScanSuccess={handleScanSuccess}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <PageHeader onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Add Medication</Text>
        </View>
        
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={{ flex: 1 }}
          contentContainerStyle={styles.formContentContainer}
        >
          <ScanButton
            isPrescriptionLocked={isPrescriptionLocked}
            onPress={() => setShowQRModal(true)}
            enableManualEntry={enableManualEntry}
            loading={loading}
          />

          <PrescriptionLockBanner isPrescriptionLocked={isPrescriptionLocked} />
          
          <MedicationSelector
            scannedMedications={scannedMedications}
            selectedMedicationIndex={selectedMedicationIndex}
            showMedicationDropdown={showMedicationDropdown}
            setShowMedicationDropdown={setShowMedicationDropdown}
            setSelectedMedicationIndex={setSelectedMedicationIndex}
            handleSingleMedication={handleSingleMedication}
            handleAddAllPrescriptionMedications={handleAddAllPrescriptionMedications}
            currentUser={currentUser}
            loading={loading}
          />
          
          <View style={styles.section}>
            <InputField
              value={form.name}
              onChangeText={(text) => updateFormField('name', text)}
              placeholder="Medication Name"
              error={errors.name}
              isLocked={isFieldLocked('name')}
              onLockedTouch={() => handleLockedFieldTouch('medication name')}
            />
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Medication Type</Text>
              {errors.type && <Text style={styles.errorText}>{errors.type}</Text>}
              
              {isFieldLocked('type') ? (
                <TouchableOpacity 
                  style={styles.lockedFieldContainer}
                  onPress={() => handleLockedFieldTouch('medication type')}
                >
                  <View style={styles.lockedFieldContent}>
                    <View style={styles.lockedFieldInfo}>
                      <Ionicons name="lock-closed" size={20} color="#666" />
                      <Text style={styles.lockedFieldLabel}>Medication Type</Text>
                    </View>
                    <Text style={styles.lockedFieldValue}>{form.type}</Text>
                    <Text style={styles.lockedFieldSubtext}>Prescribed by healthcare provider</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <OptionGrid
                  options={MEDICATION_TYPES}
                  selectedOption={selectedType}
                  onSelect={handleTypeSelect}
                />
              )}
              
              <Text style={styles.sectionTitle}>Illness Type</Text>
              
              {isFieldLocked('illnessType') ? (
                <TouchableOpacity 
                  style={styles.lockedFieldContainer}
                  onPress={() => handleLockedFieldTouch('illness type')}
                >
                  <View style={styles.lockedFieldContent}>
                    <View style={styles.lockedFieldInfo}>
                      <Ionicons name="lock-closed" size={20} color="#666" />
                      <Text style={styles.lockedFieldLabel}>Illness Type</Text>
                    </View>
                    <Text style={styles.lockedFieldValue}>{form.illnessType}</Text>
                    <Text style={styles.lockedFieldSubtext}>Prescribed by healthcare provider</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <Dropdown
                  options={ILLNESS_TYPES}
                  selectedOption={form.illnessType}
                  onSelect={handleIllnessSelect}
                  placeholder="Select Illness Type"
                  showDropdown={showIllnessDropdown}
                  setShowDropdown={setShowIllnessDropdown}
                  error={errors.illnessType}
                />
              )}
            </View>
            
            <InputField
              value={form.dosage}
              onChangeText={(text) => updateFormField('dosage', text)}
              placeholder="Dosage e.g(500mg)"
              error={errors.dosage}
              isLocked={isFieldLocked('dosage')}
              onLockedTouch={() => handleLockedFieldTouch('dosage')}
            />
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How Often?</Text>
            {errors.frequencies && <Text style={styles.errorText}>{errors.frequencies}</Text>}
            
            {isFieldLocked('frequencies') ? (
              <TouchableOpacity 
                style={styles.lockedFieldContainer}
                onPress={() => handleLockedFieldTouch('frequency')}
              >
                <View style={styles.lockedFieldContent}>
                  <View style={styles.lockedFieldInfo}>
                    <Ionicons name="lock-closed" size={20} color="#666" />
                    <Text style={styles.lockedFieldLabel}>Frequency</Text>
                  </View>
                  <Text style={styles.lockedFieldValue}>{form.frequencies}</Text>
                  <Text style={styles.lockedFieldSubtext}>Prescribed by healthcare provider</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <OptionGrid
                options={FREQUENCIES}
                selectedOption={selectedFrequency}
                onSelect={handleFrequencySelect}
              />
            )}
            
            <Text style={styles.sectionTitle}>For How Long?</Text>
            
            {isFieldLocked('duration') ? (
              <TouchableOpacity 
                style={styles.lockedFieldContainer}
                onPress={() => handleLockedFieldTouch('duration')}
              >
                <View style={styles.lockedFieldContent}>
                  <View style={styles.lockedFieldInfo}>
                    <Ionicons name="lock-closed" size={20} color="#666" />
                    <Text style={styles.lockedFieldLabel}>Duration</Text>
                  </View>
                  <Text style={styles.lockedFieldValue}>{form.duration}</Text>
                  <Text style={styles.lockedFieldSubtext}>Prescribed by healthcare provider</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <OptionGrid
                options={DURATIONS}
                selectedOption={selectedDuration}
                onSelect={handleDurationSelect}
                renderOption={renderDurationOption}
              />
            )}
            
            {errors.duration && <Text style={styles.errorText}>{errors.duration}</Text>}

            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.dateIconContainer}>
                <Ionicons name="calendar" size={20} color="#1a8e2d" />
              </View>
              <Text style={styles.dateButtonText}>
                Starts: {form.startDate.toLocaleDateString()}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker 
                value={form.startDate} 
                mode="date"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) updateFormField('startDate', date);
                }}
              />  
            )}

            {form.frequencies && form.frequencies !== 'As Needed' && (
              <View style={styles.timesContainer}>
                <View style={styles.timesHeader}>
                  <Text style={styles.timesTitle}>
                    Medication Times 
                    {isPrescriptionLocked && (
                      <Text style={styles.customizableLabel}> (Customizable)</Text>
                    )}
                  </Text>
                  {form.frequencies && (
                    <TouchableOpacity
                      style={styles.resetTimesButton}
                      onPress={() => {
                        const frequencyData = FREQUENCIES.find(freq => freq.label === form.frequencies);
                        if (frequencyData) {
                          Alert.alert(
                            'Reset to Default Times?',
                            `Reset times to default for "${form.frequencies}"?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Reset',
                                onPress: () => updateFormField('times', frequencyData.times)
                              }
                            ]
                          );
                        }
                      }}
                    >
                      <Ionicons name="refresh-outline" size={16} color="#1a8e2d" />
                      <Text style={styles.resetTimesText}>Reset</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <View style={styles.timesInfo}>
                  <Ionicons name="information-circle-outline" size={16} color="#1a8e2d" />
                  <Text style={styles.timesInfoText}>
                    {isPrescriptionLocked 
                      ? 'You can customize medication times to fit your schedule'
                      : 'Tap any time to customize when you take this medication'
                    }
                  </Text>
                </View>
                
                {form.times.map((time, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.timeButton,
                      isPrescriptionLocked && styles.customizableTimeButton
                    ]}
                    onPress={() => {
                      setCurrentTimeIndex(index);
                      setShowTimePicker(true);
                    }}
                  >
                    <View style={styles.timesIconContainer}>
                      <Ionicons name="time-outline" size={20} color="#1a8e2d" />
                    </View>
                    <Text style={styles.timeButtonText}>{time}</Text>
                    <View style={styles.timeButtonActions}>
                      <Text style={styles.customTimeLabel}>
                        {isPrescriptionLocked ? 'Customizable' : (index === 0 ? 'Tap to customize' : '')}
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color="#666" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {showTimePicker && (
              <DateTimePicker 
                mode="time" 
                value={(() => {
                  const [hours, minutes] = form.times[currentTimeIndex].split(':').map(Number);
                  const date = new Date();
                  date.setHours(hours, minutes, 0, 0);
                  return date;
                })()}
                onChange={(event, date) => {
                  setShowTimePicker(false);
                  if (date) {
                    const newTime = date.toLocaleTimeString('default', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    });
                    
                    const newTimes = form.times.map((t, i) => (i === currentTimeIndex ? newTime : t));
                    updateFormField('times', newTimes);
                  }
                }}
              />
            )}
          </View>
          
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelContainer}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="notifications" size={20} color="#1a8e2d" />
                  </View>
                  <View style={styles.switchTextContainer}>
                    <Text style={styles.switchLabel}>Reminders</Text>
                    <Text style={styles.switchSubLabel}>
                      Get Notified When It's Time to Take Medications
                    </Text>
                  </View>
                </View>
                <Switch 
                  value={form.reminderEnabled}
                  trackColor={{ false: '#ddd', true: '#1a8e2d' }} 
                  thumbColor="white"
                  onValueChange={(value) => updateFormField('reminderEnabled', value)}
                />
              </View>
            </View>
          </View>
          
          <View style={styles.section}>
            <View style={styles.textAreaContainer}>
              <TextInput 
                style={styles.textArea}
                placeholder={
                  isPrescriptionLocked 
                    ? 'Add personal notes (prescription details are protected)...' 
                    : 'Add Notes or special instructions...'
                } 
                placeholderTextColor="#999"
                value={form.notes}
                onChangeText={(text) => updateFormField('notes', text)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.saveButton,
              (isSubmitting || loading) && styles.saveButtonDisabled,
            ]} 
            onPress={handleSave}
            disabled={isSubmitting || loading}
          >
            <LinearGradient
              colors={['#1a8e2d', '#146922']}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.saveButtonText}>
                {isSubmitting ? 'Saving to Account...' : 
                 scannedMedications.length > 1 ? 
                 `Save Medication ${selectedMedicationIndex + 1}/${scannedMedications.length}` : 
                 isPrescriptionLocked ? 'Save Prescription to Account' : 'Add to My Medications'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={isSubmitting || loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 15,
  },
  headerGradient: {
    height: Platform.OS === 'ios' ? 120 : 100,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  formContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 150,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  // Buttons
  scanPrescriptionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#e6f7e9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a8e2d20',
    justifyContent: 'center',
  },
  scanPrescriptionText: {
    color: '#1a8e2d',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 8,
  },
  scanPrescriptionSubText: {
    color: '#1a8e2d',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ff6b3520',
    justifyContent: 'center',
  },
  manualEntryText: {
    color: '#ff6b35',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },

  // Prescription Lock Banner
  prescriptionLockBanner: {
    backgroundColor: '#f0f9f0',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#1a8e2d20',
  },
  lockBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lockBannerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a8e2d',
    marginLeft: 8,
  },
  lockBannerNote: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockBannerNoteText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },

  // Medication Selector
  medicationSelectorContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e6f7e9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicationSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8fdf9',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e6f7e9',
  },
  medicationSelectorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  medicationSelectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a8e2d',
    marginLeft: 8,
  },
  addAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7e9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a8e2d20',
  },
  addAllButtonText: {
    color: '#1a8e2d',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  progressIndicator: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1a8e2d',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  medicationDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'white',
  },
  medicationDropdownInfo: {
    flex: 1,
  },
  medicationDropdownLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  medicationDropdownName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  medicationDropdownDosage: {
    fontSize: 14,
    color: '#1a8e2d',
    fontWeight: '500',
  },
  medicationDropdownMenu: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  medicationDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  selectedMedicationDropdownItem: {
    backgroundColor: '#f8fdf9',
    borderBottomColor: '#e6f7e9',
  },
  medicationDropdownItemContent: {
    flex: 1,
  },
  medicationDropdownItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  medicationDropdownItemDetails: {
    fontSize: 13,
    color: '#666',
  },
  selectedMedicationDropdownItemText: {
    color: '#1a8e2d',
  },

  // Input Fields
  inputContainer: {
    marginBottom: 15,
    position: 'relative',
  },
  mainInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  inputError: {
    borderColor: 'red',
  },
  lockedInput: {
    backgroundColor: '#f8f8f8',
    borderColor: '#ddd',
    color: '#666',
  },
  lockIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },

  // Locked Fields
  lockedFieldContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  lockedFieldContent: {
    alignItems: 'flex-start',
  },
  lockedFieldInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lockedFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  lockedFieldValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  lockedFieldSubtext: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },

  // Option Grids
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  optionCard: {
    width: width / 4 - 15,
    height: 90,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  selectedOptionCard: {
    borderColor: '#1a8e2d',
    backgroundColor: '#e6f7e9',
  },
  optionIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#e5e5e5',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  selectedOptionIcon: {
    backgroundColor: '#1a8e2d',
  },
  optionLabel: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
  },
  selectedOptionLabel: {
    color: '#1a8e2d',
    fontWeight: 'bold',
  },
  durationNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  selectedDurationNumber: {
    color: '#1a8e2d',
  },

  // Dropdowns
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 5,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  dropdownMenu: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedDropdownItem: {
    backgroundColor: '#e6f7e9',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedDropdownItemText: {
    color: '#1a8e2d',
    fontWeight: 'bold',
  },

  // Date and Time
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  dateIconContainer: {
    marginRight: 10,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },

  // Times
  timesContainer: {
    marginTop: 10,
  },
  timesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  customizableLabel: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#1a8e2d',
    fontStyle: 'italic',
  },
  resetTimesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1a8e2d20',
  },
  resetTimesText: {
    fontSize: 12,
    color: '#1a8e2d',
    marginLeft: 4,
    fontWeight: '500',
  },
  timesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  timesInfoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  customizableTimeButton: {
    borderColor: '#1a8e2d20',
    backgroundColor: '#f8fdf9',
  },
  timesIconContainer: {
    marginRight: 10,
  },
  timeButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  timeButtonActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customTimeLabel: {
    fontSize: 12,
    color: '#1a8e2d',
    marginRight: 8,
    fontStyle: 'italic',
  },

  // Card and Switch
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    backgroundColor: '#e5e5e5',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  switchTextContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  switchSubLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },

  // Text Area
  textAreaContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 20,
  },
  textArea: {
    padding: 12,
    height: 100,
    fontSize: 16,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  saveButton: {
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});