// app/profile/index.jsx - Enhanced with Security
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
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService, AuthService, Query } from '../../configs/AppwriteConfig';
import { COLLECTIONS, COLORS } from '../../constants';
import PageHeader from '../../components/PageHeader';
import MyKadScanner from '../../components/MyKadScanner';
import { secureOcrService, privacyGuidelines } from '../../service/secureOcrService';

// List of blood types for dropdown
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

// List of genders for dropdown
const GENDERS = ["Male", "Female"];

// List of ID types for dropdown
const ID_TYPES = ["National ID", "Passport", "Driver's License", "Other"];

// List of relationship types for dropdown
const RELATIONSHIPS = ["Parent", "Spouse", "Sibling", "Child", "Friend", "Other"];

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
  
  // Form state
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
    emergencyContactRelationship: [],
    insuranceProvider: '',
    insurancePolicyNumber: '',
    allergies: '',
    currentMedication: '',
    familyMedicalHistory: '',
    pastMedicalHistory: '',
    bloodType: [],
    identificationType: '',
    identificationNumber: '',
    identificationDocumentId: ''
  });

  // Your existing dropdown states
  const [selectedBloodType, setSelectedBloodType] = useState(null);
  const [selectedGender, setSelectedGender] = useState(null);
  const [selectedIDType, setSelectedIDType] = useState(null);
  const [selectedRelationship, setSelectedRelationship] = useState(null);
  const [showBloodTypeDropdown, setShowBloodTypeDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showIDTypeDropdown, setShowIDTypeDropdown] = useState(false);
  const [showRelationshipDropdown, setShowRelationshipDropdown] = useState(false);
  
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
        
        // Load current user
        const user = await AuthService.getCurrentUser();
        setCurrentUser(user);
        
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

  // Load existing profile (your existing code)
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const user = currentUser || await AuthService.getCurrentUser();
        
        if (user) {
          setProfile(prev => ({...prev, userId: user.$id}));
          
          try {
            const response = await DatabaseService.listDocuments(
              COLLECTIONS.PATIENT_PROFILES,
              [Query.equal('userId', user.$id)],
              1
            );
            
            if (response.documents.length > 0) {
              const patientData = response.documents[0];
              setProfile(patientData);
              
              // Set dropdown selections based on existing data
              if (patientData.bloodType && patientData.bloodType.length > 0) {
                setSelectedBloodType(patientData.bloodType[0]);
              }
              if (patientData.gender) {
                setSelectedGender(patientData.gender === 'male' ? 'Male' : 'Female');
              }
              if (patientData.identificationType) {
                setSelectedIDType(patientData.identificationType);
              }
              if (patientData.emergencyContactRelationship && 
                  patientData.emergencyContactRelationship.length > 0) {
                setSelectedRelationship(patientData.emergencyContactRelationship[0]);
              }
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
      }));

      // Update gender dropdown
      if (filteredData.gender) {
        setSelectedGender(filteredData.gender === 'male' ? 'Male' : 'Female');
      }

      // Set ID type to National ID if IC number is extracted
      if (filteredData.icNumber) {
        setSelectedIDType('National ID');
        setProfile(prev => ({...prev, identificationType: 'National ID'}));
      }

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

  // Your existing handler functions
  const handleChange = (field, value) => {
    setProfile(prev => ({...prev, [field]: value}));
  };
  
  const handleBloodTypeSelect = (type) => {
    setSelectedBloodType(type);
    setProfile(prev => ({...prev, bloodType: [type]}));
    setShowBloodTypeDropdown(false);
  };
  
  const handleGenderSelect = (gender) => {
    setSelectedGender(gender);
    setProfile(prev => ({...prev, gender: gender.toLowerCase()}));
    setShowGenderDropdown(false);
  };
  
  const handleIDTypeSelect = (type) => {
    setSelectedIDType(type);
    setProfile(prev => ({...prev, identificationType: type}));
    setShowIDTypeDropdown(false);
  };
  
  const handleRelationshipSelect = (relationship) => {
    setSelectedRelationship(relationship);
    setProfile(prev => ({...prev, emergencyContactRelationship: [relationship]}));
    setShowRelationshipDropdown(false);
  };
  
  // Your existing save handler with audit logging
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      if (!profile.email || !profile.phoneNumber || !profile.fullName || !profile.userId) {
        Alert.alert('Missing Information', 'Please fill in all required fields (email, phone number, full name).');
        setIsSaving(false);
        return;
      }

      if (profile.gender && profile.gender !== 'male' && profile.gender !== 'female') {
        setProfile(prev => ({...prev, gender: prev.gender.toLowerCase()}));
      }
      
      const user = currentUser || await AuthService.getCurrentUser();
      
      if (user) {
        const dataToSave = {
          ...profile,
          userId: user.$id
        };
        
        const response = await DatabaseService.listDocuments(
          COLLECTIONS.PATIENT_PROFILES,
          [Query.equal('userId', user.$id)],
          1
        );
        
        if (response.documents.length > 0) {
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

  // Your existing completion calculation
  const getProfileCompletion = () => {
    const requiredFields = ['email', 'phoneNumber', 'fullName', 'gender', 'birthDate', 'address'];
    const semiImportantFields = ['emergencyContactName', 'emergencyContactNumber', 'emergencyContactRelationship'];
    const optionalFields = [
      'age', 'allergies', 'currentMedication', 'bloodType',
      'insuranceProvider', 'insurancePolicyNumber',
      'identificationType', 'identificationNumber'
    ];
    
    const filledRequired = requiredFields.filter(field => {
      if (Array.isArray(profile[field])) {
        return profile[field].length > 0;
      }
      return profile[field]?.trim?.();
    }).length;
    
    const filledSemiImportant = semiImportantFields.filter(field => {
      if (Array.isArray(profile[field])) {
        return profile[field].length > 0;
      }
      return profile[field]?.trim?.();
    }).length;
    
    const filledOptional = optionalFields.filter(field => {
      if (Array.isArray(profile[field])) {
        return profile[field].length > 0;
      }
      return profile[field]?.trim?.();
    }).length;
    
    const requiredWeight = 0.6;
    const semiImportantWeight = 0.25;
    const optionalWeight = 0.15;
    
    const requiredCompletion = (filledRequired / requiredFields.length) * requiredWeight;
    const semiImportantCompletion = (filledSemiImportant / semiImportantFields.length) * semiImportantWeight;
    const optionalCompletion = (filledOptional / optionalFields.length) * optionalWeight;
    
    return Math.round((requiredCompletion + semiImportantCompletion + optionalCompletion) * 100);
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
      
      <ScrollView style={styles.form}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={profile.fullName}
            onChangeText={(text) => handleChange('fullName', text)}
            placeholder="Enter your full name"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={profile.email}
            onChangeText={(text) => handleChange('email', text)}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={profile.phoneNumber}
            onChangeText={(text) => handleChange('phoneNumber', text)}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
          />
        </View>
        
        {/* Gender Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => setShowGenderDropdown(!showGenderDropdown)}
          >
            <Text style={selectedGender ? styles.dropdownSelectedText : styles.dropdownPlaceholder}>
              {selectedGender || "Select gender"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6b7280" />
          </TouchableOpacity>
          
          {showGenderDropdown && (
            <View style={styles.dropdownList}>
              {GENDERS.map((gender) => (
                <TouchableOpacity 
                  key={gender}
                  style={styles.dropdownItem}
                  onPress={() => handleGenderSelect(gender)}
                >
                  <Text style={styles.dropdownItemText}>{gender}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date of Birth <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={profile.birthDate}
            onChangeText={(text) => handleChange('birthDate', text)}
            placeholder="DD/MM/YYYY"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            value={profile.age}
            onChangeText={(text) => handleChange('age', text)}
            placeholder="Your age"
            keyboardType="number-pad"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={profile.address}
            onChangeText={(text) => handleChange('address', text)}
            placeholder="Enter your full address"
            multiline
            numberOfLines={3}
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
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contact Phone</Text>
          <TextInput
            style={styles.input}
            value={profile.emergencyContactNumber}
            onChangeText={(text) => handleChange('emergencyContactNumber', text)}
            placeholder="Emergency contact phone"
            keyboardType="phone-pad"
          />
        </View>
        
        {/* Relationship Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Relationship</Text>
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => setShowRelationshipDropdown(!showRelationshipDropdown)}
          >
            <Text style={selectedRelationship ? styles.dropdownSelectedText : styles.dropdownPlaceholder}>
              {selectedRelationship || "Select relationship"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6b7280" />
          </TouchableOpacity>
          
          {showRelationshipDropdown && (
            <View style={styles.dropdownList}>
              {RELATIONSHIPS.map((relationship) => (
                <TouchableOpacity 
                  key={relationship}
                  style={styles.dropdownItem}
                  onPress={() => handleRelationshipSelect(relationship)}
                >
                  <Text style={styles.dropdownItemText}>{relationship}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        <Text style={styles.sectionTitle}>Medical Information</Text>
        
        {/* Blood Type Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Blood Type</Text>
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => setShowBloodTypeDropdown(!showBloodTypeDropdown)}
          >
            <Text style={selectedBloodType ? styles.dropdownSelectedText : styles.dropdownPlaceholder}>
              {selectedBloodType || "Select blood type"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6b7280" />
          </TouchableOpacity>
          
          {showBloodTypeDropdown && (
            <View style={styles.dropdownList}>
              {BLOOD_TYPES.map((type) => (
                <TouchableOpacity 
                  key={type}
                  style={styles.dropdownItem}
                  onPress={() => handleBloodTypeSelect(type)}
                >
                  <Text style={styles.dropdownItemText}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Allergies</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={profile.allergies}
            onChangeText={(text) => handleChange('allergies', text)}
            placeholder="List any allergies you have"
            multiline
            numberOfLines={3}
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
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Policy Number</Text>
          <TextInput
            style={styles.input}
            value={profile.insurancePolicyNumber}
            onChangeText={(text) => handleChange('insurancePolicyNumber', text)}
            placeholder="Your insurance policy number"
          />
        </View>
        
        <Text style={styles.sectionTitle}>Identification</Text>
        
        {/* ID Type Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>ID Type</Text>
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => setShowIDTypeDropdown(!showIDTypeDropdown)}
          >
            <Text style={selectedIDType ? styles.dropdownSelectedText : styles.dropdownPlaceholder}>
              {selectedIDType || "Select ID type"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6b7280" />
          </TouchableOpacity>
          
          {showIDTypeDropdown && (
            <View style={styles.dropdownList}>
              {ID_TYPES.map((type) => (
                <TouchableOpacity 
                  key={type}
                  style={styles.dropdownItem}
                  onPress={() => handleIDTypeSelect(type)}
                >
                  <Text style={styles.dropdownItemText}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>ID Number</Text>
          <TextInput
            style={styles.input}
            value={profile.identificationNumber}
            onChangeText={(text) => handleChange('identificationNumber', text)}
            placeholder="Your ID number"
          />
        </View>
        
        <TouchableOpacity 
          style={styles.saveButton}
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
    color: '#374151',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownPlaceholder: {
    color: '#9ca3af',
    fontSize: 16,
  },
  dropdownSelectedText: {
    color: '#111827',
    fontSize: 16,
  },
  dropdownList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: 'white',
    maxHeight: 200,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#374151',
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