// app/medications/add.jsx - Enhanced Version with Prevention of Multiple Processing
import { View, Text, ScrollView, TextInput, TouchableOpacity, Switch, StyleSheet, Platform, Dimensions, Alert, Modal, ActivityIndicator } from 'react-native'
import React, { useState, useRef } from 'react'
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

    // Add refs to prevent multiple processing
    const scanProcessingRef = useRef(false);
    const lastProcessedResult = useRef(null);

    // Enhanced handleScanSuccess to process multiple medications with duplicate prevention
    const handleScanSuccess = (scanResult) => {
        console.log("Scan success with result:", scanResult);
        
        // Prevent duplicate processing
        if (scanProcessingRef.current) {
            console.log("Scan result ignored: already processing");
            return;
        }

        // Check if this is the same result we just processed
        const resultKey = JSON.stringify(scanResult);
        if (lastProcessedResult.current === resultKey) {
            console.log("Scan result ignored: duplicate result");
            return;
        }

        // Set processing flag and store result
        scanProcessingRef.current = true;
        lastProcessedResult.current = resultKey;
        
        try {
            const { medications, totalCount, action } = scanResult;
            
            // Handle different actions
            if (action === 'add_all') {
                // User chose to add all medications directly
                handleAddAllMedications(medications);
                return;
            }
            
            // If we have multiple medications, populate the dropdown
            if (medications && medications.length > 1) {
                setScannedMedications(medications);
                setSelectedMedicationIndex(0);
                // Load the first medication by default
                handleSingleMedication(medications[0]);
                setShowQRModal(false);
                
                // Show info about multiple medications found
                setTimeout(() => {
                    Alert.alert(
                        "Multiple Medications Found! 💊",
                        `Found ${medications.length} medications in this prescription. Use the dropdown above to switch between them, or add them all at once.`,
                        [{ 
                            text: "Got it!",
                            onPress: () => {
                                scanProcessingRef.current = false;
                            }
                        }]
                    );
                }, 500);
            } else {
                // Single medication - existing behavior
                const medication = medications ? medications[0] : scanResult;
                setScannedMedications([medication]);
                setSelectedMedicationIndex(0);
                handleSingleMedication(medication);
                setShowQRModal(false);
                
                // Reset processing flag after a delay
                setTimeout(() => {
                    scanProcessingRef.current = false;
                }, 1000);
            }
        } catch (error) {
            console.error("Error handling scan success:", error);
            scanProcessingRef.current = false;
        }
    };

    // Handle single medication (existing functionality)
    const handleSingleMedication = (medication) => {
        console.log("Loading medication for editing:", medication);
        
        // Use medication's times if available, otherwise use frequency default
        let medicationTimes = [];
        if (medication.times && Array.isArray(medication.times) && medication.times.length > 0) {
            // Use existing times (preserves custom times)
            medicationTimes = medication.times;
        } else {
            // Fall back to frequency-based times as default
            const frequencyData = FREQUENCIES.find(freq => freq.label === medication.frequencies);
            medicationTimes = frequencyData ? frequencyData.times : ["09:00"];
        }
        
        // Update form with medication data
        setForm({
            name: medication.name || "",
            type: medication.type || "",
            illnessType: medication.illnessType || "",
            dosage: medication.dosage || "",
            frequencies: medication.frequencies || "",
            duration: medication.duration || "",
            startDate: new Date(),
            times: medicationTimes, // Use medication's times or frequency default
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

    // NEW: Add all medications function with improved error handling
    const handleAddAllMedications = async (medications = scannedMedications) => {
        // Prevent multiple calls
        if (loading) {
            console.log("Add all medications ignored: already processing");
            return;
        }

        try {
            setLoading(true);
            
            Alert.alert(
                "Add All Medications",
                `Add all ${medications.length} medications from this prescription?`,
                [
                    {
                        text: "Yes, Add All",
                        onPress: async () => {
                            await processAllMedications(medications);
                        }
                    },
                    {
                        text: "Cancel",
                        style: "cancel",
                        onPress: () => {
                            setLoading(false);
                            scanProcessingRef.current = false;
                        }
                    }
                ]
            );
        } catch (error) {
            console.error("Error in handleAddAllMedications:", error);
            setLoading(false);
            scanProcessingRef.current = false;
        }
    };
    
    // Process all medications with better error handling
    const processAllMedications = async (medications) => {
        try {
            let successCount = 0;
            let failCount = 0;
            const addedMedications = [];
            
            for (const medication of medications) {
                try {
                    // 🚨 CRITICAL: For bulk save, use each medication's data as-is (preserves any custom times)
                    console.log("Processing medication for bulk save:", medication.name);
                    console.log("Medication times:", medication.times);
                    
                    const medicationData = await prepareMedicationData(medication);
                    
                    console.log("Prepared data for", medication.name, ":", medicationData);
                    console.log("Final times for", medication.name, ":", medicationData.times);
                    
                    await addMedication(medicationData);
                    
                    if (medicationData.reminderEnabled) {
                        await scheduleMedicationReminder(medicationData);
                    }
                    
                    addedMedications.push(`${medicationData.name} (${medicationData.times.join(", ")})`);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to add medication ${medication.name}:`, error);
                    failCount++;
                }
            }
            
            if (successCount > 0 && failCount === 0) {
                const successList = addedMedications.join('\n');
                Alert.alert(
                    "Success! 🎉",
                    `Successfully added all ${successCount} medications:\n\n${successList}`,
                    [{ 
                        text: "OK", 
                        onPress: () => {
                            scanProcessingRef.current = false;
                            router.back();
                        }
                    }]
                );
            } else if (successCount > 0 && failCount > 0) {
                Alert.alert(
                    "Partial Success",
                    `Added ${successCount} medications successfully. ${failCount} failed.`,
                    [{ 
                        text: "OK", 
                        onPress: () => {
                            scanProcessingRef.current = false;
                            router.back();
                        }
                    }]
                );
            } else {
                Alert.alert(
                    "Error", 
                    "Failed to add medications. Please try again.",
                    [{ 
                        text: "OK",
                        onPress: () => {
                            scanProcessingRef.current = false;
                        }
                    }]
                );
            }
            
        } catch (error) {
            console.error("Error processing medications:", error);
            Alert.alert(
                "Error", 
                "Failed to add medications. Please try again.",
                [{ 
                    text: "OK",
                    onPress: () => {
                        scanProcessingRef.current = false;
                    }
                }]
            );
        } finally {
            setLoading(false);
        }
    };

    // NEW: Render medication selection dropdown
    const renderMedicationSelector = () => {
        if (scannedMedications.length <= 1) return null;

        const currentIndex = selectedMedicationIndex;
        const totalMeds = scannedMedications.length;

        return (
            <View style={styles.medicationSelectorContainer}>
                <View style={styles.medicationSelectorHeader}>
                    <View style={styles.medicationSelectorInfo}>
                        <Ionicons name="medical" size={20} color="#1a8e2d" />
                        <Text style={styles.medicationSelectorTitle}>
                            Prescription Medications ({currentIndex + 1}/{totalMeds})
                        </Text>
                    </View>
                    
                    <TouchableOpacity
                        style={[styles.addAllButton, loading && styles.disabledButton]}
                        onPress={() => handleAddAllMedications()}
                        disabled={loading}
                    >
                        <Ionicons name="add-circle" size={16} color="#1a8e2d" />
                        <Text style={styles.addAllButtonText}>
                            {loading ? "Adding..." : "Add All"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Progress indicator */}
                <View style={styles.progressIndicator}>
                    <View style={styles.progressBar}>
                        <View 
                            style={[
                                styles.progressFill, 
                                { width: `${((currentIndex + 1) / totalMeds) * 100}%` }
                            ]} 
                        />
                    </View>
                    <Text style={styles.progressText}>
                        Medication {currentIndex + 1} of {totalMeds}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.medicationDropdownButton}
                    onPress={() => setShowMedicationDropdown(!showMedicationDropdown)}
                    disabled={loading}
                >
                    <View style={styles.medicationDropdownInfo}>
                        <Text style={styles.medicationDropdownLabel}>
                            Current Medication:
                        </Text>
                        <Text style={styles.medicationDropdownName}>
                            {scannedMedications[selectedMedicationIndex]?.name || "Select medication"}
                        </Text>
                        <Text style={styles.medicationDropdownDosage}>
                            {scannedMedications[selectedMedicationIndex]?.dosage} • {scannedMedications[selectedMedicationIndex]?.frequencies}
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

    // Enhanced QR modal close handler
    const handleQRModalClose = () => {
        setShowQRModal(false);
        // Reset processing flags when modal is closed
        setTimeout(() => {
            scanProcessingRef.current = false;
            lastProcessedResult.current = null;
        }, 500);
    };

    // Rest of the component remains the same...
    // (Including all the existing render functions, validation, save logic, etc.)

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
                            
                            // Ask user if they want to update times when changing frequency
                            if (form.frequencies !== freq.label && form.times.length > 0) {
                                Alert.alert(
                                    "Update Medication Times?",
                                    `Changing frequency to "${freq.label}". Do you want to update the medication times to match this frequency?`,
                                    [
                                        {
                                            text: "Keep Current Times",
                                            onPress: () => {
                                                setForm({ ...form, frequencies: freq.label });
                                            }
                                        },
                                        {
                                            text: "Update Times",
                                            onPress: () => {
                                                setForm({ ...form, frequencies: freq.label, times: freq.times });
                                            }
                                        }
                                    ]
                                );
                            } else {
                                // First time setting frequency or no existing times
                                setForm({ ...form, frequencies: freq.label, times: freq.times });
                            }
                            
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

    const prepareMedicationData = (formData) => {
        const colorPalette = [
            '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#F44336',
            '#009688', '#795548', '#607D8B', '#3F51B5', '#00BCD4',
            '#8BC34A', '#FF5722', '#673AB7', '#FFEB3B', '#03A9F4'
        ];
        const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    
        // 🚨 CRITICAL FIX: Always use the current form's times (preserves user customization)
        let medicationTimes = [];
        
        // Priority 1: Use form.times (user's current selection/customization)
        if (Array.isArray(formData.times) && formData.times.length > 0) {
            medicationTimes = formData.times.map(time => String(time));
            console.log("Using form times (custom):", medicationTimes);
        } 
        // Priority 2: If form.times is empty, use frequency default as fallback
        else {
            const frequencyData = FREQUENCIES.find(freq => freq.label === formData.frequencies);
            medicationTimes = frequencyData ? frequencyData.times : ["09:00"];
            console.log("Using frequency default times:", medicationTimes);
        }
    
        const medicationData = {
            id: Math.random().toString(36).substr(2, 9),
            name: formData.name || "Unknown Medication",
            type: formData.type || "Tablet",
            illnessType: formData.illnessType || "General",
            dosage: formData.dosage || "As prescribed",
            frequencies: formData.frequencies || "Once Daily",
            duration: formData.duration || "30 days",
            startDate: new Date().toISOString(),
            times: medicationTimes, // 🚨 This should be the user's custom times
            notes: formData.notes || "Added from prescription scan",
            reminderEnabled: formData.reminderEnabled !== false,
            refillReminder: formData.refillReminder || false,
            currentSupply: 0,
            totalSupply: 0,
            refillAt: 0,
            color: randomColor,
        };

        console.log("Final medication data being saved:", medicationData);
        return medicationData;
    };

    // Save current medication and optionally load next
    const saveCurrentMedication = async (showSuccessAlert = true) => {
        try {
            if (!validateForm()) {
                Alert.alert("Error", "Please fill in all required fields correctly!");
                return false;
            }

            console.log("Saving medication with form data:", form);
            console.log("Form times before save:", form.times);

            // 🚨 CRITICAL: Pass the entire form object to preserve custom times
            const medicationData = await prepareMedicationData(form);
            
            console.log("Medication data prepared for saving:", medicationData);
            console.log("Times in prepared data:", medicationData.times);
            
            await addMedication(medicationData);

            if (medicationData.reminderEnabled) {
                if (!Array.isArray(medicationData.times) || medicationData.times.length === 0) {
                    console.error("No medication times found!");
                    Alert.alert("Error", "Please add at least one medication time");
                    return false;
                }
                
                console.log("Scheduling reminders for times:", medicationData.times);
                await scheduleMedicationReminder(medicationData);
            }

            if (showSuccessAlert) {
                Alert.alert(
                    "Success",
                    `Medication "${medicationData.name}" added with times: ${medicationData.times.join(", ")}`,
                    [{ text: "OK", onPress: () => router.back() }],
                    { cancelable: false }
                );
            }

            return true;
        } catch (error) {
            console.error("Save error:", error);
            Alert.alert(
                "Error",
                "Failed to save medication, Please try again",
                [{ text: "OK" }],
                { cancelable: false }
            );
            return false;
        }
    };

    // Enhanced save function for multiple medications
    const handleSave = async() => {
        try {
            if (isSubmitting) return;
            setIsSubmitting(true);

            // If we have multiple medications, give user options
            if (scannedMedications.length > 1) {
                const currentIndex = selectedMedicationIndex;
                const remainingCount = scannedMedications.length - currentIndex - 1;
                
                Alert.alert(
                    "Save Options",
                    remainingCount > 0 
                        ? `Save current medication?\n\n${remainingCount} more medication(s) remaining in this prescription.`
                        : "Save this medication?",
                    [
                        {
                            text: "Save & Continue",
                            onPress: async () => {
                                const success = await saveCurrentMedication(false);
                                if (success && remainingCount > 0) {
                                    // Load next medication
                                    const nextIndex = currentIndex + 1;
                                    setSelectedMedicationIndex(nextIndex);
                                    handleSingleMedication(scannedMedications[nextIndex]);
                                    setIsSubmitting(false);
                                    
                                    Alert.alert(
                                        "Success!",
                                        `Medication ${currentIndex + 1} saved!\n\nNow editing medication ${nextIndex + 1}: ${scannedMedications[nextIndex].name}`,
                                        [{ text: "Continue" }]
                                    );
                                } else if (success) {
                                    // Last medication
                                    Alert.alert(
                                        "All Done!",
                                        "All medications from this prescription have been added!",
                                        [{ text: "OK", onPress: () => router.back() }]
                                    );
                                }
                            }
                        },
                        {
                            text: "Save & Finish",
                            onPress: async () => {
                                const success = await saveCurrentMedication(true);
                                if (success && remainingCount > 0) {
                                    Alert.alert(
                                        "Reminder",
                                        `You have ${remainingCount} more medication(s) from this prescription that weren't added. You can scan the QR code again to add them later.`,
                                        [{ text: "OK" }]
                                    );
                                }
                            }
                        },
                        {
                            text: "Cancel",
                            style: "cancel",
                            onPress: () => setIsSubmitting(false)
                        }
                    ]
                );
            } else {
                // Single medication - existing behavior
                await saveCurrentMedication(true);
            }

        } catch (error) {
            console.error("Save error:", error);
            Alert.alert("Error", "Failed to save medication, Please try again");
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
            
            {/* QR Code Scanner Modal with improved close handler */}
            <QRScannerModal
                visible={showQRModal}
                onClose={handleQRModalClose}
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
                        style={[styles.scanPrescriptionButton, loading && styles.disabledButton]}
                        onPress={() => setShowQRModal(true)}
                        disabled={loading}
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
                                <View style={styles.timesHeader}>
                                    <Text style={styles.timesTitle}>Medication Times</Text>
                                    {form.frequencies && (
                                        <TouchableOpacity
                                            style={styles.resetTimesButton}
                                            onPress={() => {
                                                const frequencyData = FREQUENCIES.find(freq => freq.label === form.frequencies);
                                                if (frequencyData) {
                                                    Alert.alert(
                                                        "Reset to Default Times?",
                                                        `Reset times to default for "${form.frequencies}"?`,
                                                        [
                                                            {
                                                                text: "Cancel",
                                                                style: "cancel"
                                                            },
                                                            {
                                                                text: "Reset",
                                                                onPress: () => {
                                                                    setForm({ ...form, times: frequencyData.times });
                                                                }
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
                                    <Ionicons name="information-circle-outline" size={16} color="#666" />
                                    <Text style={styles.timesInfoText}>
                                        Tap any time to customize when you take this medication
                                    </Text>
                                </View>
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
                                        <View style={styles.timeButtonActions}>
                                            <Text style={styles.customTimeLabel}>
                                                {index === 0 ? "Tap to customize" : ""}
                                            </Text>
                                            <Ionicons 
                                                name='chevron-forward' 
                                                size={20} 
                                                color={"#666"}/>
                                        </View>
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
                                        
                                        console.log("🚨 User selected new time:", newTime);
                                        console.log("🚨 Updating time at index:", currentTimeIndex);
                                        console.log("🚨 Current form.times before update:", form.times);
                                        
                                        const newTimes = form.times.map((t,i)=>(i===currentTimeIndex ? newTime : t));
                                        
                                        console.log("🚨 New times array:", newTimes);
                                        
                                        setForm((prev) => ({
                                            ...prev,
                                            times: newTimes
                                        }));
                                        
                                        // Log after state update (will show in next render)
                                        setTimeout(() => {
                                            console.log("🚨 Form state after time update:", form.times);
                                        }, 100);
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
                        (isSubmitting || loading) && styles.saveButtonDisabled,
                    ]} onPress={() => handleSave()}
                        disabled={isSubmitting || loading}
                    >
                        <LinearGradient
                            colors={["#1a8e2d", "#146922"]}
                            style={styles.saveButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text style={styles.saveButtonText}>
                                {isSubmitting ? "Saving..." : 
                                 scannedMedications.length > 1 ? 
                                 `Save Medication ${selectedMedicationIndex + 1}/${scannedMedications.length}` : 
                                 "Add Medication"}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton}
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

// Add disabled button style
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
    disabledButton: {
        opacity: 0.6,
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
    // Progress Indicator Styles
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