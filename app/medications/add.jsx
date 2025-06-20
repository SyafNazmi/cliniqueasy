// app/medications/add.jsx - COMPLETE FIXED VERSION

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
  ActivityIndicator,
  Modal
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

// ===== FIXED CUSTOM HOOKS =====
const useUserInitialization = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [availablePatients, setAvailablePatients] = useState([]);
  const [userLoading, setUserLoading] = useState(true);

    // Manual refresh function for patients
  const refreshPatients = async () => {
    if (!currentUser) return;
    
    try {
      console.log('🔄 Manually refreshing patients list...');
      const userId = currentUser.uid || currentUser.userId || currentUser.$id;
      
      // Force reload from service
      const context = await integratedPatientMedicationService.getCurrentUserContext();
      
      const patients = [
        {
          id: userId,
          name: currentUser.name || currentUser.firstName || 'You (Account Owner)',
          type: 'owner',
          isOwner: true
        },
        ...context.familyMembers.map(fm => ({
          id: fm.id,
          name: fm.name,
          type: 'family',
          isOwner: false,
          relationship: fm.relationship
        }))
      ];
      
      setAvailablePatients(patients);
      console.log('✅ Patients refreshed successfully:', patients.length);
      
      Alert.alert('Success', `Loaded ${patients.length} patient(s) successfully!`);
    } catch (error) {
      console.error('❌ Error refreshing patients:', error);
      Alert.alert('Error', 'Failed to refresh patient list. Please try again.');
    }
  };

  // 🔧 FIX: Actually load the current user from storage
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        setUserLoading(true);
        const userDetail = await getLocalStorage('userDetail');
        
        if (userDetail && (userDetail.uid || userDetail.userId || userDetail.$id)) {
          console.log('✅ User loaded:', userDetail.name || userDetail.email);
          setCurrentUser(userDetail);
        } else {
          console.log('❌ No valid user found in storage');
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('❌ Error loading user:', error);
        setCurrentUser(null);
      } finally {
        setUserLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

  // 🔧 FIX: Load patients after user is loaded with better error handling
  useEffect(() => {
    const loadAvailablePatients = async () => {
      if (currentUser && !userLoading) {
        try {
          console.log('👥 Loading available patients for user:', currentUser.name || currentUser.email);
          
          const userId = currentUser.uid || currentUser.userId || currentUser.$id;
          
          // 🛡️ ALWAYS ensure owner is in the list first (fallback)
          const ownerPatient = {
            id: userId,
            name: currentUser.name || currentUser.firstName || currentUser.fullName || 'You (Account Owner)',
            type: 'owner',
            isOwner: true,
            email: currentUser.email,
            phone: currentUser.phone
          };
          
          let patients = [ownerPatient];
          
          // Try to load family members, but don't fail if service is unavailable
          try {
            const context = await integratedPatientMedicationService.getCurrentUserContext();
            console.log('📋 Service context loaded:', context);
            
            if (context.familyMembers && context.familyMembers.length > 0) {
              const familyPatients = context.familyMembers.map(fm => ({
                id: fm.id,
                name: fm.name,
                type: 'family',
                isOwner: false,
                relationship: fm.relationship,
                email: fm.email,
                phone: fm.phone
              }));
              
              patients = [ownerPatient, ...familyPatients];
              console.log(`✅ Loaded ${familyPatients.length} family members`);
            } else {
              console.log('📝 No family members found, using owner only');
            }
          } catch (serviceError) {
            console.log('⚠️ Service unavailable, using owner only:', serviceError.message);
            
            // 🛡️ FALLBACK: Try to get family members from local storage
            try {
              const localFamilyMembers = await getLocalStorage('familyMembers') || [];
              if (localFamilyMembers.length > 0) {
                const fallbackFamilyPatients = localFamilyMembers.map(fm => ({
                  id: fm.id || fm.familyMemberId,
                  name: fm.name || fm.fullName,
                  type: 'family',
                  isOwner: false,
                  relationship: fm.relationship || 'Family Member',
                  email: fm.email,
                  phone: fm.phone
                }));
                
                patients = [ownerPatient, ...fallbackFamilyPatients];
                console.log(`✅ Loaded ${fallbackFamilyPatients.length} family members from local storage`);
              }
            } catch (localError) {
              console.log('⚠️ Local storage fallback also failed:', localError.message);
            }
          }
          
          setAvailablePatients(patients);
          console.log(`✅ Final patient list (${patients.length} patients):`, patients.map(p => p.name));
          
        } catch (error) {
          console.error('❌ Error loading available patients:', error);
          
          // 🛡️ EMERGENCY FALLBACK: At least show the current user
          const userId = currentUser.uid || currentUser.userId || currentUser.$id;
          const emergencyPatients = [{
            id: userId,
            name: currentUser.name || currentUser.firstName || 'You (Account Owner)',
            type: 'owner',
            isOwner: true
          }];
          
          setAvailablePatients(emergencyPatients);
          console.log('🚨 Emergency fallback: showing owner only');
        }
      } else if (!userLoading && !currentUser) {
        // Clear patients if no user
        setAvailablePatients([]);
      }
    };
    
    loadAvailablePatients();
  }, [currentUser, userLoading]);

  return { currentUser, availablePatients, userLoading, refreshPatients };
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

// Patient Selector Component - Enhanced with better debugging
const PatientSelector = ({ visible, patients, onSelect, onCancel, pendingMedications, onRefresh }) => {
  if (!visible) return null;

  console.log('👥 PatientSelector render:', {
    visible,
    patientsCount: patients?.length || 0,
    patients: patients?.map(p => ({ id: p.id, name: p.name, type: p.type })) || 'undefined',
    pendingMedicationsCount: pendingMedications?.medications?.length || 0
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.patientSelectorOverlay}>
        <View style={styles.patientSelectorContainer}>
          <View style={styles.patientSelectorHeader}>
            <Text style={styles.patientSelectorTitle}>Reassign Medications</Text>
            <TouchableOpacity onPress={onCancel} style={styles.patientSelectorClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.patientSelectorSubtitle}>
            Who should receive these {pendingMedications?.medications?.length || 0} medication(s)?
          </Text>
          
          <ScrollView style={styles.patientsList}>
            {/* 🔧 FIX: Better handling of empty patients list */}
            {(!patients || patients.length === 0) ? (
              <View style={styles.noPatients}>
                <Ionicons name="alert-circle-outline" size={48} color="#999" />
                <Text style={styles.noPatientsText}>No patients available</Text>
                <Text style={styles.noPatientsSubText}>Unable to load patient list. Please try again.</Text>
                <TouchableOpacity 
                  style={styles.retryPatientsButton}
                  onPress={() => {
                    console.log('🔄 Retry loading patients...');
                    if (onRefresh) {
                      onRefresh();
                    } else {
                      onCancel(); // Close modal and let it reload
                    }
                  }}
                >
                  <Text style={styles.retryPatientsButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              patients.map((patient) => (
                <TouchableOpacity
                  key={patient.id}
                  style={styles.patientOption}
                  onPress={() => {
                    console.log('👆 Patient selected:', patient.name);
                    onSelect(patient);
                  }}
                >
                  <View style={styles.patientInfo}>
                    <View style={[
                      styles.patientAvatar, 
                      patient.isOwner ? styles.ownerAvatar : styles.familyAvatar
                    ]}>
                      <Ionicons 
                        name={patient.isOwner ? "person" : "people"} 
                        size={20} 
                        color="white" 
                      />
                    </View>
                    <View style={styles.patientDetails}>
                      <Text style={styles.patientName}>{patient.name}</Text>
                      <Text style={styles.patientType}>
                        {patient.isOwner ? 'Account Owner' : `Family Member${patient.relationship ? ` - ${patient.relationship}` : ''}`}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          
          <View style={styles.patientSelectorFooter}>
            <TouchableOpacity 
              style={styles.cancelPatientButton}
              onPress={onCancel}
            >
              <Text style={styles.cancelPatientButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ===== MAIN COMPONENT =====
export default function AddMedicationScreen() {
  const params = useLocalSearchParams();
  
  // 🔧 FIX: Use the corrected hook with destructuring
  const { currentUser, availablePatients, userLoading, refreshPatients } = useUserInitialization();
  
  // ===== STATE =====
  const [showQRModal, setShowQRModal] = useState(true);
  const [isPrescriptionLocked, setIsPrescriptionLocked] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [scannedMedications, setScannedMedications] = useState([]);
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [pendingScanResult, setPendingScanResult] = useState(null);
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
  
  // 🔧 FIX: Show loading while user is being loaded
  if (userLoading) {
    return (
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
            <Text style={styles.loadingText}>Loading your account...</Text>
            <Text style={styles.loadingSubText}>
              Preparing your medication tracker
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // 🔧 FIX: Show error if user failed to load
  if (!currentUser) {
    return (
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
            <Ionicons name="alert-circle-outline" size={48} color="#e74c3c" />
            <Text style={styles.loadingText}>Authentication Error</Text>
            <Text style={styles.loadingSubText}>
              Please log in again to add medications
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.retryButtonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return <LoadingScreen />;
  }

  // ===== HANDLERS =====
  const handleQRModalClose = () => {
    setShowQRModal(false);
    setTimeout(() => {
      scanProcessingRef.current = false;
      lastProcessedResult.current = null;
    }, 500);
  };

  const handleScanSuccess = async (scanResult) => {
    console.log('🔍 Add Screen: Scan success with result:', scanResult);
    
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
        // 🔧 FIX: More defensive user checking
        if (!currentUser) {
          console.error('❌ No current user available');
          throw new Error('Please log in again to scan prescriptions.');
        }

        const userId = currentUser.uid || currentUser.userId || currentUser.$id;
        if (!userId) {
          console.error('❌ No valid user ID found');
          throw new Error('Invalid user session. Please log in again.');
        }

        console.log('✅ Valid user found:', userId);
        
        // 🆕 NEW: Handle patient selector request
        if (typeof scanResult === 'object' && scanResult.action === 'show_patient_selector') {
          console.log('🔍 Add Screen: Showing patient selector for reassignment');
          console.log('👥 Available patients for selector:', availablePatients.map(p => ({ id: p.id, name: p.name, type: p.type })));
          setPendingScanResult(scanResult);
          setShowPatientSelector(true);
          scanProcessingRef.current = false; // Allow new scans
          return;
        }
        
        // Handle standardized scan result format from QRScannerModal
        if (typeof scanResult === 'object' && scanResult.type === 'prescription_scan') {
          console.log('🔍 Add Screen: Processing standardized scan result');
          
          const rawQR = scanResult.originalQrData || `APPT:${scanResult.medications[0]?.appointmentId}:${scanResult.medications[0]?.referenceCode}`;
          await handleServiceBasedScan(rawQR, userId, scanResult.action);
          return;
        }
        
        // Handle other scan types...
        throw new Error('Unsupported scan result format');
        
    } catch (error) {
        console.error('🔍 Add Screen: Error handling scan success:', error);
        Alert.alert(
          'Scan Error',
          `Failed to process QR code: ${error.message}`,
          [{ text: 'OK', onPress: () => { scanProcessingRef.current = false; }}]
        );
    }
  };

  // 🆕 NEW: Unified service-based scan handler
  const handleServiceBasedScan = async (qrString, userId, action) => {
    try {
        console.log('🔍 Add Screen: Using updated service for secure QR processing');
        
        // 🆕 Use the updated service method that includes security validation
        const prescriptionResult = await integratedPatientMedicationService.getPrescriptionByQR(qrString);
        
        console.log('🔍 Add Screen: Service processed QR with patient assignment:', {
          medicationCount: prescriptionResult.medications.length,
          patientName: prescriptionResult.medications[0]?.patientName,
          isFamilyMember: prescriptionResult.medications[0]?.isFamilyMember,
          securityValidated: prescriptionResult.securityValidated
        });
        
        // Verify security validation
        if (!prescriptionResult.securityValidated) {
          throw new Error('Security validation failed. Access denied.');
        }
        
        switch (action) {
          case 'add_all':
            await handleDirectAddAll(prescriptionResult, userId);
            break;
            
          case 'add_single':
            if (prescriptionResult.medications.length === 1) {
              await handleDirectAddAll(prescriptionResult, userId);
            } else {
              await handlePrescriptionScanWithAction(prescriptionResult, userId, 'review_edit');
            }
            break;
            
          case 'review_edit':
          default:
            await handlePrescriptionScanWithAction(prescriptionResult, userId, 'review_edit');
            break;
        }
        
    } catch (error) {
        console.error('🔍 Add Screen: Service-based scan error:', error);
        throw error;
    }
  };

  // 🆕 NEW: Direct add all using service
  const handleDirectAddAll = async (prescriptionResult, userId) => {
    try {
        setLoading(true);
        setShowQRModal(false);
        
        console.log(`🔍 Add Screen: Adding ${prescriptionResult.medications.length} medications using service`);
        
        // Extract patient info from first medication (secure processing ensures consistency)
        const patientInfo = prescriptionResult.medications[0] ? {
          patientId: prescriptionResult.medications[0].patientId,
          patientName: prescriptionResult.medications[0].patientName,
          isFamilyMember: prescriptionResult.medications[0].isFamilyMember
        } : null;
        
        console.log('🔍 Add Screen: Patient assignment:', patientInfo);
        
        // Use the service's existing method for adding prescription medications
        const result = await integratedPatientMedicationService.addPrescriptionMedicationsToPatient(
          prescriptionResult.qrData.appointmentId,
          patientInfo?.patientId || userId
        );
        
        console.log('🔍 Add Screen: Service added medications:', result);
        
        // Show success message with correct patient information
        const medicationCount = result.successful.length;
        const patientName = patientInfo?.patientName || 'Patient';
        const patientType = patientInfo?.isFamilyMember ? 'family member account' : 'your account';
        
        if (result.successful.length > 0) {
          const successList = result.successful
            .map(med => `• ${med.name} (${med.times.join(', ')})`)
            .join('\n');
          
          Alert.alert(
            'Success! 🎉',
            `Added ${medicationCount} medication${medicationCount > 1 ? 's' : ''} to ${patientName}'s tracker.\n\n${successList}\n\n✅ The medications have been saved to ${patientType} and will sync across all devices.`,
            [
              {
                text: 'View Medications',
                onPress: () => {
                  scanProcessingRef.current = false;
                  router.push('/medications');
                }
              }
            ]
          );
        } else {
          throw new Error('No medications were successfully added');
        }
        
    } catch (error) {
        console.error('🔍 Add Screen: Error in direct add all:', error);
        Alert.alert(
          'Error',
          `Failed to add medications: ${error.message}`,
          [{ text: 'OK', onPress: () => { scanProcessingRef.current = false; }}]
        );
    } finally {
        setLoading(false);
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

  const handlePatientReassignment = (selectedPatient) => {
    if (!pendingScanResult || !selectedPatient) {
      setShowPatientSelector(false);
      setPendingScanResult(null);
      return;
    }

    console.log('🔍 Add Screen: Reassigning medications to:', selectedPatient.name);

    // Update all medications with new patient assignment
    const updatedMedications = pendingScanResult.medications.map(med => ({
      ...med,
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      isFamilyMember: selectedPatient.type === 'family',
      securityValidated: true, // Maintain security validation
      verifiedAccess: true
    }));

    // Create updated scan result
    const updatedScanResult = {
      ...pendingScanResult,
      medications: updatedMedications,
      patientInfo: {
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        isFamilyMember: selectedPatient.type === 'family'
      },
      action: 'add_all' // Default to add all after reassignment
    };

    // Close patient selector
    setShowPatientSelector(false);
    setPendingScanResult(null);

    // Show confirmation and proceed
    Alert.alert(
      'Patient Reassigned ✅',
      `Medications will now be assigned to: ${selectedPatient.name}\n\nProceed with adding medications?`,
      [
        {
          text: 'Add Medications',
          onPress: () => {
            // Process the reassigned medications
            handleServiceBasedScanWithReassignment(updatedScanResult);
          }
        },
        {
          text: 'Review Individual',
          onPress: () => {
            // Load for individual review
            const reassignedResult = { ...updatedScanResult, action: 'review_edit' };
            handleServiceBasedScanWithReassignment(reassignedResult);
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  // Handle reassigned medications
  const handleServiceBasedScanWithReassignment = async (scanResult) => {
    try {
      console.log('🔍 Add Screen: Processing reassigned medications');
      
      // Simulate the prescription result structure
      const prescriptionResult = {
        medications: scanResult.medications,
        prescription: {
          $id: scanResult.medications[0]?.prescriptionId || `reassigned_${Date.now()}`,
          reference_code: scanResult.medications[0]?.referenceCode || 'REASSIGNED',
          prescribed_by: 'Healthcare Provider',
          appointment_id: scanResult.medications[0]?.appointmentId
        },
        qrData: {
          appointmentId: scanResult.medications[0]?.appointmentId,
          referenceCode: scanResult.medications[0]?.referenceCode
        },
        securityValidated: true,
        patientVerified: true
      };

      const userId = currentUser.uid || currentUser.userId || currentUser.$id;

      switch (scanResult.action) {
        case 'add_all':
          await handleDirectAddAll(prescriptionResult, userId);
          break;
          
        case 'review_edit':
          await handlePrescriptionScanWithAction(prescriptionResult, userId, 'review_edit');
          break;
          
        default:
          await handlePrescriptionScanWithAction(prescriptionResult, userId, 'review_edit');
          break;
      }
      
    } catch (error) {
      console.error('🔍 Add Screen: Error processing reassigned medications:', error);
      Alert.alert(
        'Error',
        `Failed to process reassigned medications: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
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

      {/* Patient Selector Modal */}
      <PatientSelector
        visible={showPatientSelector}
        patients={availablePatients}
        onSelect={handlePatientReassignment}
        onCancel={() => {
          setShowPatientSelector(false);
          setPendingScanResult(null);
        }}
        pendingMedications={pendingScanResult}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <PageHeader onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Add Medication</Text>
          {/* 🔧 DEBUG: Show patient count and refresh button */}
          {currentUser && (
            <TouchableOpacity 
              style={styles.debugPatientButton}
              onPress={refreshPatients}
            >
              <Ionicons name="people-outline" size={16} color="#666" />
              <Text style={styles.debugPatientText}>{availablePatients.length}</Text>
            </TouchableOpacity>
          )}
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
    flex: 1,
  },
  debugPatientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  debugPatientText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#1a8e2d',
    borderRadius: 10,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
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

  // Patient Selector Styles
  patientSelectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  patientSelectorContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
  },
  patientSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  patientSelectorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  patientSelectorClose: {
    padding: 5,
  },
  patientSelectorSubtitle: {
    fontSize: 16,
    color: '#666',
    paddingHorizontal: 20,
    paddingVertical: 15,
    textAlign: 'center',
  },
  patientsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  patientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  patientAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  ownerAvatar: {
    backgroundColor: '#1a8e2d',
  },
  familyAvatar: {
    backgroundColor: '#2196F3',
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  patientType: {
    fontSize: 14,
    color: '#666',
  },
  patientSelectorFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  cancelPatientButton: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cancelPatientButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Empty state styles for PatientSelector
  noPatients: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noPatientsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    textAlign: 'center',
  },
  noPatientsSubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryPatientsButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#1a8e2d',
    borderRadius: 8,
  },
  retryPatientsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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