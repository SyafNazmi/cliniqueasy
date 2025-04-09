import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService, AuthService, Query } from '../../configs/AppwriteConfig';
import { COLLECTIONS, COLORS } from '../../constants';
import PageHeader from '../../components/PageHeader';

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
  
  // Form state - matches exactly your Appwrite schema
  const [profile, setProfile] = useState({
    // Personal Information
    email: '',
    phoneNumber: '',
    userId: '',
    fullName: '',
    gender: '',
    birthDate: '',
    address: '',
    age: '',
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactNumber: '',
    emergencyContactRelationship: [],
    
    // Insurance
    insuranceProvider: '',
    insurancePolicyNumber: '',
    
    // Medical Information
    allergies: '',
    currentMedication: '',
    familyMedicalHistory: '',
    pastMedicalHistory: '',
    bloodType: [],
    
    // Identification
    identificationType: '',
    identificationNumber: '',
    identificationDocumentId: ''
  });

  // Selected dropdown items state
  const [selectedBloodType, setSelectedBloodType] = useState(null);
  const [selectedGender, setSelectedGender] = useState(null);
  const [selectedIDType, setSelectedIDType] = useState(null);
  const [selectedRelationship, setSelectedRelationship] = useState(null);
  
  // UI state
  const [showBloodTypeDropdown, setShowBloodTypeDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showIDTypeDropdown, setShowIDTypeDropdown] = useState(false);
  const [showRelationshipDropdown, setShowRelationshipDropdown] = useState(false);
  
  // Load existing profile if available
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const currentUser = await AuthService.getCurrentUser();
        
        if (currentUser) {
          // Set the userId in the profile
          setProfile(prev => ({...prev, userId: currentUser.$id}));
          
          // Check if profile exists
          try {
            const response = await DatabaseService.listDocuments(
              COLLECTIONS.PATIENT_PROFILES,
              [Query.equal('userId', currentUser.$id)],
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
                setSelectedGender(patientData.gender);
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
    
    loadProfile();
  }, []);
  
  const handleChange = (field, value) => {
    setProfile(prev => ({...prev, [field]: value}));
  };
  
  const handleBloodTypeSelect = (type) => {
    setSelectedBloodType(type);
    setProfile(prev => ({...prev, bloodType: [type]}));
    setShowBloodTypeDropdown(false);
  };
  
  const handleGenderSelect = (gender) => {
    setSelectedGender(gender); // Keep the display value with capitalization
    setProfile(prev => ({...prev, gender: gender.toLowerCase()})); // Convert to lowercase for the database
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
  
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Validation for required fields based on your schema
      if (!profile.email || !profile.phoneNumber || !profile.fullName || !profile.userId) {
        Alert.alert('Missing Information', 'Please fill in all required fields (email, phone number, full name).');
        setIsSaving(false);
        return;
      }

      // Ensure gender is in correct format
      if (profile.gender && profile.gender !== 'male' && profile.gender !== 'female') {
        // If gender is not in the correct format, default to 'other' or convert as appropriate
        setProfile(prev => ({...prev, gender: prev.gender.toLowerCase()}));
      }
      
      const currentUser = await AuthService.getCurrentUser();
      
      if (currentUser) {
        // Double check userId is set correctly
        const dataToSave = {
          ...profile,
          userId: currentUser.$id
        };
        
        // Check if profile exists first
        const response = await DatabaseService.listDocuments(
          COLLECTIONS.PATIENT_PROFILES,
          [Query.equal('userId', currentUser.$id)],
          1
        );
        
        if (response.documents.length > 0) {
          // Update existing profile
          await DatabaseService.updateDocument(
            COLLECTIONS.PATIENT_PROFILES,
            response.documents[0].$id,
            dataToSave
          );
          
          Alert.alert('Success', 'Your profile has been updated.');
        } else {
          // Create new profile
          await DatabaseService.createDocument(
            COLLECTIONS.PATIENT_PROFILES,
            dataToSave
          );
          
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
  
  // Calculate profile completion percentage
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
    
    const requiredWeight = 0.6; // Required fields are 60% of completion
    const semiImportantWeight = 0.25; // Semi-important fields are 25% of completion
    const optionalWeight = 0.15; // Optional fields are 15% of completion
    
    const requiredCompletion = (filledRequired / requiredFields.length) * requiredWeight;
    const semiImportantCompletion = (filledSemiImportant / semiImportantFields.length) * semiImportantWeight;
    const optionalCompletion = (filledOptional / optionalFields.length) * optionalWeight;
    
    return Math.round((requiredCompletion + semiImportantCompletion + optionalCompletion) * 100);
  };
  
  const completion = getProfileCompletion();
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }
  
  return (
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
    </View>
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
});