import { View, Text, ScrollView, TextInput, TouchableOpacity, Switch, StyleSheet, Platform, Dimensions, Alert } from 'react-native'
import React, { useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import PageHeader from '../../components/PageHeader'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router } from 'expo-router'

const {width} = Dimensions.get("window");

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
    const [selectedFrequency, setSelectedFrequency] = useState("");
    const [selectedDuration, setSelectedDuration] = useState("");
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const renderFrequencyOptions = () => {
        return (
            <View style={styles.optionGrid}>
                {FREQUENCIES.map((freq)=> (
                    <TouchableOpacity 
                    key={freq.id}
                    style={[styles.optionCard, selectedFrequency === freq.label && styles.selectedOptionCard]}
                    onPress={() => setSelectedFrequency(freq.label)}
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
                    onPress={() => setSelectedDuration(dur.label)}
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
    const newErrors: {[key:string] : string} = {};

    if (!form.name.trim()) {
        newErrors.name = "Medication name is required";
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
                        const [hours, minutes] = form.times[0].split(":").map(Number);
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
                                    times: prev.times.map((t,i)=>(i===0 ? newTime : t))
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
            ]}>
                <LinearGradient
                 colors={["#1a8e2d", "#146922"]}
                 style={styles.saveButtonGradient}
                 start={{ x: 0, y: 0 }}
                 end={{ x: 1, y: 1 }}
                >
                <Text style={styles.saveButtonText}>Add Medications { isSubmitting ? "Adding..." : "Add Medication"}</Text>
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
        backgroundColor: "#f8f9fa",
    },
    headerGradient: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: Platform.OS === 'ios'? 140 : 120,
    },
    content: {
        flex: 1,
        paddingTop: Platform.OS === 'ios'? 50 : 30,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        zIndex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "white",
        marginLeft: 15,
    },
    formContentContainer: {
        padding: 20,
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 15,
        marginTop: 10,
    },
    inputContainer: {
        backgroundColor: "white",
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    mainInput: {
        fontSize: 20,
        color: "#333",
        padding: 15,
    },
    inputError: {
        borderColor: "#ff5252",
    },
    errorText: {
        color: "#FF5252",
        fontSize: 12,
        marginTop: 4,
        marginLeft: 12,
    },

    optionGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginHorizontal: -5,
    },
    optionCard: {
        width: (width - 60) / 2,
        backgroundColor: "white",
        borderRadius: 16,
        padding: 15,
        margin: 5,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#e0e0e0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    selectedOptionCard: {
        backgroundColor: "#1a8e2d",
        borderColor: "#1a8e2d",
    },
    optionIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#f5f5f5",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
    },
    selectedOptionIcon: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    optionLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
        textAlign: "center",
    },
    selectedOptionLabel: {
        color: "white",
    },
    durationNumber: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1a8e2d",
        marginBottom: 5,
    },
    selectedDurationNumber: {
        color: "white",
    },
    dateButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        borderRadius: 16,
        padding: 15,
        marginTop: 15,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,

    },
    dateIconContainer : {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#f5f5f5",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    dateButtonText : {
        flex: 1,
        fontSize: 16,
        color: "#333",
    },
    timesContainer : {
        marginTop: 20,
    },
    timesTitle : {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 10,
    },
    timesIconContainer : {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#f5f5f5",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    timeButton : {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        borderRadius: 16,
        padding: 15,
        marginTop: 15,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    timeButtonText : {
        flex: 1,
        fontSize: 16,
        color: "#333",
    },
    card : {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    switchRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    switchLabelContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        marginRight: 10,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#f5f5f5",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 15,
    },
    switchTextContainer: {
        flex: 1,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    switchSubLabel: {
        fontSize: 14,
        color: "#666",
        marginTop: 2,
    },
    textAreaContainer : {
        backgroundColor: "white",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    textArea : {
        height: 100,
        padding: 15,
        fontSize: 16,
        color: "#333"
    },
    saveButton : {
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 12,
    },
    saveButtonDisabled : {
        opacity: 0.7,
    },
    saveButtonGradient : {
        paddingVertical: 15,
        justifyContent: "center",
        alignItems: "center",
    },
    saveButtonText : {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
    },
    cancelButton : {
        paddingVertical: 15,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#e0e0e0",
    },
    cancelButtonText : {
        fontSize: 16,
        fontWeight: "600",
        color: "#666",
    },
    footer : {
        padding: 20,
        backgroundColor: "white",
        borderTopWidth: 1,
        borderColor: "#e0e0e0",
    },
});