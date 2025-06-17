// app/profile/index.jsx - Fixed version with calendar, auto-email, and correct gender values
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator, 
  Modal,
  FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DatabaseService, AuthService, Query } from '../../configs/AppwriteConfig';
import { COLLECTIONS, COLORS, PROFILE_TYPES } from '../../constants';
import PageHeader from '../../components/PageHeader';
import MyKadScanner from '../../components/MyKadScanner';
import { secureOcrService, privacyGuidelines } from '../../service/secureOcrService';

// Malaysian Phone Number Input Component
const MalaysianPhoneInput = ({ 
  label, 
  value, 
  onChangeText, 
  isRequired = false 
}) => {
  const [displayValue, setDisplayValue] = useState(value || '');
  const [isValid, setIsValid] = useState(true);

  // Malaysian mobile prefixes
  const validPrefixes = ['010', '011', '012', '013', '014', '015', '016', '017', '018', '019'];
  
  const formatMalaysianPhone = (input) => {
    // Remove all non-digits
    let numbers = input.replace(/\D/g, '');
    
    // Handle different input scenarios
    if (numbers.startsWith('60')) {
      // Remove country code if user typed it
      numbers = numbers.substring(2);
    }
    
    if (numbers.startsWith('0')) {
      // Remove leading 0 for formatting
      numbers = numbers.substring(1);
    }
    
    // Limit to 9 digits after removing 0 (Malaysian mobile without 0 prefix)
    if (numbers.length > 9) {
      numbers = numbers.substring(0, 9);
    }
    
    let formatted = '';
    
    if (numbers.length > 0) {
      // Add first part (2 digits)
      formatted = numbers.substring(0, 2);
      
      if (numbers.length > 2) {
        // Add hyphen and next 3 digits
        formatted += '-' + numbers.substring(2, 5);
        
        if (numbers.length > 5) {
          // Add space and last 4 digits
          formatted += ' ' + numbers.substring(5);
        }
      }
      
      // Add back the 0 prefix for display
      formatted = '0' + formatted;
    }
    
    return formatted;
  };
  
  const validateMalaysianPhone = (phone) => {
    // Remove formatting for validation
    const numbers = phone.replace(/\D/g, '');
    
    if (numbers.length === 0) return true; // Allow empty
    
    // Check if it's 10 or 11 digits (01X-XXXX XXXX format)
    if (numbers.length < 10 || numbers.length > 11) return false;
    
    // Check if starts with valid Malaysian mobile prefix
    const prefix = numbers.substring(0, 3);
    return validPrefixes.includes(prefix);
  };
  
  const handleChange = (input) => {
    const formatted = formatMalaysianPhone(input);
    const valid = validateMalaysianPhone(formatted);
    
    setDisplayValue(formatted);
    setIsValid(valid);
    
    // Return cleaned number for storage (with +60 prefix)
    if (formatted) {
      const cleanNumbers = formatted.replace(/\D/g, '');
      const withCountryCode = '+60' + cleanNumbers.substring(1); // Remove 0 and add +60
      onChangeText(withCountryCode);
    } else {
      onChangeText('');
    }
  };

  // Format existing value on component mount
  useEffect(() => {
    if (value) {
      let phoneToFormat = value;
      // Remove +60 prefix for display formatting
      if (phoneToFormat.startsWith('+60')) {
        phoneToFormat = '0' + phoneToFormat.substring(3);
      }
      const formatted = formatMalaysianPhone(phoneToFormat);
      setDisplayValue(formatted);
      setIsValid(validateMalaysianPhone(formatted));
    }
  }, [value]);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label} {isRequired && <Text style={styles.required}>*</Text>}
      </Text>
      <View style={styles.phoneInputContainer}>
        <Text style={styles.countryCode}>🇲🇾 +60</Text>
        <TextInput
          style={[
            styles.phoneInput,
            !isValid && displayValue.length > 0 && styles.invalidInput
          ]}
          value={displayValue}
          onChangeText={handleChange}
          placeholder="12-345 6789"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          maxLength={12} // 01X-XXX XXXX format
        />
      </View>
      {!isValid && displayValue.length > 0 && (
        <Text style={styles.errorText}>
          Please enter a valid Malaysian mobile number (e.g., 012-345 6789)
        </Text>
      )}
      <Text style={styles.helperText}>
        Supported: Celcom, Digi, Maxis, U Mobile, etc.
      </Text>
    </View>
  );
};

// Calendar Picker Component
const CalendarPicker = ({ 
  label, 
  value, 
  onDateChange, 
  isRequired = false,
  maximumDate = new Date(),
  minimumDate
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);

  const handleDateChange = (event, date) => {
    setShowPicker(false);
    if (date) {
      setSelectedDate(date);
      // Format date as YYYY-MM-DD for consistency
      const formattedDate = date.toISOString().split('T')[0];
      onDateChange(formattedDate);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label} {isRequired && <Text style={styles.required}>*</Text>}
      </Text>
      <TouchableOpacity 
        style={styles.dateButton}
        onPress={() => setShowPicker(true)}
      >
        <Text style={[
          styles.dateText, 
          !value && styles.placeholderText
        ]}>
          {value ? formatDate(value) : 'Select date of birth'}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate || new Date('1900-01-01')}
        />
      )}
    </View>
  );
};

// Dropdown Component
const DropdownPicker = ({ 
  label, 
  value, 
  onValueChange, 
  options, 
  placeholder = "Select an option",
  isRequired = false 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleSelect = (selectedValue) => {
    onValueChange(selectedValue);
    setIsVisible(false);
  };

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label} {isRequired && <Text style={styles.required}>*</Text>}
      </Text>
      <TouchableOpacity 
        style={styles.dropdownButton}
        onPress={() => setIsVisible(true)}
      >
        <Text style={[
          styles.dropdownText, 
          !value && styles.dropdownPlaceholder
        ]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#6b7280" />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderText}>{label}</Text>
              <TouchableOpacity onPress={() => setIsVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownOption,
                    value === item.value && styles.selectedOption
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    value === item.value && styles.selectedOptionText
                  ]}>
                    {item.label}
                  </Text>
                  {value === item.value && (
                    <Ionicons name="checkmark" size={20} color="#0AD476" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// FIXED: Dropdown options with correct values that match database enum
const genderOptions = [
  { label: 'Male', value: 'Male' },       // Fixed: now matches database enum
  { label: 'Female', value: 'Female' }   // Fixed: now matches database enum
];

const bloodTypeOptions = [
  { label: 'A+', value: 'A+' },
  { label: 'A-', value: 'A-' },
  { label: 'B+', value: 'B+' },
  { label: 'B-', value: 'B-' },
  { label: 'AB+', value: 'AB+' },
  { label: 'AB-', value: 'AB-' },
  { label: 'O+', value: 'O+' },
  { label: 'O-', value: 'O-' }
];

const relationshipOptions = [
  { label: 'Parent', value: 'Parent' },
  { label: 'Child', value: 'Child' },
  { label: 'Spouse', value: 'Spouse' },
  { label: 'Sibling', value: 'Sibling' },
  { label: 'Grandparent', value: 'Grandparent' },
  { label: 'Grandchild', value: 'Grandchild' },
  { label: 'Other', value: 'Other' }
];

const identificationOptions = [
  { label: 'National ID', value: 'National ID' },
  { label: 'Passport', value: 'Passport' },
  { label: 'Driver\'s License', value: 'Driver\'s License' },
  { label: 'Birth Certificate', value: 'Birth Certificate' },
  { label: 'Other', value: 'Other' }
];

export default function PatientProfileScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  // Security states
  const [isSecurityInitialized, setIsSecurityInitialized] = useState(false);
  const [securityInitializing, setSecurityInitializing] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userConsent, setUserConsent] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  
  // Form state - Updated structure to match database schema exactly
  const [profile, setProfile] = useState({
    email: '',
    phoneNumber: '',
    userId: '',
    fullName: '',
    gender: '',
    birthDate: '',
    address: '',
    age: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    emergencyContactRelationship: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    allergies: '',
    currentMedication: '',
    familyMedicalHistory: '',
    pastMedicalHistory: '',
    bloodType: '',
    identificationType: '',
    identificationNumber: '',
    identificationDocumentId: '',
    profileType: PROFILE_TYPES.OWNER
  });

  // Initialize security and load profile
  useEffect(() => {
    const initializeProfileSecurity = async () => {
      try {
        setSecurityInitializing(true);
        
        console.log('Initializing profile security with full features...');
        
        // Initialize the secure OCR service
        await secureOcrService.initialize();
        setIsSecurityInitialized(true);
        
        console.log('Profile security initialized successfully');
        
        // Load current user and auto-fill email
        const user = await AuthService.getCurrentUser();
        setCurrentUser(user);
        
        // Auto-fill email and name from user account
        if (user) {
          setProfile(prev => ({
            ...prev, 
            email: user.email || '',
            fullName: user.name || prev.fullName, // Auto-fill name from account
            userId: user.$id
          }));
        }
        
        // Check if user has given consent for data processing
        if (user && privacyGuidelines.requireExplicitConsent) {
          const consent = await secureOcrService.checkUserConsent(user.$id);
          setUserConsent(consent);
          console.log('User consent status:', consent);
        }
        
      } catch (error) {
        console.error('Failed to initialize profile security:', error);
        Alert.alert(
          'Security Initialization Error',
          'Some security features may not work properly. The app will continue to function normally.',
          [{ text: 'OK' }]
        );
      } finally {
        setSecurityInitializing(false);
      }
    };

    initializeProfileSecurity();
  }, []);

  // Load existing profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const user = currentUser || await AuthService.getCurrentUser();
        
        if (user) {
          // Set user ID and email from account
          setProfile(prev => ({
            ...prev, 
            userId: user.$id,
            email: user.email || prev.email
          }));
          
          try {
            const response = await DatabaseService.listDocuments(
              COLLECTIONS.PATIENT_PROFILES,
              [
                Query.equal('userId', user.$id),
                Query.equal('profileType', PROFILE_TYPES.OWNER)
              ],
              1
            );
            
            if (response.documents.length > 0) {
              const patientData = response.documents[0];
              
              // Map the data properly, handling array fields correctly
              setProfile({
                email: user.email || patientData.email || '',  // Always use account email
                phoneNumber: patientData.phoneNumber || '',
                userId: patientData.userId || user.$id,
                fullName: patientData.fullName || user.name || '',  // Use profile name or fallback to account name
                gender: patientData.gender || '',
                birthDate: patientData.birthDate || '',
                address: patientData.address || '',
                age: patientData.age || '',
                emergencyContactName: patientData.emergencyContactName || '',
                emergencyContactNumber: patientData.emergencyContactNumber || '',
                emergencyContactRelationship: Array.isArray(patientData.emergencyContactRelationship) 
                  ? patientData.emergencyContactRelationship[0] || ''
                  : patientData.emergencyContactRelationship || '',
                insuranceProvider: patientData.insuranceProvider || '',
                insurancePolicyNumber: patientData.insurancePolicyNumber || '',
                allergies: patientData.allergies || '',
                currentMedication: patientData.currentMedication || '',
                familyMedicalHistory: patientData.familyMedicalHistory || '',
                pastMedicalHistory: patientData.pastMedicalHistory || '',
                bloodType: Array.isArray(patientData.bloodType) 
                  ? patientData.bloodType[0] || ''
                  : patientData.bloodType || '',
                identificationType: patientData.identificationType || '',
                identificationNumber: patientData.identificationNumber || '',
                identificationDocumentId: patientData.identificationDocumentId || '',
                profileType: patientData.profileType || PROFILE_TYPES.OWNER
              });
            }
          } catch (error) {
            console.error('Error loading profile:', error);
          }
        }
      } catch (error) {
        console.error('Error in auth:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!securityInitializing) {
      loadProfile();
    }
  }, [securityInitializing, currentUser]);

  // Handle consent dialog
  const handleConsentAccept = async () => {
    try {
      if (currentUser) {
        await secureOcrService.recordUserConsent(currentUser.$id, {
          purpose: 'MyKad information extraction for clinic registration',
          dataTypes: privacyGuidelines.allowedFields,
          retentionPeriod: privacyGuidelines.dataRetentionDays
        });
        setUserConsent(true);
        setShowConsentDialog(false);
        setShowScanner(true);
      }
    } catch (error) {
      console.error('Failed to record consent:', error);
      Alert.alert('Error', 'Failed to record consent. Please try again.');
    }
  };

  const handleConsentDecline = () => {
    setShowConsentDialog(false);
    Alert.alert(
      'Consent Required',
      'MyKad scanning requires your consent to process personal data. You can enter information manually instead.',
      [{ text: 'OK' }]
    );
  };

  // Handle secure MyKad scanning
  const handleMyKadScanPress = async () => {
    try {
      if (!isSecurityInitialized) {
        Alert.alert('Security Not Ready', 'Security features are still initializing. Please wait a moment.');
        return;
      }

      if (privacyGuidelines.requireAuthentication && !currentUser) {
        Alert.alert('Authentication Required', 'Please log in to use MyKad scanning features.');
        return;
      }

      if (privacyGuidelines.requireExplicitConsent && !userConsent) {
        setShowConsentDialog(true);
        return;
      }

      setShowScanner(true);
    } catch (error) {
      console.error('Error opening MyKad scanner:', error);
      Alert.alert('Error', 'Failed to open MyKad scanner. Please try again.');
    }
  };

  // Enhanced OCR data extraction with security
  const handleOCRDataExtracted = async (extractedData) => {
    try {
      console.log('Secure OCR Data received:', extractedData);
      
      // Filter the data according to privacy guidelines
      const filteredData = secureOcrService.filterSensitiveData(extractedData);
      console.log('Filtered OCR data:', filteredData);
      
      // Pre-fill form with filtered extracted data
      setProfile(prev => ({
        ...prev,
        identificationNumber: filteredData.icNumber || prev.identificationNumber,
        fullName: filteredData.name || prev.fullName,
        birthDate: filteredData.dateOfBirth || prev.birthDate,
        gender: filteredData.gender || prev.gender,
        address: filteredData.address || prev.address,
        age: filteredData.age || prev.age,
        identificationType: filteredData.icNumber ? 'National ID' : prev.identificationType
      }));

      Alert.alert(
        'Information Extracted Securely!', 
        'Your MyKad information has been extracted and processed according to privacy guidelines. Please verify the information and complete any missing fields.',
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error processing extracted data:', error);
      Alert.alert('Error', 'Failed to process extracted data. Please try manual entry.');
    }
  };

  // Handle form field changes
  const handleChange = (field, value) => {
    setProfile(prev => ({...prev, [field]: value}));
  };

  // Calculate age when birth date changes
  useEffect(() => {
    if (profile.birthDate) {
      const birthDate = new Date(profile.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      setProfile(prev => ({ ...prev, age: age.toString() }));
    }
  }, [profile.birthDate]);

  // Validation function
  const validateForm = () => {
    const requiredFields = {
      fullName: 'Full Name',
      email: 'Email',
      phoneNumber: 'Phone Number',
      gender: 'Gender'
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      if (!profile[field]?.trim()) {
        Alert.alert('Missing Information', `${label} is required.`);
        return false;
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profile.email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }

    // Malaysian phone number validation
    if (profile.phoneNumber) {
      const phoneRegex = /^\+60(10|11|12|13|14|15|16|17|18|19)\d{7,8}$/;
      if (!phoneRegex.test(profile.phoneNumber)) {
        Alert.alert('Invalid Phone Number', 'Please enter a valid Malaysian mobile number.');
        return false;
      }
    }

    // Emergency contact phone validation (optional but must be valid if provided)
    if (profile.emergencyContactNumber && profile.emergencyContactNumber.trim()) {
      const phoneRegex = /^\+60(10|11|12|13|14|15|16|17|18|19)\d{7,8}$/;
      if (!phoneRegex.test(profile.emergencyContactNumber)) {
        Alert.alert('Invalid Emergency Contact Number', 'Please enter a valid Malaysian mobile number for emergency contact.');
        return false;
      }
    }

    return true;
  };

  // Save handler with proper data structure
  const handleSave = async () => {
    try {
      if (!validateForm()) return;
      
      setIsSaving(true);
      
      const user = currentUser || await AuthService.getCurrentUser();
      
      if (user) {
        // Prepare data with proper structure matching database schema exactly
        const dataToSave = {
          email: profile.email,
          phoneNumber: profile.phoneNumber,
          userId: user.$id,
          fullName: profile.fullName,
          gender: profile.gender,  // This should now be "Male" or "Female"
          birthDate: profile.birthDate,
          address: profile.address,
          age: profile.age,
          emergencyContactName: profile.emergencyContactName,
          emergencyContactNumber: profile.emergencyContactNumber,
          emergencyContactRelationship: profile.emergencyContactRelationship ? [profile.emergencyContactRelationship] : [],
          insuranceProvider: profile.insuranceProvider,
          insurancePolicyNumber: profile.insurancePolicyNumber,
          allergies: profile.allergies,
          currentMedication: profile.currentMedication,
          familyMedicalHistory: profile.familyMedicalHistory,
          pastMedicalHistory: profile.pastMedicalHistory,
          bloodType: profile.bloodType ? [profile.bloodType] : [],
          identificationType: profile.identificationType,
          identificationNumber: profile.identificationNumber,
          identificationDocumentId: profile.identificationDocumentId || '',
          profileType: PROFILE_TYPES.OWNER
        };
        
        console.log('Saving profile data:', dataToSave);
        
        // Check if profile exists
        const response = await DatabaseService.listDocuments(
          COLLECTIONS.PATIENT_PROFILES,
          [
            Query.equal('userId', user.$id),
            Query.equal('profileType', PROFILE_TYPES.OWNER)
          ],
          1
        );
        
        if (response.documents.length > 0) {
          // Update existing profile
          await DatabaseService.updateDocument(
            COLLECTIONS.PATIENT_PROFILES,
            response.documents[0].$id,
            dataToSave
          );
          
          // Log profile update for audit
          if (isSecurityInitialized) {
            await secureOcrService.logAccess(user.$id, 'profile_updated', {
              profileId: response.documents[0].$id
            });
          }
          
          Alert.alert('Success', 'Your profile has been updated.');
        } else {
          // Create new profile
          const newProfile = await DatabaseService.createDocument(
            COLLECTIONS.PATIENT_PROFILES,
            dataToSave
          );
          
          // Log profile creation for audit
          if (isSecurityInitialized) {
            await secureOcrService.logAccess(user.$id, 'profile_created', {
              profileId: newProfile.$id
            });
          }
          
          Alert.alert('Success', 'Your profile has been created.');
        }
        
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile: ' + error.message);
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate profile completion
  const getProfileCompletion = () => {
    const requiredFields = ['email', 'phoneNumber', 'fullName', 'gender'];
    const optionalFields = [
      'birthDate', 'address', 'age', 'emergencyContactName', 'emergencyContactNumber',
      'emergencyContactRelationship', 'allergies', 'currentMedication', 'bloodType',
      'insuranceProvider', 'insurancePolicyNumber', 'identificationType', 'identificationNumber'
    ];
    
    const filledRequired = requiredFields.filter(field => profile[field]?.trim()).length;
    const filledOptional = optionalFields.filter(field => profile[field]?.trim()).length;
    
    const requiredWeight = 0.7;
    const optionalWeight = 0.3;
    
    const requiredCompletion = (filledRequired / requiredFields.length) * requiredWeight;
    const optionalCompletion = (filledOptional / optionalFields.length) * optionalWeight;
    
    return Math.round((requiredCompletion + optionalCompletion) * 100);
  };

  // Render consent dialog
  const renderConsentDialog = () => (
    <Modal visible={showConsentDialog} transparent={true} animationType="slide">
      <View style={styles.consentOverlay}>
        <View style={styles.consentContainer}>
          <Ionicons name="shield-checkmark" size={48} color="#0AD476" style={styles.consentIcon} />
          <Text style={styles.consentTitle}>Data Processing Consent</Text>
          <Text style={styles.consentText}>
            To scan your MyKad, we need your consent to process the following information:
          </Text>
          <View style={styles.consentFields}>
            {privacyGuidelines.allowedFields.map((field, index) => (
              <Text key={index} style={styles.consentField}>
                • {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </Text>
            ))}
          </View>
          <Text style={styles.consentDetails}>
            Your data will be processed securely and retained for {privacyGuidelines.dataRetentionDays} days in compliance with PDPA regulations.
          </Text>
          <View style={styles.consentButtons}>
            <TouchableOpacity style={styles.declineButton} onPress={handleConsentDecline}>
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptButton} onPress={handleConsentAccept}>
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render security status indicator
  const renderSecurityStatus = () => {
    if (securityInitializing) {
      return (
        <View style={styles.securityStatus}>
          <ActivityIndicator size="small" color="#0AD476" />
          <Text style={styles.securityStatusText}>Initializing security...</Text>
        </View>
      );
    }

    return (
      <View style={styles.securityStatus}>
        <Ionicons 
          name={isSecurityInitialized ? "shield-checkmark" : "shield-outline"} 
          size={16} 
          color={isSecurityInitialized ? "#0AD476" : "#FF6B6B"} 
        />
        <Text style={[
          styles.securityStatusText, 
          { color: isSecurityInitialized ? "#0AD476" : "#FF6B6B" }
        ]}>
          {isSecurityInitialized ? "Security Active" : "Security Error"}
        </Text>
        {isSecurityInitialized && userConsent && (
          <>
            <Text style={styles.securityDivider}> • </Text>
            <Text style={styles.consentStatus}>PDPA Compliant</Text>
          </>
        )}
      </View>
    );
  };

  const completion = getProfileCompletion();
  
  if (isLoading || securityInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {securityInitializing ? 'Initializing security...' : 'Loading your profile...'}
        </Text>
      </View>
    );
  }
  
  return (
    <>
      {renderConsentDialog()}
      <View style={styles.container}>
        <View style={{ marginTop: 50 }}>
          <PageHeader title="Patient Profile" onPress={() => router.back()} />
        </View>
      
        {/* Completion indicator */}
        <View style={styles.completionContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBar, { width: `${completion}%` }]} />
          </View>
          <Text style={styles.completionText}>Profile {completion}% complete</Text>
        </View>

        {/* Secure OCR Scanner Button */}
        <TouchableOpacity
          style={[
            styles.scanButton,
            (!isSecurityInitialized || securityInitializing) && styles.scanButtonDisabled
          ]}
          onPress={handleMyKadScanPress}
          disabled={!isSecurityInitialized || securityInitializing}
        >
          <Ionicons name="scan" size={24} color="white" />
          <Text style={styles.scanButtonText}>
            {!isSecurityInitialized ? 'Security Initializing...' : 'Scan MyKad to Auto-Fill (Secure)'}
          </Text>
        </TouchableOpacity>

        {/* Security Status */}
        {renderSecurityStatus()}
      
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={profile.fullName}
              placeholder="Name from your account"
              editable={false}
              placeholderTextColor="#999"
            />
            <Text style={styles.helperText}>Name is automatically filled from your account</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={profile.email}
              placeholder="Email from your account"
              editable={false}
              placeholderTextColor="#999"
            />
            <Text style={styles.helperText}>Email is automatically filled from your account</Text>
          </View>
          
          <MalaysianPhoneInput
            label="Phone Number"
            value={profile.phoneNumber}
            onChangeText={(text) => handleChange('phoneNumber', text)}
            isRequired={true}
          />
          
          <DropdownPicker
            label="Gender"
            value={profile.gender}
            onValueChange={(value) => handleChange('gender', value)}
            options={genderOptions}
            placeholder="Select gender"
            isRequired={true}
          />
          
          <CalendarPicker
            label="Date of Birth"
            value={profile.birthDate}
            onDateChange={(date) => handleChange('birthDate', date)}
            isRequired={false}
            maximumDate={new Date()}
            minimumDate={new Date('1900-01-01')}
          />
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={profile.age}
              placeholder="Auto-calculated from birth date"
              placeholderTextColor="#999"
              editable={false}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={profile.address}
              onChangeText={(text) => handleChange('address', text)}
              placeholder="Enter your full address"
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
          </View>
          
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Name</Text>
            <TextInput
              style={styles.input}
              value={profile.emergencyContactName}
              onChangeText={(text) => handleChange('emergencyContactName', text)}
              placeholder="Emergency contact name"
              placeholderTextColor="#999"
            />
          </View>
          
          <MalaysianPhoneInput
            label="Contact Phone"
            value={profile.emergencyContactNumber}
            onChangeText={(text) => handleChange('emergencyContactNumber', text)}
            isRequired={false}
          />
          
          <DropdownPicker
            label="Relationship"
            value={profile.emergencyContactRelationship}
            onValueChange={(value) => handleChange('emergencyContactRelationship', value)}
            options={relationshipOptions}
            placeholder="Select relationship"
          />
          
          <Text style={styles.sectionTitle}>Medical Information</Text>
          
          <DropdownPicker
            label="Blood Type"
            value={profile.bloodType}
            onValueChange={(value) => handleChange('bloodType', value)}
            options={bloodTypeOptions}
            placeholder="Select blood type"
          />
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Allergies</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={profile.allergies}
              onChangeText={(text) => handleChange('allergies', text)}
              placeholder="List any allergies you have"
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Medications</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={profile.currentMedication}
              onChangeText={(text) => handleChange('currentMedication', text)}
              placeholder="List current medications"
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Past Medical History</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={profile.pastMedicalHistory}
              onChangeText={(text) => handleChange('pastMedicalHistory', text)}
              placeholder="Any past medical conditions or procedures"
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Family Medical History</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={profile.familyMedicalHistory}
              onChangeText={(text) => handleChange('familyMedicalHistory', text)}
              placeholder="Any relevant family medical history"
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
          </View>
          
          <Text style={styles.sectionTitle}>Insurance Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Insurance Provider</Text>
            <TextInput
              style={styles.input}
              value={profile.insuranceProvider}
              onChangeText={(text) => handleChange('insuranceProvider', text)}
              placeholder="Your insurance provider"
              placeholderTextColor="#999"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Policy Number</Text>
            <TextInput
              style={styles.input}
              value={profile.insurancePolicyNumber}
              onChangeText={(text) => handleChange('insurancePolicyNumber', text)}
              placeholder="Your insurance policy number"
              placeholderTextColor="#999"
            />
          </View>
          
          <Text style={styles.sectionTitle}>Identification</Text>
          
          <DropdownPicker
            label="ID Type"
            value={profile.identificationType}
            onValueChange={(value) => handleChange('identificationType', value)}
            options={identificationOptions}
            placeholder="Select ID type"
          />
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ID Number</Text>
            <TextInput
              style={styles.input}
              value={profile.identificationNumber}
              onChangeText={(text) => handleChange('identificationNumber', text)}
              placeholder="Your ID number"
              placeholderTextColor="#999"
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save Profile</Text>
            )}
          </TouchableOpacity>
          
          {/* Add some bottom padding for better scrolling */}
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Enhanced MyKad Scanner Modal with Security */}
        <MyKadScanner
          visible={showScanner}
          onDataExtracted={handleOCRDataExtracted}
          onClose={() => setShowScanner(false)}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  completionContainer: {
    padding: 15,
    backgroundColor: '#f9fafb',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0AD476',
  },
  completionText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'right',
  },
  scanButton: {
    backgroundColor: '#0AD476',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 5,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scanButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  securityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 5,
  },
  securityStatusText: {
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '500',
  },
  securityDivider: {
    fontSize: 12,
    color: '#9ca3af',
    marginHorizontal: 5,
  },
  consentStatus: {
    fontSize: 12,
    color: '#0AD476',
    fontWeight: '500',
  },
  form: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 16,
    color: '#374151',
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#0AD476',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#4b5563',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  countryCode: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  invalidInput: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dateText: {
    fontSize: 16,
    color: '#111827',
  },
  placeholderText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dropdownText: {
    fontSize: 16,
    color: '#111827',
  },
  dropdownPlaceholder: {
    color: '#9ca3af',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    margin: 20,
    maxHeight: '60%',
    width: '80%',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  selectedOption: {
    backgroundColor: '#E8F8F5',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: '#0AD476',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#0AD476',
    paddingVertical: 14,
    borderRadius: 8,
    marginVertical: 30,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  // Consent Dialog Styles
  consentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  consentContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  consentIcon: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  consentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  consentText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    lineHeight: 22,
  },
  consentFields: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  consentField: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  consentDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
    lineHeight: 18,
  },
  consentButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
  },
  declineButtonText: {
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#0AD476',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  acceptButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
});