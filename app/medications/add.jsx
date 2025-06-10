// app/medications/add.jsx - Enhanced Version with Multiple Medication Dropdown
import { View, Text, ScrollView, TextInput, TouchableOpacity, Switch, StyleSheet, Platform, Dimensions, Alert, Modal, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import PageHeader from '../../components/PageHeader'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router, useLocalSearchParams } from 'expo-router'
import QRScannerModal from '../../components/QRScannerModal';
import { addMedication } from '../../service/Storage'
import { scheduleMedicationReminder } from '../../service/Notification'

const {width} = Dimensions.get("window");

// Add medication types array
const MEDICATION_TYPES = [
    {
        id: "1",
        label: "Tablet",
        icon: "tablet-portrait-outline",
    },
    {
        id: "2",
        label: "Capsule",
        icon: "ellipse-outline",
    },
    {
        id: "3",
        label: "Liquid",
        icon: "water-outline",
    },
    {
        id: "4",
        label: "Injection",
        icon: "medical-outline",
    },
    {
        id: "5",
        label: "Topical",
        icon: "hand-left-outline",
    },
    {
        id: "6",
        label: "Inhaler",
        icon: "cloud-outline",
    },
    {
        id: "7",
        label: "Patch",
        icon: "bandage-outline",
    },
    {
        id: "8",
        label: "Drops",
        icon: "eyedrop-outline",
    },
];

const ILLNESS_TYPES = [
    { id: "1", label: "Flu" },
    { id: "2", label: "Fever" },
    { id: "3", label: "Cough" },
    { id: "4", label: "Headache" },
    { id: "5", label: "Allergies" },
    { id: "6", label: "Pain" },
    { id: "7", label: "Infection" },
    { id: "8", label: "Blood Pressure" },
    { id: "9", label: "Diabetes" },
    { id: "10", label: "Hypertension" },
    { id: "11", label: "Asthma" },
    { id: "12", label: "Cholesterol" },
    { id: "13", label: "Anxiety" },
    { id: "14", label: "Depression" },
    { id: "15", label: "Thyroid" },
    { id: "16", label: "Pain Relief" },
    { id: "17", label: "Inflammation" },
    { id: "18", label: "Prenatal Care" },
    { id: "19", label: "Vitamin Deficiency" },
    { id: "20", label: "Heart Condition" },
    { id: "21", label: "Other" }
];

const FREQUENCIES = [
    {
        id: "1",
        label: "Once Daily",
        icon: "sunny-outline",
        times: ["09:00"],
    },
    {
        id: "2",
        label: "Twice Daily",
        icon: "sync-outline",
        times: ["09:00", "21:00"],
    },
    {
        id: "3",
        label: "Three times Daily",
        icon: "time-outline",
        times: ["09:00", "15:00", "21:00"],
    },
    {
        id: "4",
        label: "Four times Daily",
        icon: "repeat-outline",
        times: ["09:00", "13:00", "17:00", "21:00"],
    },
    {
        id: "5",
        label: "Every Morning",
        icon: "partly-sunny-outline",
        times: ["08:00"],
    },
    {
        id: "6",
        label: "Every Evening",
        icon: "moon-outline",
        times: ["20:00"],
    },
    {
        id: "7",
        label: "Every 4 Hours",
        icon: "timer-outline",
        times: ["08:00", "12:00", "16:00", "20:00", "00:00", "04:00"],
    },
    {
        id: "8",
        label: "Every 6 Hours",
        icon: "timer-outline",
        times: ["06:00", "12:00", "18:00", "00:00"],
    },
    {
        id: "9",
        label: "Every 8 Hours",
        icon: "timer-outline",
        times: ["08:00", "16:00", "00:00"],
    },
    {
        id: "10",
        label: "Every 12 Hours",
        icon: "hourglass-outline",
        times: ["08:00", "20:00"],
    },
    {
        id: "11",
        label: "Weekly",
        icon: "calendar-outline",
        times: ["09:00"],
    },
    {
        id: "12",
        label: "As Needed",
        icon: "calendar-outline",
        times: [],
    },
];

const DURATIONS = [
    { id: 1, label: "7 days", value: 7},
    { id: 2, label: "14 days", value: 14},
    { id: 3, label: "30 days", value: 30},
    { id: 4, label: "90 days", value: 90},
    { id: 5, label: "On going", value: -1},
];

export default function AddMedicationScreen() {
    // State for simulated QR scanner
    const [showQRModal, setShowQRModal] = useState(true); // Start with QR scanner open
    
    // Get params from router if coming from elsewhere
    const params = useLocalSearchParams();

    // NEW: State for multiple medications from prescription
    const [scannedMedications, setScannedMedications] = useState([]);
    const [selectedMedicationIndex, setSelectedMedicationIndex] = useState(0);
    const [showMedicationDropdown, setShowMedicationDropdown] = useState(false);

    const [form, setForm] = useState({
        name: params?.name || "",
        type: params?.type || "",
        illnessType: params?.illnessType || "",
        dosage: params?.dosage || "",
        frequencies: params?.frequencies || "",
        duration: params?.duration || "",
        startDate: params?.startDate ? new Date(params.startDate) : new Date(),
        times: params?.times ? JSON.parse(params.times) : ["09:00"],
        notes: params?.notes || "",
        reminderEnabled: params?.reminderEnabled !== "false",
        refillReminder: params?.refillReminder === "true",
        currentSupply: params?.currentSupply || "",
        refillAt: params?.refillAt || "",
    });

    const [errors, setErrors] = useState({});
    const [selectedType, setSelectedType] = useState(params?.type || "");
    const [selectedIllnessType, setSelectedIllnessType] = useState(params?.illnessType || "");
    const [showIllnessDropdown, setShowIllnessDropdown] = useState(false);
    const [selectedFrequency, setSelectedFrequency] = useState(params?.frequencies || "");
    const [selectedDuration, setSelectedDuration] = useState(params?.duration || "");
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
    const [loading, setLoading] = useState(false);

    // Enhanced handleScanSuccess to process multiple medications
    const handleScanSuccess = (scanResult) => {
        console.log("Scan success with result:", scanResult);
        
        const { medications, totalCount, action } = scanResult;
        
        // If we have multiple medications, populate the dropdown
        if (medications && medications.length > 1) {
            setScannedMedications(medications);
            setSelectedMedicationIndex(0);
            // Load the first medication by default
            handleSingleMedication(medications[0]);
            setShowQRModal(false);
            
            // Show info about multiple medications found
            Alert.alert(
                "Multiple Medications Found! 💊",
                `Found ${medications.length} medications in this prescription. Use the dropdown above to switch between them, or add them all at once.`,
                [{ text: "Got it!" }]
            );
        } else {
            // Single medication - existing behavior
            const medication = medications ? medications[0] : scanResult;
            setScannedMedications([medication]);
            setSelectedMedicationIndex(0);
            handleSingleMedication(medication);
            setShowQRModal(false);
        }
    };

    // Handle single medication (existing functionality)
    const handleSingleMedication = (medication) => {
        console.log("Loading medication for editing:", medication);
        
        // Update form with medication data
        setForm({
            name: medication.name || "",
            type: medication.type || "",
            illnessType: medication.illnessType || "",
            dosage: medication.dosage || "",
            frequencies: medication.frequencies || "",
            duration: medication.duration || "",
            startDate: new Date(),
            times: medication.times || ["09:00"],
            notes: medication.notes || "",
            reminderEnabled: true,
            refillReminder: false,
            currentSupply: medication.currentSupply || "",
            refillAt: medication.refillAt || "",
        });
        
        // Update selected values for UI
        setSelectedType(medication.type || "");
        setSelectedIllnessType(medication.illnessType || "");
        setSelectedFrequency(medication.frequencies || "");
        setSelectedDuration(medication.duration || "");
    };

    // NEW: Handle medication selection from dropdown
    const handleMedicationSelect = (index) => {
        setSelectedMedicationIndex(index);
        handleSingleMedication(scannedMedications[index]);
        setShowMedicationDropdown(false);
    };

    // NEW: Add all medications function
    const handleAddAllMedications = async () => {
        try {
            setLoading(true);
            
            Alert.alert(
                "Add All Medications",
                `Add all ${scannedMedications.length} medications from this prescription?`,
                [
                    {
                        text: "Yes, Add All",
                        onPress: async () => {
                            await processAllMedications(scannedMedications);
                        }
                    },
                    {
                        text: "Cancel",
                        style: "cancel",
                        onPress: () => setLoading(false)
                    }
                ]
            );
        } catch (error) {
            console.error("Error in handleAddAllMedications:", error);
            setLoading(false);
        }
    };
    
    // Process all medications
    const processAllMedications = async (medications) => {
        try {
            let successCount = 0;
            let failCount = 0;
            const addedMedications = [];
            
            for (const medication of medications) {
                try {
                    const medicationData = await prepareMedicationData(medication);
                    await addMedication(medicationData);
                    
                    if (medicationData.reminderEnabled) {
                        await scheduleMedicationReminder(medicationData);
                    }
                    
                    addedMedications.push(medicationData.name);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to add medication ${medication.name}:`, error);
                    failCount++;
                }
            }
            
            if (successCount > 0 && failCount === 0) {
                const successList = addedMedications.join(', ');
                Alert.alert(
                    "Success! 🎉",
                    `Successfully added all ${successCount} medications:\n\n${successList}`,
                    [{ text: "OK", onPress: () => router.back() }]
                );
            } else if (successCount > 0 && failCount > 0) {
                Alert.alert(
                    "Partial Success",
                    `Added ${successCount} medications successfully. ${failCount} failed.`,
                    [{ text: "OK", onPress: () => router.back() }]
                );
            } else {
                Alert.alert("Error", "Failed to add medications. Please try again.");
            }
            
        } catch (error) {
            console.error("Error processing medications:", error);
            Alert.alert("Error", "Failed to add medications. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // NEW: Render medication selection dropdown
    const renderMedicationSelector = () => {
        if (scannedMedications.length <= 1) return null;

        return (
            <View style={styles.medicationSelectorContainer}>
                <View style={styles.medicationSelectorHeader}>
                    <View style={styles.medicationSelectorInfo}>
                        <Ionicons name="medical" size={20} color="#1a8e2d" />
                        <Text style={styles.medicationSelectorTitle}>
                            Prescription Medications ({scannedMedications.length})
                        </Text>
                    </View>
                    
                    <TouchableOpacity
                        style={styles.addAllButton}
                        onPress={handleAddAllMedications}
                    >
                        <Ionicons name="add-circle" size={16} color="#1a8e2d" />
                        <Text style={styles.addAllButtonText}>Add All</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.medicationDropdownButton}
                    onPress={() => setShowMedicationDropdown(!showMedicationDropdown)}
                >
                    <View style={styles.medicationDropdownInfo}>
                        <Text style={styles.medicationDropdownLabel}>
                            Medication {selectedMedicationIndex + 1}:
                        </Text>
                        <Text style={styles.medicationDropdownName}>
                            {scannedMedications[selectedMedicationIndex]?.name || "Select medication"}
                        </Text>
                        <Text style={styles.medicationDropdownDosage}>
                            {scannedMedications[selectedMedicationIndex]?.dosage}
                        </Text>
                    </View>
                    <Ionicons 
                        name={showMedicationDropdown ? "chevron-up" : "chevron-down"} 
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
                                    onPress={() => handleMedicationSelect(index)}
                                >
                                    <View style={styles.medicationDropdownItemContent}>
                                        <Text style={[
                                            styles.medicationDropdownItemName,
                                            selectedMedicationIndex === index && styles.selectedMedicationDropdownItemText
                                        ]}>
                                            Medication {index + 1}: {medication.name}
                                        </Text>
                                        <Text style={[
                                            styles.medicationDropdownItemDetails,
                                            selectedMedicationIndex === index && styles.selectedMedicationDropdownItemText
                                        ]}>
                                            {medication.dosage} • {medication.type} • {medication.illnessType}
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

    // Render medication type options
    const renderMedicationTypes = () => {
        return (
            <View style={styles.optionGrid}>
                {MEDICATION_TYPES.map((type) => (
                    <TouchableOpacity 
                        key={type.id}
                        style={[styles.optionCard, selectedType === type.label && styles.selectedOptionCard]}
                        onPress={() => {
                            setSelectedType(type.label);
                            setForm({ ...form, type: type.label });
                            if(errors.type) {
                                setErrors({...errors, type: ""});
                            }
                        }}
                    >
                        <View 
                            style={[styles.optionIcon, selectedType === type.label && styles.selectedOptionIcon]}
                        >
                            <Ionicons 
                                name={type.icon}
                                size={24}
                                color={selectedType === type.label ? "white" : "#666"}
                            />
                        </View>
                        <Text 
                            style={[styles.optionLabel, selectedType === type.label && styles.selectedOptionLabel]}
                        >
                            {type.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        )
    }

    const renderIllnessDropdown = () => {
        return (
            <View>
                <TouchableOpacity
                    style={[styles.dropdownButton, errors.illnessType && styles.inputError]}
                    onPress={() => setShowIllnessDropdown(!showIllnessDropdown)}
                >
                    <Text style={form.illnessType ? styles.dropdownText : styles.dropdownPlaceholder}>
                        {form.illnessType || "Select Illness Type"}
                    </Text>
                    <Ionicons name={showIllnessDropdown ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                </TouchableOpacity>
                
                {errors.illnessType && (
                    <Text style={styles.errorText}>{errors.illnessType}</Text>
                )}
                
                {showIllnessDropdown && (
                    <View style={styles.dropdownMenu}>
                        <ScrollView style={{ maxHeight: 200 }}>
                            {ILLNESS_TYPES.map((illness) => (
                                <TouchableOpacity
                                    key={illness.id}
                                    style={[
                                        styles.dropdownItem,
                                        selectedIllnessType === illness.label && styles.selectedDropdownItem
                                    ]}
                                    onPress={() => {
                                        setSelectedIllnessType(illness.label);
                                        setForm({ ...form, illnessType: illness.label });
                                        setShowIllnessDropdown(false);
                                        if (errors.illnessType) {
                                            setErrors({ ...errors, illnessType: "" });
                                        }
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.dropdownItemText,
                                            selectedIllnessType === illness.label && styles.selectedDropdownItemText
                                        ]}
                                    >
                                        {illness.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>
        )
    }

    const renderFrequencyOptions = () => {
        return (
            <View style={styles.optionGrid}>
                {FREQUENCIES.map((freq)=> (
                    <TouchableOpacity 
                        key={freq.id}
                        style={[styles.optionCard, selectedFrequency === freq.label && styles.selectedOptionCard]}
                        onPress={() => {
                            setSelectedFrequency(freq.label);
                            setForm({ ...form, frequencies: freq.label, times: freq.times });
                            if(errors.frequencies) {
                                setErrors({...errors, frequencies: ""});
                            }
                        }}
                    >
                        <View 
                            style={[styles.optionIcon, selectedFrequency === freq.label && styles.selectedOptionIcon]}
                        >
                            <Ionicons 
                                name={freq.icon}
                                size={24}
                                color={selectedFrequency === freq.label ? "white" : "#666"}
                            />
                        </View>
                        <Text 
                            style={[styles.optionLabel, selectedFrequency === freq.label && styles.selectedOptionLabel]}
                        >
                            {freq.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        )
    }

    const renderDurationOptions = () => {
        return (
            <View style={styles.optionGrid}>
                {DURATIONS.map((dur)=> (
                    <TouchableOpacity key={dur.id}
                        style={[styles.optionCard, selectedDuration === dur.label && styles.selectedOptionCard]}
                        onPress={() => {
                            setSelectedDuration(dur.label);
                            setForm({ ...form, duration: dur.label });
                            if(errors.duration) {
                                setErrors({...errors, duration: ""});
                            }
                        }}
                    >
                        <Text
                            style={[styles.durationNumber, selectedDuration === dur.label && styles.selectedDurationNumber]}
                        >{dur.value > 0 ? dur.value: "∞"}</Text>
                        <Text
                            style={[styles.optionLabel,
                            selectedDuration === dur.label && styles.selectedOptionLabel]}
                        >{dur.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const validateForm = () => {
        const newErrors = {}; 
        if (!form.name.trim()) {
            newErrors.name = "Medication name is required";
        }
        if (!form.type.trim()) {
            newErrors.type = "Medication type is required";
        }
        if (!form.illnessType.trim()) {
            newErrors.illnessType = "Illness type is required";
        }
        if (!form.dosage.trim()) {
            newErrors.dosage = "Dosage is required";
        }
        if (!form.frequencies.trim()) {
            newErrors.frequencies = "Frequency is required";
        }
        if (!form.duration.trim()) {
            newErrors.duration = "Duration is required";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const prepareMedicationData = (medication) => {
        const colorPalette = [
            '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#F44336',
            '#009688', '#795548', '#607D8B', '#3F51B5', '#00BCD4',
            '#8BC34A', '#FF5722', '#673AB7', '#FFEB3B', '#03A9F4'
        ];
        const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    
        let medicationTimes = medication.times || ["09:00"];
        if (!Array.isArray(medicationTimes)) {
            medicationTimes = [medicationTimes];
        }
    
        return {
            id: Math.random().toString(36).substr(2, 9),
            name: medication.name || "Unknown Medication",
            type: medication.type || "Tablet",
            illnessType: medication.illnessType || "General",
            dosage: medication.dosage || "As prescribed",
            frequencies: medication.frequencies || "Once Daily",
            duration: medication.duration || "30 days",
            startDate: new Date().toISOString(),
            times: medicationTimes,
            notes: medication.notes || "Added from prescription scan",
            reminderEnabled: true,
            refillReminder: false,
            currentSupply: 0,
            totalSupply: 0,
            refillAt: 0,
            color: randomColor,
        };
    };

    const handleSave = async() => {
        try {
            if (!validateForm()) {
                Alert.alert("Error", "Please fill in all required fields correctly!");
                return;
            }

            if (isSubmitting) return;
            setIsSubmitting(true);

            const medicationData = await prepareMedicationData(form);
            await addMedication(medicationData);

            if (medicationData.reminderEnabled) {
                medicationData.reminderEnabled = form.reminderEnabled === true;
                
                if (!Array.isArray(medicationData.times) || medicationData.times.length === 0) {
                    console.error("No medication times found!");
                    Alert.alert("Error", "Please add at least one medication time");
                    return;
                }
                
                await scheduleMedicationReminder(medicationData);
            }

            Alert.alert(
                "Success",
                "Medication added successfully",
                [
                    {
                        text: "OK",
                        onPress: () => router.back(),
                    },
                ],
                { cancelable: false }
            );

        } catch (error) {
            console.error("Save error:", error);
            Alert.alert(
                "Error",
                "Failed to save medication, Please try again",
                [{ text: "OK" }],
                { cancelable: false }
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // Loading state for bulk operations
    if (loading) {
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
                        <Text style={styles.headerTitle}>Add Medication</Text>
                    </View>
                    
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#1a8e2d" />
                        <Text style={styles.loadingText}>Adding medications...</Text>
                        <Text style={styles.loadingSubText}>Please wait while we process all medications</Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient 
                colors={["#1a8e2d", "#146922"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            />
            
            {/* QR Code Scanner Modal */}
            <QRScannerModal
                visible={showQRModal}
                onClose={() => setShowQRModal(false)}
                onScanSuccess={handleScanSuccess}
            />
            
            {/* Regular Form */}
            <View style={styles.content}>
                <View style={styles.header}>
                    <PageHeader onPress={() => router.back()}/>
                    <Text style={styles.headerTitle}>Add Medication</Text>
                </View>
                
                <ScrollView showsVerticalScrollIndicator={false} style={{flex: 1}}
                    contentContainerStyle={styles.formContentContainer}>
                    
                    {/* Option to open QR scanner again */}
                    <TouchableOpacity 
                        style={styles.scanPrescriptionButton}
                        onPress={() => setShowQRModal(true)}
                    >
                        <Ionicons name="qr-code" size={24} color="#1a8e2d" />
                        <Text style={styles.scanPrescriptionText}>Scan Prescription QR</Text>
                    </TouchableOpacity>

                    {/* NEW: Multiple Medication Selector */}
                    {renderMedicationSelector()}
                    
                    <View style={styles.section}>
                        {/* basic informations */}
                        <View style={styles.inputContainer}>
                            <TextInput style={[styles.mainInput, errors.name && styles.inputError]}
                                placeholder='Medication Name' placeholderTextColor={'#999'}
                                value={form.name}
                                onChangeText={(text) =>{
                                    setForm({...form, name:text})
                                    if(errors.name){
                                        setErrors({...errors, name: "" })
                                    }
                                }}
                            />
                            {errors.name && (
                                <Text style={styles.errorText}>{errors.name}</Text>
                            )}
                        </View>
                        
                        {/* Type selection section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Medication Type</Text>
                            {errors.type && (
                                <Text style={styles.errorText}>{errors.type}</Text>
                            )}
                            {renderMedicationTypes()}
                            <Text style={styles.sectionTitle}>Illness Type</Text>
                            {renderIllnessDropdown()}
                        </View>
                        
                        <View style={styles.inputContainer}>
                            <TextInput style={[styles.mainInput, errors.dosage && styles.inputError]}
                                placeholder='Dosage e.g(500mg)' placeholderTextColor={'#999'}
                                value={form.dosage}
                                onChangeText={(text) =>{
                                    setForm({...form, dosage:text})
                                    if(errors.dosage){
                                        setErrors({...errors, dosage: "" })
                                    }
                                }}
                            />
                            {errors.dosage && (
                                <Text style={styles.errorText}>{errors.dosage}</Text>
                            )}
                        </View>
                    </View>
                    {/* Schedule */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>How Often?</Text>
                        {/* frequency option */}
                        {errors.frequencies && (
                            <Text style={styles.errorText}>{errors.frequencies}</Text>
                        )}
                        {renderFrequencyOptions()}
                        <Text style={styles.sectionTitle}>For How Long?</Text>
                        {/* duration option */}
                        {renderDurationOptions()}
                        {errors.duration && (
                            <Text style={styles.errorText}>{errors.duration}</Text>
                        )}

                        <TouchableOpacity style={styles.dateButton}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <View style={styles.dateIconContainer}>
                                <Ionicons name='calendar' size={20} color={"#1a8e2d"} />
                            </View>
                            <Text style={styles.dateButtonText}>Starts: {form.startDate.toLocaleDateString()}</Text>
                            <Ionicons name='chevron-forward' size={20} color={"#666"}/>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker value={form.startDate} mode='date'
                                onChange={(event, date) => {
                                    setShowDatePicker(false);
                                    if(date) setForm({...form, startDate: date });
                                }}
                            />  
                        )}

                        {form.frequencies && form.frequencies !== 'As Needed' && (
                            <View style={styles.timesContainer}>
                                <Text style={styles.timesTitle}>Medication Times</Text>
                                {form.times.map((time, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.timeButton}
                                        onPress={() => {
                                            setCurrentTimeIndex(index);
                                            setShowTimePicker(true);
                                        }}
                                    >
                                        <View style={styles.timesIconContainer}>
                                            <Ionicons 
                                                name='time-outline' 
                                                size={20} 
                                                color={'#1a8e2d'}/>
                                        </View>
                                        <Text style={styles.timeButtonText}>{time}</Text>
                                        <Ionicons 
                                            name='chevron-forward' 
                                            size={20} 
                                            color={"#666"}/>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {showTimePicker && (
                            <DateTimePicker mode='time' value={(()=>{
                                const [hours, minutes] = form.times[currentTimeIndex].split(":").map(Number);
                                const date = new Date();
                                date.setHours(hours, minutes, 0,0);
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
                                        setForm((prev) => ({
                                            ...prev,
                                            times: prev.times.map((t,i)=>(i===currentTimeIndex ? newTime : t))
                                        }))
                                    }
                                }}
                            />
                        )}
                    </View>
                    
                    {/* Reminders */}
                    <View style={styles.section}>
                        <View style={styles.card}>
                            <View style={styles.switchRow}>
                                <View style={styles.switchLabelContainer}>
                                    <View style={styles.iconContainer}>
                                        <Ionicons name='notifications' size={20} color={'#1a8e2d'}/>
                                    </View>
                                    <View style={styles.switchTextContainer}>
                                        <Text style={styles.switchLabel}>Reminders</Text>
                                        <Text style={styles.switchSubLabel}>Get Notified When It's Time to Take Medications</Text>
                                    </View>
                                </View>
                                <Switch 
                                    value={form.reminderEnabled}
                                    trackColor={{false: '#ddd', true: '#1a8e2d'}} 
                                    thumbColor={'white'}
                                    onValueChange={(value) =>
                                        setForm({ ...form, reminderEnabled: value })
                                    }
                                />
                            </View>
                        </View>
                    </View>
                    {/* Notes */}
                    <View style={styles.section}>
                        <View style={styles.textAreaContainer}>
                            <TextInput style={styles.textArea}
                                placeholder='Add Notes or special instructions...' placeholderTextColor='#999'
                                value={form.notes}
                                onChangeText={(text) => setForm({ ...form, notes: text })}
                                multiline
                                numberOfLines={4}
                                textAlignVertical='top'
                            />
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity style={[styles.saveButton,
                        isSubmitting && styles.saveButtonDisabled,
                    ]} onPress={() => handleSave()}>
                        <LinearGradient
                            colors={["#1a8e2d", "#146922"]}
                            style={styles.saveButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text style={styles.saveButtonText}>{ isSubmitting ? "Adding..." : "Add Medication"}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton}
                        onPress={() => router.back()}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
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
    formContentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 150,
    },
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
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    inputContainer: {
        marginBottom: 15,
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
    errorText: {
        color: 'red',
        fontSize: 12,
        marginTop: 5,
    },
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
    durationNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 5,
    },
    selectedDurationNumber: {
        color: '#1a8e2d',
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
    // Illness Type Dropdown
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
    // NEW: Multiple Medication Selector Styles
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
    // Date and Time Pickers
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
    timesContainer: {
        marginTop: 10,
    },
    timesTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
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
    timesIconContainer: {
        marginRight: 10,
    },
    timeButtonText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    // Reminders Card
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
    // Notes Section
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
    // Footer Actions
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
    // QR Scanner Button
    scanPrescriptionButton: {
        flexDirection: 'row',
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
        marginLeft: 10,
    },
});