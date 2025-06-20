// Enhanced Medications.jsx - With Collapsible Time Periods and Patient Dropdown Selector

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, Modal, AppState, Alert } from 'react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from 'react-native-svg';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { integratedPatientMedicationService } from '../../service/PatientMedicationService';
import { doseTrackingService } from '../../service/DoseTrackingService';
import { registerForPushnotificationsAsync, resetAllMedicationReminders, scheduleMedicationReminder } from '../../service/Notification';

const {width} = Dimensions.get("window");

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Time period definitions
const TIME_PERIODS = {
    MORNING: { label: 'Morning', icon: 'sunny-outline', color: '#FF9800', start: 5, end: 11 },
    AFTERNOON: { label: 'Afternoon', icon: 'partly-sunny-outline', color: '#2196F3', start: 12, end: 16 },
    EVENING: { label: 'Evening', icon: 'moon-outline', color: '#673AB7', start: 17, end: 20 },
    NIGHT: { label: 'Night', icon: 'moon', color: '#3F51B5', start: 21, end: 4 },
    AS_NEEDED: { label: 'As Needed', icon: 'medical-outline', color: '#4CAF50' }
};

// Helper function to determine time period from time string
const getTimePeriod = (timeString) => {
    if (!timeString || timeString === 'As Needed') {
        return 'AS_NEEDED';
    }
    
    const hour = parseInt(timeString.split(':')[0]);
    
    if (hour >= 5 && hour <= 11) return 'MORNING';
    if (hour >= 12 && hour <= 16) return 'AFTERNOON';
    if (hour >= 17 && hour <= 20) return 'EVENING';
    return 'NIGHT'; // 21-4 (next day)
};

// Modified QUICK_ACTIONS
const QUICK_ACTIONS = [
    {
        icon: "add-circle-outline",
        label: "Add \nMedications",
        route: "medications/add",
        color: "#2E7D32",
        gradient: ["#4CAF50", "#2E7D32"],
    },
    {
        icon: "calendar-outline",
        label: "Add \nCalendar",
        route: "medications/calendar",
        color: "#1976D2",
        gradient: ["#2196F3", "#1976D2"],
    },
    {
        icon: "document-text-outline",
        label: "Medical \nReports",
        route: "/medications/medical-reports",
        color: "#C2185B",
        gradient: ["#E91E63", "#C2185B"],
    },
    {
        icon: "notifications-outline",
        label: "Manage \nReminders",
        route: "/medications/reminders",
        color: "#FF6F00",
        gradient: ["#FF9800", "#FF6F00"],
    },
];

interface CircularProgressProps {
    progress: number;
    totalDoses: number;
    completeDoses: number;
}

function CircularProgress({
    progress,
    totalDoses,
    completeDoses  
}: CircularProgressProps) {
    const animationValue = useRef(new Animated.Value(0)).current;
    const size = width * 0.55;
    const strokeWidth = 15;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const safeProgress = isNaN(progress) || progress < 0 ? 0 : 
                    progress > 1 ? 1 : progress;

    const progressPercentage = progress * 100;

    useEffect(() => {
        Animated.timing(animationValue, {
            toValue: progress,
            duration: 1000,
            useNativeDriver: true,
        }).start();
    }, [progress]);

    const strokeDashoffset = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [circumference, 0],
    });

    return (
        <View style={styles.progressContainer}>
            <View style={styles.progressTextContainer}>
                <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
                <Text style={styles.progressLabel}>
                    {completeDoses} of {totalDoses} doses
                </Text>
            </View>
            <Svg width={size} height={size} style={styles.progressRing}>
                <Circle 
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <AnimatedCircle 
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="white"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
        </View>
    );
}

export default function Medications() {
    const router = useRouter();
    const [progress, setProgress] = useState(0);
    const [totalDoses, setTotalDoses] = useState(0);
    const [todaysMedications, setTodaysMedications] = useState([]);
    const [completedDoses, setCompletedDoses] = useState(0);
    const [doseHistory, setDoseHistory] = useState([]);
    const [medications, setMedications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [loading, setLoading] = useState(true);
    const [migrationComplete, setMigrationComplete] = useState(false);
    const [organizedMedications, setOrganizedMedications] = useState({});
    
    // Patient selection states
    const [selectedPatient, setSelectedPatient] = useState('all');
    const [availablePatients, setAvailablePatients] = useState([]);
    const [showPatientSelector, setShowPatientSelector] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // 🆕 NEW: Expanded sections state - all periods start expanded by default
    const [expandedSections, setExpandedSections] = useState({
        MORNING: true,
        AFTERNOON: true,
        EVENING: true,
        NIGHT: true,
        AS_NEEDED: true // As Needed is always expanded
    });

    // 🆕 NEW: Animation refs for smooth expand/collapse
    const animationRefs = useRef({
        MORNING: new Animated.Value(1),
        AFTERNOON: new Animated.Value(1),
        EVENING: new Animated.Value(1),
        NIGHT: new Animated.Value(1),
        AS_NEEDED: new Animated.Value(1)
    });

    // Helper function to check if medication is "As Needed"
    const isAsNeeded = (medication) => {
        return medication.frequencies === "As Needed" || 
               medication.frequency === "As Needed" ||
               !medication.times || 
               medication.times.length === 0;
    };

    // Helper function to check if dose is "As Needed" by ID pattern
    const isAsNeededDose = (doseId) => {
        return doseId.includes('as-needed');
    };

    // Get medication times with fallback for "As Needed"
    const getMedicationTimes = (medication) => {
        if (isAsNeeded(medication)) {
            return ["As Needed"];
        }
        return medication.times || [];
    };

    // 🆕 NEW: Toggle section expansion
    const toggleSection = (period) => {
        // Don't allow collapsing AS_NEEDED section
        if (period === 'AS_NEEDED') return;
        
        const isCurrentlyExpanded = expandedSections[period];
        const newExpandedState = !isCurrentlyExpanded;
        
        // Update expanded state
        setExpandedSections(prev => ({
            ...prev,
            [period]: newExpandedState
        }));
        
        // Animate the change
        Animated.timing(animationRefs.current[period], {
            toValue: newExpandedState ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    // 🆕 ENHANCED: Load user data and family members using service
    const loadUserAndFamilyData = useCallback(async () => {
        try {
            // Get current user context with family members from service
            const context = await integratedPatientMedicationService.getCurrentUserContext();
            setCurrentUser(context.userDetail);
            
            // Build available patients list
            const patients = [
                {
                    id: 'all',
                    name: 'All Patients',
                    type: 'all',
                    icon: 'people-outline',
                    color: '#1a8e2d'
                },
                {
                    id: context.ownerUserId,
                    name: context.userDetail.name || context.userDetail.firstName || 'You (Account Owner)',
                    type: 'owner',
                    icon: 'person-circle-outline',
                    color: '#2196F3'
                }
            ];

            // Add family members from service
            context.familyMembers.forEach((member) => {
                patients.push({
                    id: member.id,
                    name: member.name,
                    type: 'family',
                    icon: 'people-circle-outline',
                    color: '#FF9800',
                    relationship: member.relationship,
                    profileId: member.profileId
                });
            });

            setAvailablePatients(patients);
            console.log('📋 Available patients:', patients);
            
        } catch (error) {
            console.error('❌ Error loading user/family data:', error);
            // Fallback to basic user data
            try {
                const userDetail = await AsyncStorage.getItem('userDetail');
                if (userDetail) {
                    const user = JSON.parse(userDetail);
                    setCurrentUser(user);
                    setAvailablePatients([
                        {
                            id: 'all',
                            name: 'All Patients',
                            type: 'all',
                            icon: 'people-outline',
                            color: '#1a8e2d'
                        },
                        {
                            id: user.uid || user.userId || user.$id,
                            name: user.name || user.firstName || 'You (Account Owner)',
                            type: 'owner',
                            icon: 'person-circle-outline',
                            color: '#2196F3'
                        }
                    ]);
                }
            } catch (fallbackError) {
                console.error('❌ Fallback user data loading failed:', fallbackError);
            }
        }
    }, []);

    // 🚀 ENHANCED: Get patient name for medication with new schema fields
    const getPatientNameForMedication = useCallback((medication) => {
        // 🚀 NEW: Use database schema fields first
        if (medication.patientName) {
            return medication.patientName;
        }
        
        // Use enhanced patient information from service
        if (medication.patientInfo) {
            return medication.patientInfo.name;
        }
        
        // Legacy fallback
        return medication.patient_name || 
               medication.forPatient ||
               medication.assignedTo ||
               (currentUser?.name || currentUser?.firstName || 'You (Account Owner)');
    }, [currentUser]);

    // 🚀 ENHANCED: Filter medications by selected patient (optimized for new schema)
    const filterMedicationsByPatient = useCallback((medicationsArray) => {
        // Since the service now handles patient filtering during load with database queries,
        // this function is mainly for additional client-side filtering if needed
        if (selectedPatient === 'all') {
            return medicationsArray;
        }

        // Additional client-side filtering using new schema fields
        return medicationsArray.filter(medication => {
            // 🚀 NEW: Use database schema fields for filtering
            const medicationPatientId = medication.patientId || medication.patient_id;
            
            // Direct ID match (most efficient)
            if (medicationPatientId === selectedPatient) {
                return true;
            }
            
            // Handle owner case
            if (selectedPatient === 'owner' && currentUser) {
                const currentUserId = currentUser.uid || currentUser.userId || currentUser.$id;
                return medicationPatientId === currentUserId || 
                       medication.patientType === 'owner' ||
                       (!medication.isFamilyMember && !medicationPatientId);
            }
            
            // Use enhanced patient information as fallback
            if (medication.patientInfo) {
                return medication.patientInfo.id === selectedPatient;
            }
            
            return false;
        });
    }, [selectedPatient, currentUser]);

    // Updated organize medications function
    const organizeMedicationsByPatientAndTime = useCallback((medicationsArray) => {
        // First filter by selected patient
        const filteredMedications = filterMedicationsByPatient(medicationsArray);
        
        const organized = {};
        
        filteredMedications.forEach(medication => {
            const patientName = getPatientNameForMedication(medication);
            
            // Initialize patient if not exists
            if (!organized[patientName]) {
                organized[patientName] = {
                    MORNING: [],
                    AFTERNOON: [],
                    EVENING: [],
                    NIGHT: [],
                    AS_NEEDED: []
                };
            }
            
            const medicationTimes = getMedicationTimes(medication);
            
            // If it's "As Needed", add to AS_NEEDED category
            if (isAsNeeded(medication)) {
                organized[patientName].AS_NEEDED.push({
                    ...medication,
                    timeIndex: 0,
                    displayTime: 'As Needed'
                });
            } else {
                // Group by time periods
                medicationTimes.forEach((time, timeIndex) => {
                    const period = getTimePeriod(time);
                    organized[patientName][period].push({
                        ...medication,
                        timeIndex,
                        displayTime: time
                    });
                });
            }
        });
        
        // Sort medications within each time period by time
        Object.keys(organized).forEach(patientName => {
            Object.keys(organized[patientName]).forEach(period => {
                if (period !== 'AS_NEEDED') {
                    organized[patientName][period].sort((a, b) => {
                        const timeA = a.displayTime.split(':').map(Number);
                        const timeB = b.displayTime.split(':').map(Number);
                        const minutesA = timeA[0] * 60 + timeA[1];
                        const minutesB = timeB[0] * 60 + timeB[1];
                        return minutesA - minutesB;
                    });
                }
            });
        });
        
        return organized;
    }, [filterMedicationsByPatient, getPatientNameForMedication]);

    // 🆕 ENHANCED: Load medications with family member filtering
    const loadMedicationData = useCallback(async () => {
        try {
            console.log('🔄 Loading medication data for patient:', selectedPatient);
            setLoading(true);
            
            // Build filter based on selected patient
            const filters = {};
            if (selectedPatient !== 'all') {
                filters.patientId = selectedPatient;
            }
            
            // Load from enhanced service with family member support
            const [allMedications, todayDoses] = await Promise.all([
                integratedPatientMedicationService.getPatientMedications(filters),
                doseTrackingService.getTodaysDoses()
            ]);
            
            console.log("📋 Medications from service:", allMedications);
            console.log("📊 Today's doses:", todayDoses);
            
            // Verify arrays
            if (!Array.isArray(allMedications) || !Array.isArray(todayDoses)) {
                console.error("Expected arrays but got:", { allMedications, todayDoses });
                return;
            }
        
            // Set all medications
            setMedications(allMedications);
            setDoseHistory(todayDoses);
            
            // Filter today's medications
            const today = new Date();
            const todayMeds = allMedications.filter((med) => {
                const startDate = new Date(med.startDate);
                
                // Handle duration parsing
                let durationDays;
                if (med.duration === 'On going' || med.duration === 'Ongoing') {
                    durationDays = -1;
                } else {
                    const durationMatch = med.duration.match(/(\d+)/);
                    durationDays = durationMatch ? parseInt(durationMatch[1]) : 30;
                }
                
                return (
                    durationDays === -1 || 
                    (today >= startDate && 
                     today <= new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000))
                );
            });
            
            console.log("📅 Today's medications:", todayMeds);
            setTodaysMedications(todayMeds);
            
        } catch (error) {
            console.error("❌ Error loading medication data:", error);
            Alert.alert(
                'Loading Error',
                'Failed to load medications. Please check your connection and try again.',
                [
                    { text: 'Retry', onPress: () => loadMedicationData() },
                    { text: 'OK' }
                ]
            );
        } finally {
            setLoading(false);
        }
    }, [selectedPatient]); // 🆕 Added selectedPatient as dependency

    // SEPARATE function to process medications after loading - prevents infinite loop
    const processMedicationData = useCallback(() => {
        if (todaysMedications.length === 0) return;

        // Organize medications by patient and time
        const organized = organizeMedicationsByPatientAndTime(todaysMedications);
        setOrganizedMedications(organized);
        
        // Calculate progress based on filtered medications
        const filteredTodayMeds = filterMedicationsByPatient(todaysMedications);
        
        // Calculate total scheduled doses - exclude "As Needed" medications
        const totalScheduledDoses = filteredTodayMeds.reduce((total, med) => {
            if (isAsNeeded(med)) {
                return total;
            }
            return total + (med.times ? med.times.length : 1);
        }, 0);
        
        // Count completed doses ONLY for scheduled medications (exclude "As Needed")
        const completedDosesCount = doseHistory.filter(dose => {
            // Only count taken doses that are NOT "As Needed"
            const isForSelectedPatient = selectedPatient === 'all' || 
                filteredTodayMeds.some(med => med.id === dose.medication_id);
            return dose.taken && !isAsNeededDose(dose.dose_id) && isForSelectedPatient;
        }).length;
        
        const progressValue = totalScheduledDoses > 0 
            ? Math.min(completedDosesCount / totalScheduledDoses, 1)
            : 0;
        
        // Update all three states together
        setTotalDoses(totalScheduledDoses);
        setCompletedDoses(completedDosesCount);
        setProgress(progressValue);
        
        console.log("📊 Stats updated:", {
            selectedPatient,
            totalDoses: totalScheduledDoses,
            completedDoses: completedDosesCount,
            progress: progressValue
        });
    }, [todaysMedications, doseHistory, selectedPatient, organizeMedicationsByPatientAndTime, filterMedicationsByPatient]);

    // Simplified migration function
    const performMigration = useCallback(async () => {
        try {
            console.log('🔄 Checking for migration needs...');
            
            const migrationStatus = await AsyncStorage.getItem('dose_migration_complete');
            if (migrationStatus === 'true') {
                console.log('✅ Migration already completed');
                setMigrationComplete(true);
                return;
            }

            const result = await doseTrackingService.migrateDoseHistory();
            console.log('📊 Migration result:', result);
            
            if (result.migrated > 0) {
                Alert.alert(
                    'Data Migrated',
                    `Successfully migrated ${result.migrated} dose records to the cloud.`,
                    [{ text: 'OK' }]
                );
            }
            
            await AsyncStorage.setItem('dose_migration_complete', 'true');
            setMigrationComplete(true);
            
        } catch (error) {
            console.error('❌ Migration error:', error);
            setMigrationComplete(true);
        }
    }, []);

    const setupNotificationsOnce = async () => {
        try {
            console.log("🔔 Setting up notifications...");
    
            let token;
            try {
                token = await registerForPushnotificationsAsync();
            } catch (error) {
                console.log("Error getting push token:", error);
            }
    
            const medications = await integratedPatientMedicationService.getPatientMedications();
            console.log(`Setting up reminders for ${medications.length} medications`);
    
            const scheduledMedications = medications.filter(med => !isAsNeeded(med));
            console.log(`Setting up notifications for ${scheduledMedications.length} scheduled medications (excluding As Needed)`);
    
            await resetAllMedicationReminders(scheduledMedications);
    
            console.log("✅ Notification setup complete");
        } catch (error) {
            console.error("❌ Error setting up notifications:", error);
        }
    };

    // Initial load on component mount
    useEffect(() => {
        const initializeApp = async () => {
            await loadUserAndFamilyData();
            await performMigration();
            await loadMedicationData();
            await setupNotificationsOnce();
        };
        
        initializeApp();
        
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                loadMedicationData();
            }
        });
        
        return () => {
            subscription.remove();
        };
    }, []);

    // SEPARATE useEffect to process medications when data changes
    useEffect(() => {
        if (migrationComplete && todaysMedications.length > 0) {
            processMedicationData();
        }
    }, [todaysMedications, doseHistory, selectedPatient, migrationComplete, processMedicationData]);

    // Update on focus
    useFocusEffect(
        useCallback(() => {
            if (migrationComplete) {
                loadMedicationData();
            }
            return () => {};
        }, [loadMedicationData, migrationComplete])
    );

    // Handle dose tracking
    const handleTakeDose = async (medication, timeIndex = 0) => {
        try {
            const doseId = isAsNeeded(medication) 
                ? `${medication.id}-as-needed-${Date.now()}`
                : `${medication.id}-${timeIndex}`;
            
            if (!isAsNeeded(medication)) {
                const alreadyTaken = await doseTrackingService.isDoseTaken(doseId);
                if (alreadyTaken) {
                    console.log('Dose already taken:', doseId);
                    return;
                }
            }
            
            await doseTrackingService.recordDose(
                medication.id, 
                doseId, 
                true, 
                new Date().toISOString()
            );
            
            console.log('✅ Dose recorded successfully:', doseId);
            
            Alert.alert(
                "Dose Recorded", 
                `${medication.name} dose has been recorded successfully.`,
                [{ text: 'OK' }]
            );
            
            // Only reload data, processing will happen automatically
            await loadMedicationData();
            
        } catch (error) {
            console.error("❌ Error recording dose:", error);
            Alert.alert(
                "Error", 
                "Failed to record dose. Please check your connection and try again.",
                [
                    { text: 'Retry', onPress: () => handleTakeDose(medication, timeIndex) },
                    { text: 'OK' }
                ]
            );
        }
    };

    // Check dose status
    const isDoseTaken = useCallback((doseId, medication) => {
        if (isAsNeeded(medication)) {
            return doseHistory.some(dose => 
                dose.medication_id === medication.id &&
                dose.taken &&
                isAsNeededDose(dose.dose_id) &&
                isSameDay(new Date(dose.timestamp), new Date())
            );
        }
        
        return doseHistory.some(dose => 
            dose.dose_id === doseId && 
            dose.taken &&
            isSameDay(new Date(dose.timestamp), new Date())
        );
    }, [doseHistory]);

    function isSameDay(date1, date2) {
        return (
            date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate()
        );
    }

    // Patient selector component
    const renderPatientSelector = () => {
        const selectedPatientData = availablePatients.find(p => p.id === selectedPatient);
        
        return (
            <View style={styles.patientSelectorContainer}>
                <Text style={styles.patientSelectorLabel}>Viewing medications for:</Text>
                <TouchableOpacity 
                    style={styles.patientSelectorButton}
                    onPress={() => setShowPatientSelector(true)}
                >
                    <View style={styles.patientSelectorContent}>
                        <View style={[styles.patientSelectorIcon, { backgroundColor: `${selectedPatientData?.color}20` }]}>
                            <Ionicons 
                                name={selectedPatientData?.icon || 'person-outline'} 
                                size={20} 
                                color={selectedPatientData?.color || '#1a8e2d'} 
                            />
                        </View>
                        <Text style={styles.patientSelectorText}>
                            {selectedPatientData?.name || 'Select Patient'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    // Patient selector modal
    const renderPatientSelectorModal = () => (
        <Modal
            visible={showPatientSelector}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowPatientSelector(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.patientModalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Patient</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowPatientSelector(false)}
                        >
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={styles.patientList}>
                        {availablePatients.map((patient) => (
                            <TouchableOpacity
                                key={patient.id}
                                style={[
                                    styles.patientOption,
                                    selectedPatient === patient.id && styles.selectedPatientOption
                                ]}
                                onPress={() => {
                                    setSelectedPatient(patient.id);
                                    setShowPatientSelector(false);
                                }}
                            >
                                <View style={[styles.patientOptionIcon, { backgroundColor: `${patient.color}20` }]}>
                                    <Ionicons name={patient.icon} size={24} color={patient.color} />
                                </View>
                                <View style={styles.patientOptionContent}>
                                    <Text style={[
                                        styles.patientOptionName,
                                        selectedPatient === patient.id && styles.selectedPatientText
                                    ]}>
                                        {patient.name}
                                    </Text>
                                    <Text style={styles.patientOptionType}>
                                        {patient.type === 'owner' ? 'Account Owner' : 
                                         patient.type === 'family' ? `Family Member${patient.relationship ? ` (${patient.relationship})` : ''}` : 
                                         'All Patients'}
                                    </Text>
                                </View>
                                {selectedPatient === patient.id && (
                                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    // Render medication card
    const renderMedicationCard = (medication) => {
        const doseId = isAsNeeded(medication) 
            ? `${medication.id}-as-needed`
            : `${medication.id}-${medication.timeIndex}`;
        const taken = isDoseTaken(doseId, medication);
        
        return (
            <View key={`${medication.id}-${medication.timeIndex}`} style={styles.doseCard}>
                <View style={[styles.doseBadge, { backgroundColor: `${medication.color}15` }]}>
                    <Ionicons name="medical" size={24} />
                </View>
                <View style={styles.doseInfo}>
                    <View>
                        <Text style={styles.medicineName}>{medication.name}</Text>
                        <Text style={styles.dosageInfo}>
                            {medication.dosage} 
                            {medication.type ? ` · ${medication.type}` : ''}
                            {isAsNeeded(medication) 
                                ? ' · As Needed' 
                                : medication.times && medication.times.length > 1 ? ` · Dose ${medication.timeIndex + 1}/${medication.times.length}` : ''
                            }
                        </Text>
                        {medication.illnessType && (
                            <View style={styles.illnessTypeContainer}>
                                <Ionicons name="fitness-outline" size={14} color="#666" />
                                <Text style={styles.illnessTypeText}>For: {medication.illnessType}</Text>
                            </View>
                        )}
                        {isAsNeeded(medication) && medication.notes && (
                            <View style={styles.notesContainer}>
                                <Ionicons name="information-circle-outline" size={14} color="#666" />
                                <Text style={styles.notesText}>{medication.notes}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.doseTime}>
                        <Ionicons name="time-outline" size={14} color="#ccc" />
                        <Text style={styles.timeText}>{medication.displayTime}</Text>
                    </View>
                </View>
                {taken ? (
                    <View style={[styles.takeDoseButton, styles.takenButton]}>
                        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        <Text style={[styles.takeDoseText, styles.takenText]}>Taken</Text>
                    </View>
                ) : (
                    <TouchableOpacity 
                        style={[styles.takeDoseButton, { backgroundColor: medication.color }]} 
                        onPress={() => handleTakeDose(medication, medication.timeIndex)}
                    >
                        <Text style={styles.takeDoseText}>
                            {isAsNeeded(medication) ? 'Take Now' : 'Take'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    // 🆕 ENHANCED: Render time period section with collapse/expand functionality
    const renderTimePeriodSection = (patientName, period, medications) => {
        if (medications.length === 0) return null;
        
        const periodInfo = TIME_PERIODS[period];
        const isExpanded = expandedSections[period];
        const canToggle = period !== 'AS_NEEDED'; // AS_NEEDED can't be collapsed
        
        // Count taken and pending medications for this period
        const takenCount = medications.filter(medication => {
            const doseId = isAsNeeded(medication) 
                ? `${medication.id}-as-needed`
                : `${medication.id}-${medication.timeIndex}`;
            return isDoseTaken(doseId, medication);
        }).length;
        
        const totalCount = medications.length;
        const pendingCount = totalCount - takenCount;
        
        return (
            <View key={`${patientName}-${period}`} style={styles.timePeriodSection}>
                <TouchableOpacity 
                    style={[
                        styles.timePeriodHeader,
                        canToggle && styles.clickableHeader
                    ]}
                    onPress={() => canToggle && toggleSection(period)}
                    disabled={!canToggle}
                >
                    <View style={[styles.timePeriodIcon, { backgroundColor: `${periodInfo.color}20` }]}>
                        <Ionicons name={periodInfo.icon} size={20} color={periodInfo.color} />
                    </View>
                    <View style={styles.timePeriodContent}>
                        <Text style={[styles.timePeriodLabel, { color: periodInfo.color }]}>
                            {periodInfo.label}
                        </Text>
                        <View style={styles.medicationStats}>
                            <Text style={styles.medicationCount}>
                                {totalCount} medication{totalCount !== 1 ? 's' : ''}
                            </Text>
                            {takenCount > 0 && (
                                <View style={styles.progressIndicator}>
                                    <Text style={styles.takenCountText}>
                                        {takenCount}/{totalCount} taken
                                    </Text>
                                    <View style={styles.progressBar}>
                                        <View 
                                            style={[
                                                styles.progressFill, 
                                                { 
                                                    width: `${(takenCount / totalCount) * 100}%`,
                                                    backgroundColor: periodInfo.color 
                                                }
                                            ]} 
                                        />
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                    {canToggle && (
                        <Ionicons 
                            name={isExpanded ? "chevron-down" : "chevron-forward"} 
                            size={20} 
                            color="#666" 
                            style={styles.chevronIcon}
                        />
                    )}
                </TouchableOpacity>
                
                {/* 🆕 ENHANCED: Animated medication list */}
                <Animated.View
                    style={[
                        styles.medicationsList,
                        {
                            opacity: animationRefs.current[period],
                            maxHeight: animationRefs.current[period].interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 1000] // Large enough to accommodate all medications
                            }),
                            overflow: 'hidden'
                        }
                    ]}
                >
                    {isExpanded && medications.map(renderMedicationCard)}
                </Animated.View>
            </View>
        );
    };

    // Render patient section
    const renderPatientSection = (patientName, patientMedications) => {
        const hasAnyMedications = Object.values(patientMedications).some(meds => meds.length > 0);
        if (!hasAnyMedications) return null;
        
        return (
            <View key={patientName} style={styles.patientSection}>
                {selectedPatient === 'all' && (
                    <View style={styles.patientHeader}>
                        <View style={styles.patientIcon}>
                            <Ionicons name="person-outline" size={24} color="#1a8e2d" />
                        </View>
                        <Text style={styles.patientName}>{patientName}</Text>
                    </View>
                )}
                
                {renderTimePeriodSection(patientName, 'MORNING', patientMedications.MORNING)}
                {renderTimePeriodSection(patientName, 'AFTERNOON', patientMedications.AFTERNOON)}
                {renderTimePeriodSection(patientName, 'EVENING', patientMedications.EVENING)}
                {renderTimePeriodSection(patientName, 'NIGHT', patientMedications.NIGHT)}
                {renderTimePeriodSection(patientName, 'AS_NEEDED', patientMedications.AS_NEEDED)}
            </View>
        );
    };

    // Count of medications to show in the notification badge
    const medicationCount = filterMedicationsByPatient(todaysMedications).length;

    // 🆕 NEW: Helper method to add medication for specific patient
    const handleAddMedicationForPatient = useCallback((patientId) => {
        // Navigate to add medication screen with patient context
        router.push({
            pathname: '/medications/add',
            params: { patientId: patientId }
        });
    }, [router]);

    // 🆕 NEW: Helper method to view medications for specific patient
    const handleViewPatientMedications = useCallback((patientId) => {
        setSelectedPatient(patientId);
        // Reload data will happen automatically due to useEffect dependency
    }, []);

    return (
        <ScrollView style={styles.container}>
            <LinearGradient colors={["#0AD476", "#146922"]} style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.headerTop}>
                        <View style={{flex: 1}}>
                            <Text style={styles.greeting}>Daily Progress</Text>
                            {!migrationComplete && (
                                <Text style={styles.migrationText}>Syncing data...</Text>
                            )}
                        </View>
                        <TouchableOpacity 
                            style={styles.notificationButton}
                            onPress={() => setShowNotifications(true)} 
                        >
                            <Ionicons name="notifications-outline" size={24} color="white" />
                            {medicationCount > 0 && (
                                <View style={styles.notificationBadge}>
                                    <Text style={styles.notificationCount}>{medicationCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                    <CircularProgress 
                        progress={progress}
                        totalDoses={totalDoses}
                        completeDoses={completedDoses}
                    />
                </View>
            </LinearGradient>
     
            {/* Quick Action Section */}
            <View style={styles.content}>
                <View style={styles.quickActionsContainer}>
                    <Text style={styles.sectionTitle}>Quick Action</Text>
                    <View style={styles.quickActionsGrid}>
                        {QUICK_ACTIONS.map((action) => (
                            <Link href={action.route} key={action.label} asChild>
                                <TouchableOpacity style={styles.actionButton}>
                                    <LinearGradient colors={action.gradient} style={styles.actionGradient}>
                                        <View style={styles.actionContent}>
                                            <View style={styles.actionIcon}>
                                                <Ionicons name={action.icon} size={24} color="white"/>
                                            </View>
                                            <Text style={styles.actionLabel}>{action.label}</Text>
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Link>
                        ))}
                    </View>
                </View>
            </View>

            {/* Patient Selector */}
            {availablePatients.length > 2 && (
                <View style={{paddingHorizontal: 20}}>
                    {renderPatientSelector()}
                </View>
            )}

            {/* Today Medicine Section */}
            <View style={{paddingHorizontal: 20}}> 
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Today's Schedule</Text>
                    <Link href="/medications/calendar" asChild>
                        <TouchableOpacity>
                            <Text style={styles.seeAllButton}>See All</Text>
                        </TouchableOpacity>
                    </Link>
                </View>

                {/* Loading and empty states */}
                {loading ? (
                    <View style={styles.loadingState}>
                        <Ionicons name="refresh-outline" size={48} color="#ccc" />
                        <Text style={styles.loadingText}>Loading your medications...</Text>
                    </View>
                ) : Object.keys(organizedMedications).length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="medical-outline" size={48} color="#ccc" />
                        <Text style={styles.emptyStateText}>No Medications Scheduled for Today</Text>
                        <Text style={styles.emptyStateSubText}>
                            Add medications manually or scan a prescription QR code
                        </Text>
                        <Link href="/medications/add" asChild>
                            <TouchableOpacity style={styles.addMedicationButton}>
                                <Text style={styles.addMedicationButtonText}>Add Medication</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                ) : (
                    // Render organized medications by patient and time
                    Object.keys(organizedMedications).map(patientName => 
                        renderPatientSection(patientName, organizedMedications[patientName])
                    )
                )}

                {/* Additional Action Buttons */}
                <View style={styles.actionButtonsContainer}>                    
                    <TouchableOpacity 
                        style={styles.historyButton}
                        onPress={() => router.push('/medications/history')}
                    >
                        <Ionicons name="analytics" size={20} color="white" />
                        <Text style={styles.historyButtonText}>View History</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Patient Selector Modal */}
            {renderPatientSelectorModal()}

            {/* Notification Modal */}
            <Modal 
                visible={showNotifications} 
                transparent={true} 
                animationType="slide" 
                onRequestClose={() => setShowNotifications(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Today's Medications</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setShowNotifications(false)}                
                            >
                                <Ionicons name='close' size={24} color='#333' />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.notificationsList}>
                            {filterMedicationsByPatient(todaysMedications).map((medication) => (
                                <View key={medication.id} style={styles.notificationItem}>
                                    <View style={[styles.notificationIcon, { backgroundColor: `${medication.color}15` }]}>
                                        <Ionicons name='medical' size={24}/>
                                    </View>
                                    <View style={styles.notificationContent}>
                                        <Text style={styles.notificationTitle}>{medication.name}</Text>
                                        <Text style={styles.notificationMessage}>{medication.dosage}</Text>
                                        {medication.illnessType && (
                                            <Text style={styles.notificationIllness}>For: {medication.illnessType}</Text>
                                        )}
                                        <Text style={styles.notificationTime}>
                                            {isAsNeeded(medication) ? 'As Needed' : medication.times[0]}
                                        </Text>
                                        <Text style={styles.notificationPatient}>
                                            Patient: {medication.patientName || 
                                                     (medication.patientInfo ? medication.patientInfo.name : getPatientNameForMedication(medication))}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

// Enhanced styles with new collapsible functionality
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    header: {
        paddingTop: 50,
        paddingBottom: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        alignItems: "center",
        paddingHorizontal: 20,
    },
    headerTop: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        marginBottom: 20,
    },
    greeting: {
        color: "white",
        opacity: 0.9,
        fontWeight: "bold"
    },
    content: {
        flex: 1,
        paddingTop: 20,
    },
    notificationButton: {
        position: "relative",
        padding: 8,
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        borderRadius: 12,
        marginLeft: 8,
    },
    notificationBadge: {
        position: "absolute",
        top: -4,
        right: -4,
        backgroundColor: "#ff5252",
        borderRadius: 10,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 4,
        minWidth: 20,
        borderWidth: 2,
        borderColor: "#146922"
    },
    notificationCount: {
        fontSize: 11,
        fontWeight: "bold",
        color: "white",
    },
    progressContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 10,
    },
    progressTextContainer: {
        position: "absolute",
        zIndex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    progressPercentage: {
        fontSize: 36,
        fontWeight: "bold",
        color: "white",
    },
    progressLabel: {
        fontSize: 14,
        fontWeight: "bold",
        color: "rgba(255, 255, 255, 0.9)",
    },
    progressRing: {
        transform: [{rotate: "-90deg"}],
    },
    quickActionsContainer: {
        paddingHorizontal: 20,
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 5,
    },
    quickActionsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 15,
    },
    actionButton: {
        width: (width - 52) / 2,
        height: 100,
        borderRadius: 16,
        overflow: "hidden"
    },
    actionGradient: {
        flex: 1,
        padding: 15,
    },
    actionContent: {
        flex: 1,
        justifyContent: "space-between",
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    actionLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "white",
        marginTop: 8,
    },
    // Patient selector styles
    patientSelectorContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    patientSelectorLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    patientSelectorButton: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
    },
    patientSelectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    patientSelectorIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    patientSelectorText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    patientModalContent: {
        backgroundColor: "white",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: "60%",
    },
    patientList: {
        maxHeight: 300,
    },
    patientOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: '#f8f9fa',
    },
    selectedPatientOption: {
        backgroundColor: '#e6f7e9',
        borderWidth: 2,
        borderColor: '#4CAF50',
    },
    patientOptionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    patientOptionContent: {
        flex: 1,
    },
    patientOptionName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    selectedPatientText: {
        color: '#4CAF50',
    },
    patientOptionType: {
        fontSize: 14,
        color: '#666',
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    seeAllButton: {
        color: "#2E7D32",
        fontWeight: "600",
    },
    loadingState: {
        alignItems: "center",
        padding: 30,
        backgroundColor: "white",
        borderRadius: 16,
        marginTop: 16,
    },
    loadingText: {
        fontSize: 16,
        color: "#666",
        marginTop: 10,
    },
    emptyState: {
        alignItems: "center",
        padding: 30,
        backgroundColor: "white",
        borderRadius: 16,
        marginTop: 16,
    },
    emptyStateText: {
        fontSize: 16,
        color: "#666",
        marginTop: 10,
        marginBottom: 5,
    },
    emptyStateSubText: {
        fontSize: 14,
        color: "#999",
        textAlign: "center",
        marginBottom: 20,
    },
    addMedicationButton: {
        backgroundColor: "#1a8e2d",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    addMedicationButtonText: {
        color: "white",
        fontWeight: "600",
    },
    // Patient section styles
    patientSection: {
        marginBottom: 25,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    patientHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    patientIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e6f7e9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    patientName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a8e2d',
    },
    // 🆕 ENHANCED: Time period section styles with collapsible functionality
    timePeriodSection: {
        marginBottom: 20,
    },
    timePeriodHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 8,
    },
    clickableHeader: {
        backgroundColor: '#f8f9fa',
    },
    timePeriodIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    timePeriodContent: {
        flex: 1,
    },
    timePeriodLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    medicationStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    medicationCount: {
        fontSize: 12,
        color: '#666',
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    progressIndicator: {
        flex: 1,
        maxWidth: 120,
    },
    takenCountText: {
        fontSize: 11,
        color: '#4CAF50',
        fontWeight: '500',
        marginBottom: 2,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#e0e0e0',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    chevronIcon: {
        marginLeft: 8,
    },
    // 🆕 NEW: Animated medications list container
    medicationsList: {
        overflow: 'hidden',
    },
    doseCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        marginLeft: 44,
        borderLeftWidth: 3,
        borderLeftColor: '#e0e0e0',
    },
    doseBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    doseInfo: {
        flex: 1,
        justifyContent: "space-between",
    },
    medicineName: {
        fontSize: 15,
        fontWeight: "600",
        color: "#333",
        marginBottom: 3,
    },
    dosageInfo: {
        fontSize: 13,
        color: "#666",
        marginBottom: 3,
    },
    doseTime: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
    },
    illnessTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    illnessTypeText: {
        fontSize: 12,
        color: '#666',
        marginLeft: 5,
    },
    notesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    notesText: {
        fontSize: 11,
        color: '#666',
        marginLeft: 5,
        fontStyle: 'italic',
    },
    timeText: {
        marginLeft: 5,
        color: "#666",
        fontSize: 13,
        fontWeight: '500',
    },
    takeDoseButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginLeft: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    takeDoseText: {
        color: "white",
        fontWeight: "600",
        fontSize: 13,
    },
    takenButton: {
        backgroundColor: "#f0f0f0",
        borderWidth: 1,
        borderColor: "#4CAF50",
    },
    takenText: {
        color: "#4CAF50",
    },
    actionButtonsContainer: {
        marginTop: 20,
        marginBottom: 30,
    },
    historyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1976D2',
        borderRadius: 8,
        padding: 12,
        marginVertical: 5,
    },
    historyButtonText: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "white",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
    },
    closeButton: {
        padding: 5,
    },
    notificationsList: {
        maxHeight: 400,
    },
    notificationItem: {
        flexDirection: "row",
        padding: 15,
        borderRadius: 12,
        backgroundColor: "#f5f5f5",
        marginBottom: 10,
    },
    notificationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 15,
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 4,
    },
    notificationMessage: {
        fontSize: 14,
        color: "#333",
        marginBottom: 4,
    },
    notificationIllness: {
        fontSize: 13,
        color: '#666',
        marginBottom: 2,
    },
    notificationTime: {
        fontSize: 12,
        color: "#999",
        marginBottom: 2,
    },
    notificationPatient: {
        fontSize: 12,
        color: "#1a8e2d",
        fontWeight: '500',
    },
});