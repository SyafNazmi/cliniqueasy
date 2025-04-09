import { View, Text, ScrollView, TextInput, TouchableOpacity, Switch, StyleSheet, Platform, Dimensions, Alert } from 'react-native'
import React, { useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import PageHeader from '../../components/PageHeader'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router } from 'expo-router'
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

    const [form, setForm] = useState({
        name: "",
        type: "", // Added medication type
        dosage: "",
        frequencies: "",
        duration: "",
        startDate: new Date(),
        times: ["09:00"],
        notes: "",
        reminderEnabled: true,
        refillReminder: false,
        currentSupply: "",
        refillAt: "",
    });

    const [errors, setErrors] = useState({});
    const [selectedType, setSelectedType] = useState(""); // Added for medication type
    const [selectedFrequency, setSelectedFrequency] = useState("");
    const [selectedDuration, setSelectedDuration] = useState("");
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentTimeIndex, setCurrentTimeIndex] = useState(0); // Added to track which time is being edited

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

  const handleSave = async() => {
    try {
        if (!validateForm()) {
            Alert.alert("Error", "Please fill in all required fields correctly!");
            return;
        }

        if (isSubmitting) return;
        setIsSubmitting(true);

        // Generate a random color
        const colorPalette = [
            '#4CAF50', // Green
            '#2196F3', // Blue
            '#9C27B0', // Purple
            '#FF9800', // Orange
            '#F44336', // Red
            '#009688', // Teal
            '#795548', // Brown
            '#607D8B', // Blue Grey
            '#3F51B5', // Indigo
            '#00BCD4', // Cyan
            '#8BC34A', // Light Green
            '#FF5722', // Deep Orange
            '#673AB7', // Deep Purple
            '#FFEB3B', // Yellow
            '#03A9F4'  // Light Blue
        ];
        const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];

        const medicationData = {
            id: Math.random().toString(36).substr(2, 9),
            ...form,
            currentSupply: form.currentSupply ? Number(form.currentSupply) : 0,
            totalSupply: form.currentSupply ? Number(form.currentSupply) : 0,
            refillAt: form.refillAt ? Number(form.refillAt) : 0,
            startDate: form.startDate.toISOString(),
            color: randomColor, 
        };

        await addMedication(medicationData);
        // Schedule reminders if enabled
        if (medicationData.reminderEnabled) {
            console.log("Scheduling reminders with data:", {
                reminderEnabled: medicationData.reminderEnabled,
                times: medicationData.times,
              });
              
              // Ensure reminderEnabled is properly set
              medicationData.reminderEnabled = form.reminderEnabled === true;
              
              // Make sure times array is properly formatted before scheduling
              if (!Array.isArray(medicationData.times) || medicationData.times.length === 0) {
                console.error("No medication times found!");
                // Add default times if needed or show error
                Alert.alert("Error", "Please add at least one medication time");
                return;
              }
              
              // Then schedule the notification
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
        
        <ScrollView showsVerticalScrollIndicator={false} style={{flex: 1}}
         contentContainerStyle={styles.formContentContainer}>
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
            {/* Refill Tracker */}
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
  )
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