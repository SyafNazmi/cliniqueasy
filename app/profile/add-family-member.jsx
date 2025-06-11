import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DatabaseService, account } from '@/configs/AppwriteConfig';
import { COLLECTIONS } from '@/constants';

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
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label} {isRequired && <Text style={styles.required}>*</Text>}
      </Text>
      <TouchableOpacity 
        style={styles.dropdownButton}
        onPress={() => setIsVisible(true)}
      >
        <Text style={[
          styles.dropdownText, 
          !value && styles.placeholderText
        ]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#666" />
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
      onDateChange(date.toISOString().split('T')[0]);
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
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
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
          {value ? formatDate(value) : 'Select date'}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#666" />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      )}
    </View>
  );
};

export default function AddFamilyMember() {
  const router = useRouter();
  const { editMemberId } = useLocalSearchParams();
  const isEditing = !!editMemberId;

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    gender: '',
    birthDate: '',
    age: '',
    address: '',
    bloodType: '',
    allergies: '',
    currentMedication: '',
    familyMedicalHistory: '',
    pastMedicalHistory: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    emergencyContactRelationship: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    identificationType: '',
    identificationNumber: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Dropdown options
  const genderOptions = [
  { label: 'Male', value: 'male' },     // Display "Male" but save "male"
  { label: 'Female', value: 'female' }, // Display "Female" but save "female"
];;

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
    { label: 'Aunt/Uncle', value: 'Aunt/Uncle' },
    { label: 'Cousin', value: 'Cousin' },
    { label: 'Friend', value: 'Friend' },
    { label: 'Guardian', value: 'Guardian' },
    { label: 'Other', value: 'Other' }
  ];

  const identificationOptions = [
    { label: 'National ID', value: 'National ID' },
    { label: 'Passport', value: 'Passport' },
    { label: 'Driver\'s License', value: 'Driver\'s License' },
    { label: 'Birth Certificate', value: 'Birth Certificate' },
    { label: 'Other', value: 'Other' }
  ];

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    if (formData.birthDate) {
      calculateAge();
    }
  }, [formData.birthDate]);

  const initializeData = async () => {
    try {
      const user = await account.get();
      setCurrentUser(user);

      if (isEditing) {
        await loadMemberData();
      }
    } catch (error) {
      console.error('Error initializing data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load data.',
      });
    }
  };

  const loadMemberData = async () => {
    try {
      setIsLoading(true);
      const member = await DatabaseService.getDocument(
        COLLECTIONS.PATIENT_PROFILES,
        editMemberId
      );
      
      setFormData({
        fullName: member.fullName || '',
        email: member.email || '',
        phoneNumber: member.phoneNumber || '',
        gender: member.gender || '',
        birthDate: member.birthDate || '',
        age: member.age || '',
        address: member.address || '',
        bloodType: Array.isArray(member.bloodType) ? member.bloodType[0] : member.bloodType || '',
        allergies: member.allergies || '',
        currentMedication: member.currentMedication || '',
        familyMedicalHistory: member.familyMedicalHistory || '',
        pastMedicalHistory: member.pastMedicalHistory || '',
        emergencyContactName: member.emergencyContactName || '',
        emergencyContactNumber: member.emergencyContactNumber || '',
        emergencyContactRelationship: Array.isArray(member.emergencyContactRelationship) 
          ? member.emergencyContactRelationship[0] 
          : member.emergencyContactRelationship || '',
        insuranceProvider: member.insuranceProvider || '',
        insurancePolicyNumber: member.insurancePolicyNumber || '',
        identificationType: member.identificationType || '',
        identificationNumber: member.identificationNumber || ''
      });
    } catch (error) {
      console.error('Error loading member data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load member data.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAge = () => {
    if (!formData.birthDate) return;
    
    const birthDate = new Date(formData.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    setFormData(prev => ({ ...prev, age: age.toString() }));
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const requiredFields = {
      fullName: 'Full Name',
      email: 'Email',
      phoneNumber: 'Phone Number',
      gender: 'Gender',
      birthDate: 'Birth Date'
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      if (!formData[field]?.trim()) {
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: `${label} is required.`,
        });
        return false;
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid email address.',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
  if (!validateForm()) return;

  try {
    setIsLoading(true);

    // Remove createdAt and updatedAt fields since they don't exist in your database schema
    const memberData = {
      fullName: formData.fullName,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      gender: formData.gender,
      birthDate: formData.birthDate,
      age: formData.age,
      address: formData.address,
      bloodType: formData.bloodType ? [formData.bloodType] : [],
      allergies: formData.allergies,
      currentMedication: formData.currentMedication,
      familyMedicalHistory: formData.familyMedicalHistory,
      pastMedicalHistory: formData.pastMedicalHistory,
      emergencyContactName: formData.emergencyContactName,
      emergencyContactNumber: formData.emergencyContactNumber,
      emergencyContactRelationship: formData.emergencyContactRelationship 
        ? [formData.emergencyContactRelationship] 
        : [],
      insuranceProvider: formData.insuranceProvider,
      insurancePolicyNumber: formData.insurancePolicyNumber,
      identificationType: formData.identificationType,
      identificationNumber: formData.identificationNumber,
      // Add userId to link this profile to the current user
      userId: currentUser.$id,
      // Remove createdAt and updatedAt - these don't exist in your schema
      // If you need timestamps, you'll need to add them as attributes in Appwrite console first
    };

    if (isEditing) {
      await DatabaseService.updateDocument(
        COLLECTIONS.PATIENT_PROFILES,
        editMemberId,
        memberData
      );
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Family member updated successfully!',
      });
    } else {
      await DatabaseService.createDocument(
        COLLECTIONS.PATIENT_PROFILES,
        memberData
      );
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Family member added successfully!',
      });
    }

    router.back();
    } catch (error) {
        console.error('Error saving family member:', error);
        Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save family member.',
        });
    } finally {
        setIsLoading(false);
    }
    };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Family Member' : 'Add Family Member'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Personal Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Full Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={formData.fullName}
                onChangeText={(text) => updateFormData('fullName', text)}
                placeholder="Enter full name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Email <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={formData.email}
                onChangeText={(text) => updateFormData('email', text)}
                placeholder="Enter email address"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Phone Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={formData.phoneNumber}
                onChangeText={(text) => updateFormData('phoneNumber', text)}
                placeholder="Enter phone number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>

            <DropdownPicker
              label="Gender"
              value={formData.gender}
              onValueChange={(value) => updateFormData('gender', value)}
              options={genderOptions}
              placeholder="Select gender"
              isRequired={true}
            />

            <CalendarPicker
              label="Birth Date"
              value={formData.birthDate}
              onDateChange={(date) => updateFormData('birthDate', date)}
              isRequired={true}
              maximumDate={new Date()}
              minimumDate={new Date('1900-01-01')}
            />

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={[styles.textInput, styles.disabledInput]}
                value={formData.age}
                placeholder="Auto-calculated from birth date"
                placeholderTextColor="#999"
                editable={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={formData.address}
                onChangeText={(text) => updateFormData('address', text)}
                placeholder="Enter address"
                placeholderTextColor="#999"
                multiline={true}
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Medical Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medical Information</Text>
            
            <DropdownPicker
              label="Blood Type"
              value={formData.bloodType}
              onValueChange={(value) => updateFormData('bloodType', value)}
              options={bloodTypeOptions}
              placeholder="Select blood type"
            />

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Allergies</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={formData.allergies}
                onChangeText={(text) => updateFormData('allergies', text)}
                placeholder="List any allergies"
                placeholderTextColor="#999"
                multiline={true}
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Current Medication</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={formData.currentMedication}
                onChangeText={(text) => updateFormData('currentMedication', text)}
                placeholder="List current medications"
                placeholderTextColor="#999"
                multiline={true}
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Family Medical History</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={formData.familyMedicalHistory}
                onChangeText={(text) => updateFormData('familyMedicalHistory', text)}
                placeholder="Enter family medical history"
                placeholderTextColor="#999"
                multiline={true}
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Past Medical History</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={formData.pastMedicalHistory}
                onChangeText={(text) => updateFormData('pastMedicalHistory', text)}
                placeholder="Enter past medical history"
                placeholderTextColor="#999"
                multiline={true}
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Emergency Contact Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contact</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Contact Name</Text>
              <TextInput
                style={styles.textInput}
                value={formData.emergencyContactName}
                onChangeText={(text) => updateFormData('emergencyContactName', text)}
                placeholder="Enter emergency contact name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Contact Number</Text>
              <TextInput
                style={styles.textInput}
                value={formData.emergencyContactNumber}
                onChangeText={(text) => updateFormData('emergencyContactNumber', text)}
                placeholder="Enter emergency contact number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>

            <DropdownPicker
              label="Relationship"
              value={formData.emergencyContactRelationship}
              onValueChange={(value) => updateFormData('emergencyContactRelationship', value)}
              options={relationshipOptions}
              placeholder="Select relationship"
            />
          </View>

          {/* Insurance Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Insurance Information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Insurance Provider</Text>
              <TextInput
                style={styles.textInput}
                value={formData.insuranceProvider}
                onChangeText={(text) => updateFormData('insuranceProvider', text)}
                placeholder="Enter insurance provider"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Policy Number</Text>
              <TextInput
                style={styles.textInput}
                value={formData.insurancePolicyNumber}
                onChangeText={(text) => updateFormData('insurancePolicyNumber', text)}
                placeholder="Enter policy number"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Identification Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Identification</Text>
            
            <DropdownPicker
              label="ID Type"
              value={formData.identificationType}
              onValueChange={(value) => updateFormData('identificationType', value)}
              options={identificationOptions}
              placeholder="Select ID type"
            />

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>ID Number</Text>
              <TextInput
                style={styles.textInput}
                value={formData.identificationNumber}
                onChangeText={(text) => updateFormData('identificationNumber', text)}
                placeholder="Enter ID number"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Update Family Member' : 'Add Family Member'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#0AD476',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF6B6B',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#FFF',
    color: '#333',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
    color: '#999',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
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
  submitButton: {
    backgroundColor: '#0AD476',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
});