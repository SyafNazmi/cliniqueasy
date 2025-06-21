// app/medications/medical-reports.jsx - Enhanced with Patient Categories and Better UX
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Dimensions, Alert, Share, Modal } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Import from Appwrite services
import { integratedPatientMedicationService } from '../../service/PatientMedicationService';
import { doseTrackingService } from '../../service/DoseTrackingService';

const { width } = Dimensions.get("window");

export default function MedicalReportsScreen() {
    const router = useRouter();
    const [medications, setMedications] = useState([]);
    const [doseHistory, setDoseHistory] = useState([]);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('30');
    
    // 🆕 NEW: Patient filtering states
    const [selectedPatient, setSelectedPatient] = useState('all');
    const [availablePatients, setAvailablePatients] = useState([]);
    const [showPatientSelector, setShowPatientSelector] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    
    // 🆕 NEW: View mode states
    const [viewMode, setViewMode] = useState('overview'); // overview, by-patient, by-category
    const [expandedPatients, setExpandedPatients] = useState({});

    const REPORT_PERIODS = [
        { label: '7 Days', value: '7' },
        { label: '30 Days', value: '30' },
        { label: '90 Days', value: '90' }
    ];

    const VIEW_MODES = [
        { label: 'Overview', value: 'overview', icon: 'stats-chart' },
        { label: 'By Patient', value: 'by-patient', icon: 'people' },
        { label: 'By Category', value: 'by-category', icon: 'medical' }
    ];

    useEffect(() => {
        loadUserAndFamilyData();
    }, []);

    useEffect(() => {
        if (availablePatients.length > 0) {
            loadReportData();
        }
    }, [selectedPeriod, selectedPatient, availablePatients]);

    // 🆕 ENHANCED: Load user data and family members
    const loadUserAndFamilyData = useCallback(async () => {
        try {
            const context = await integratedPatientMedicationService.getCurrentUserContext();
            setCurrentUser(context.userDetail);
            
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
            console.log('📋 Available patients for reports:', patients);
            
        } catch (error) {
            console.error('❌ Error loading user/family data:', error);
        }
    }, []);

    // Helper functions
    const isAsNeeded = (medication) => {
        return medication.frequencies === "As Needed" || 
               medication.frequency === "As Needed" ||
               !medication.times || 
               medication.times.length === 0;
    };

    const isAsNeededDose = (doseId) => {
        return doseId.includes('as-needed');
    };

    const getPatientNameForMedication = useCallback((medication) => {
        if (medication.patientName) {
            return medication.patientName;
        }
        if (medication.patientInfo) {
            return medication.patientInfo.name;
        }
        return medication.patient_name || 
               medication.forPatient ||
               medication.assignedTo ||
               (currentUser?.name || currentUser?.firstName || 'You (Account Owner)');
    }, [currentUser]);

    // 🆕 ENHANCED: Load report data with patient filtering
    const loadReportData = async () => {
        try {
            setLoading(true);
            console.log('🔄 Loading medical report data for patient:', selectedPatient);
            
            // Build filter based on selected patient
            const filters = {};
            if (selectedPatient !== 'all') {
                filters.patientId = selectedPatient;
            }
            
            const [allMedications, allDoseHistory] = await Promise.all([
                integratedPatientMedicationService.getPatientMedications(filters),
                doseTrackingService.getAllDoseHistory()
            ]);

            console.log("📋 Medical report medications:", allMedications);
            console.log("📊 Medical report dose history:", allDoseHistory);

            setMedications(allMedications || []);
            setDoseHistory(allDoseHistory || []);

            // Generate enhanced report data
            const report = generateEnhancedMedicalReport(allMedications || [], allDoseHistory || [], parseInt(selectedPeriod));
            setReportData(report);
        } catch (error) {
            console.error('❌ Error loading report data:', error);
            Alert.alert('Error', 'Failed to load report data. Please check your connection and try again.');
            setMedications([]);
            setDoseHistory([]);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const isSameDay = (date1, date2) => {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return (
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate()
        );
    };

    // 🆕 ENHANCED: Generate medical report with patient categorization
    const generateEnhancedMedicalReport = (medications, doseHistory, periodDays) => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        const periodHistory = doseHistory.filter(dose => {
            const doseDate = new Date(dose.timestamp);
            return doseDate >= startDate && doseDate <= endDate;
        });

        // 🆕 NEW: Group medications by patient
        const medicationsByPatient = {};
        const patientStats = {};

        medications.forEach(medication => {
            const patientName = getPatientNameForMedication(medication);
            
            if (!medicationsByPatient[patientName]) {
                medicationsByPatient[patientName] = [];
                patientStats[patientName] = {
                    total: 0,
                    scheduled: 0,
                    asNeeded: 0,
                    totalDoses: 0,
                    expectedDoses: 0,
                    adherenceRate: 0,
                    color: availablePatients.find(p => p.name === patientName)?.color || '#666'
                };
            }
            
            medicationsByPatient[patientName].push(medication);
            patientStats[patientName].total++;
            
            if (isAsNeeded(medication)) {
                patientStats[patientName].asNeeded++;
            } else {
                patientStats[patientName].scheduled++;
            }
        });

        // Generate reports for each patient
        const patientReports = {};
        Object.keys(medicationsByPatient).forEach(patientName => {
            const patientMedications = medicationsByPatient[patientName];
            const patientReport = generatePatientReport(patientMedications, periodHistory, periodDays, patientName);
            patientReports[patientName] = patientReport;
            
            // Update patient stats
            patientStats[patientName].totalDoses = patientReport.totalTaken;
            patientStats[patientName].expectedDoses = patientReport.totalExpected;
            patientStats[patientName].adherenceRate = patientReport.overallAdherence;
        });

        // 🆕 NEW: Category analysis
        const categoryAnalysis = generateCategoryAnalysis(medications, periodHistory);

        // Overall statistics
        const totalScheduledMeds = medications.filter(med => !isAsNeeded(med)).length;
        const totalAsNeededMeds = medications.filter(med => isAsNeeded(med)).length;
        const totalExpected = Object.values(patientReports).reduce((sum, report) => sum + report.totalExpected, 0);
        const totalTaken = Object.values(patientReports).reduce((sum, report) => sum + report.totalTaken, 0);
        const overallAdherence = totalExpected > 0 ? Math.round((totalTaken / totalExpected) * 100) : 0;

        return {
            period: `${periodDays} Days`,
            startDate: startDate.toLocaleDateString(),
            endDate: endDate.toLocaleDateString(),
            overallAdherence,
            totalMedications: medications.length,
            scheduledMedications: totalScheduledMeds,
            asNeededMedications: totalAsNeededMeds,
            totalDosesTaken: totalTaken,
            totalDosesExpected: totalExpected,
            patientReports,
            patientStats,
            categoryAnalysis,
            generatedAt: new Date().toLocaleString(),
            selectedPatient: selectedPatient
        };
    };

    // 🆕 NEW: Generate individual patient report
    const generatePatientReport = (medications, periodHistory, periodDays, patientName) => {
        const medicationReports = medications.map(medication => {
            const medicationDoses = periodHistory.filter(dose => dose.medication_id === medication.id);
            const takenDoses = medicationDoses.filter(dose => dose.taken);
            
            if (isAsNeeded(medication)) {
                const lastTakenDose = takenDoses.length > 0 ? 
                    new Date(Math.max(...takenDoses.map(dose => new Date(dose.timestamp)))) : null;

                return {
                    ...medication,
                    isAsNeeded: true,
                    takenDoses: takenDoses.length,
                    expectedDoses: null,
                    adherenceRate: null,
                    missedDoses: null,
                    activeDays: periodDays,
                    currentStreak: null,
                    lastTaken: lastTakenDose ? lastTakenDose.toLocaleDateString() : 'Never',
                    status: takenDoses.length > 0 ? 'used' : 'unused',
                    usageFrequency: takenDoses.length > 0 ? (takenDoses.length / periodDays).toFixed(2) : '0'
                };
            } else {
                const dailyDoses = medication.times ? medication.times.length : 1;
                const medStartDate = new Date(medication.startDate);
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - periodDays);
                const effectiveStartDate = medStartDate > startDate ? medStartDate : startDate;
                
                let medEndDate;
                if (medication.duration === 'On going' || medication.duration === 'Ongoing') {
                    medEndDate = new Date();
                } else {
                    const durationMatch = medication.duration.match(/(\d+)/);
                    const durationDays = durationMatch ? parseInt(durationMatch[1]) : 30;
                    medEndDate = new Date(medStartDate);
                    medEndDate.setDate(medStartDate.getDate() + durationDays);
                    if (medEndDate > new Date()) medEndDate = new Date();
                }
                
                const activeDays = Math.max(0, Math.floor((medEndDate - effectiveStartDate) / (24 * 60 * 60 * 1000)) + 1);
                const expectedDoses = activeDays * dailyDoses;
                const adherenceRate = expectedDoses > 0 ? (takenDoses.length / expectedDoses) * 100 : 0;
                const missedDoses = Math.max(0, expectedDoses - takenDoses.length);
                const lastTakenDose = takenDoses.length > 0 ? 
                    new Date(Math.max(...takenDoses.map(dose => new Date(dose.timestamp)))) : null;
                
                let currentStreak = 0;
                const today = new Date();
                for (let i = 0; i < 7; i++) {
                    const checkDate = new Date(today);
                    checkDate.setDate(today.getDate() - i);
                    
                    const dayDoses = takenDoses.filter(dose => {
                        const doseDate = new Date(dose.timestamp);
                        return isSameDay(doseDate, checkDate);
                    });
                    
                    if (dayDoses.length >= dailyDoses) {
                        currentStreak++;
                    } else {
                        break;
                    }
                }

                return {
                    ...medication,
                    isAsNeeded: false,
                    takenDoses: takenDoses.length,
                    expectedDoses,
                    adherenceRate: Math.round(adherenceRate),
                    missedDoses,
                    activeDays,
                    currentStreak,
                    lastTaken: lastTakenDose ? lastTakenDose.toLocaleDateString() : 'Never',
                    status: adherenceRate >= 90 ? 'excellent' : 
                           adherenceRate >= 70 ? 'good' : 
                           adherenceRate >= 50 ? 'fair' : 'needs_attention'
                };
            }
        });

        const scheduledMeds = medicationReports.filter(med => !med.isAsNeeded);
        const asNeededMeds = medicationReports.filter(med => med.isAsNeeded);
        
        const totalExpected = scheduledMeds.reduce((sum, med) => sum + (med.expectedDoses || 0), 0);
        const totalTaken = scheduledMeds.reduce((sum, med) => sum + med.takenDoses, 0);
        const overallAdherence = totalExpected > 0 ? Math.round((totalTaken / totalExpected) * 100) : 0;

        return {
            patientName,
            totalMedications: medications.length,
            scheduledMedications: scheduledMeds.length,
            asNeededMedications: asNeededMeds.length,
            totalExpected,
            totalTaken,
            overallAdherence,
            medicationReports: medicationReports.sort((a, b) => {
                if (a.isAsNeeded && !b.isAsNeeded) return 1;
                if (!a.isAsNeeded && b.isAsNeeded) return -1;
                if (a.isAsNeeded && b.isAsNeeded) return b.takenDoses - a.takenDoses;
                return (b.adherenceRate || 0) - (a.adherenceRate || 0);
            }),
            excellentMeds: scheduledMeds.filter(med => med.status === 'excellent').length,
            needsAttentionMeds: scheduledMeds.filter(med => med.status === 'needs_attention').length,
            asNeededUsed: asNeededMeds.filter(med => med.status === 'used').length,
        };
    };

    // 🆕 NEW: Generate category analysis
    const generateCategoryAnalysis = (medications, periodHistory) => {
        const categories = {};
        
        medications.forEach(medication => {
            const category = medication.illnessType || 'Other';
            if (!categories[category]) {
                categories[category] = {
                    name: category,
                    medications: [],
                    totalMeds: 0,
                    scheduledMeds: 0,
                    asNeededMeds: 0,
                    totalDoses: 0,
                    expectedDoses: 0,
                    adherenceRate: 0
                };
            }
            
            categories[category].medications.push(medication);
            categories[category].totalMeds++;
            
            if (isAsNeeded(medication)) {
                categories[category].asNeededMeds++;
            } else {
                categories[category].scheduledMeds++;
            }
        });

        // Calculate stats for each category
        Object.values(categories).forEach(category => {
            const scheduledMeds = category.medications.filter(med => !isAsNeeded(med));
            
            let totalExpected = 0;
            let totalTaken = 0;
            
            scheduledMeds.forEach(medication => {
                const medicationDoses = periodHistory.filter(dose => dose.medication_id === medication.id);
                const takenDoses = medicationDoses.filter(dose => dose.taken);
                
                const dailyDoses = medication.times ? medication.times.length : 1;
                const periodDays = 30; // Use selected period here if needed
                const expectedDoses = periodDays * dailyDoses;
                
                totalExpected += expectedDoses;
                totalTaken += takenDoses.length;
            });
            
            category.totalDoses = totalTaken;
            category.expectedDoses = totalExpected;
            category.adherenceRate = totalExpected > 0 ? Math.round((totalTaken / totalExpected) * 100) : 0;
        });

        return Object.values(categories).sort((a, b) => b.totalMeds - a.totalMeds);
    };

    // 🆕 NEW: Patient selector modal
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

    // 🆕 NEW: Patient selector component
    const renderPatientSelector = () => {
        if (availablePatients.length <= 2) return null;
        
        const selectedPatientData = availablePatients.find(p => p.id === selectedPatient);
        
        return (
            <View style={styles.patientSelectorContainer}>
                <Text style={styles.patientSelectorLabel}>Report for:</Text>
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

    // Enhanced export functionality
    const exportReport = async () => {
        if (!reportData) return;

        try {
            const reportText = generateEnhancedReportText(reportData);
            await Share.share({
                message: reportText,
                title: `Medical Report - ${reportData.period}`,
                subject: `Medical Adherence Report - ${reportData.period}`
            });
        } catch (error) {
            console.error('Error sharing report:', error);
            Alert.alert('Error', 'Failed to export report');
        }
    };

    // Enhanced report text generation
    const generateEnhancedReportText = (data) => {
        let report = `📋 COMPREHENSIVE MEDICAL REPORT\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `Generated: ${data.generatedAt}\n`;
        report += `Period: ${data.startDate} to ${data.endDate}\n`;
        report += `Patient(s): ${selectedPatient === 'all' ? 'All Patients' : availablePatients.find(p => p.id === selectedPatient)?.name}\n\n`;
        
        // Executive Summary
        report += `📊 EXECUTIVE SUMMARY\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `Overall Adherence Rate: ${data.overallAdherence}%\n`;
        report += `Total Active Medications: ${data.totalMedications}\n`;
        report += `  • Scheduled: ${data.scheduledMedications}\n`;
        report += `  • As Needed: ${data.asNeededMedications}\n`;
        report += `Total Doses Taken: ${data.totalDosesTaken}/${data.totalDosesExpected}\n\n`;

        // Patient-specific reports
        if (Object.keys(data.patientReports).length > 1) {
            report += `👥 PATIENT BREAKDOWN\n`;
            report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            Object.values(data.patientReports).forEach(patientReport => {
                report += `${patientReport.patientName}:\n`;
                report += `  Medications: ${patientReport.totalMedications} (${patientReport.scheduledMedications} scheduled, ${patientReport.asNeededMedications} as needed)\n`;
                report += `  Adherence: ${patientReport.overallAdherence}%\n`;
                report += `  Doses: ${patientReport.totalTaken}/${patientReport.totalExpected}\n\n`;
            });
        }

        // Category Analysis
        if (data.categoryAnalysis.length > 0) {
            report += `🏥 CONDITION CATEGORIES\n`;
            report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            data.categoryAnalysis.forEach(category => {
                report += `${category.name}:\n`;
                report += `  Medications: ${category.totalMeds}\n`;
                report += `  Adherence: ${category.adherenceRate}%\n`;
                report += `  Doses: ${category.totalDoses}/${category.expectedDoses}\n\n`;
            });
        }

        // 🆕 RESTORED: Detailed medication breakdown (from original)
        report += `💊 DETAILED MEDICATION BREAKDOWN\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        
        // Get all medications from all patient reports
        const allMedicationReports = [];
        Object.values(data.patientReports).forEach(patientReport => {
            allMedicationReports.push(...patientReport.medicationReports);
        });

        // Separate scheduled and as needed medications
        const scheduledMeds = allMedicationReports.filter(med => !med.isAsNeeded);
        const asNeededMeds = allMedicationReports.filter(med => med.isAsNeeded);
        
        if (scheduledMeds.length > 0) {
            report += `📅 SCHEDULED MEDICATIONS:\n`;
            scheduledMeds.forEach((med, index) => {
                const statusEmoji = med.status === 'excellent' ? '🟢' : 
                                  med.status === 'good' ? '🟡' : 
                                  med.status === 'fair' ? '🟠' : '🔴';
                
                report += `${index + 1}. ${statusEmoji} ${med.name}\n`;
                if (selectedPatient === 'all') {
                    report += `   Patient: ${getPatientNameForMedication(med)}\n`;
                }
                report += `   Condition: ${med.illnessType || 'Not specified'}\n`;
                report += `   Dosage: ${med.dosage} ${med.type ? `(${med.type})` : ''}\n`;
                report += `   Schedule: ${med.times ? med.times.join(', ') : 'Not specified'}\n`;
                report += `   Adherence: ${med.adherenceRate}% (${med.takenDoses}/${med.expectedDoses} doses)\n`;
                report += `   Current Streak: ${med.currentStreak} days\n`;
                report += `   Last Taken: ${med.lastTaken}\n`;
                if (med.missedDoses > 0) {
                    report += `   ⚠️ Missed Doses: ${med.missedDoses}\n`;
                }
                report += `\n`;
            });
        }

        if (asNeededMeds.length > 0) {
            report += `🆘 AS NEEDED MEDICATIONS:\n`;
            asNeededMeds.forEach((med, index) => {
                const statusEmoji = med.status === 'used' ? '✅' : '⚪';
                
                report += `${index + 1}. ${statusEmoji} ${med.name}\n`;
                if (selectedPatient === 'all') {
                    report += `   Patient: ${getPatientNameForMedication(med)}\n`;
                }
                report += `   Condition: ${med.illnessType || 'Not specified'}\n`;
                report += `   Dosage: ${med.dosage} ${med.type ? `(${med.type})` : ''}\n`;
                report += `   Usage: ${med.takenDoses} doses taken\n`;
                report += `   Usage Frequency: ${med.usageFrequency} doses/day average\n`;
                report += `   Last Taken: ${med.lastTaken}\n`;
                report += `\n`;
            });
        }

        // Enhanced recommendations section
        report += `💡 RECOMMENDATIONS\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        
        if (data.scheduledMedications > 0) {
            if (data.overallAdherence >= 90) {
                report += `✅ Excellent medication adherence! Keep up the great work.\n`;
            } else if (data.overallAdherence >= 70) {
                report += `👍 Good adherence rate. Consider setting more reminders for missed doses.\n`;
            } else {
                report += `⚠️ Adherence needs improvement. Consider:\n`;
                report += `   • Setting up more frequent medication reminders\n`;
                report += `   • Using a pill organizer\n`;
                report += `   • Discussing medication schedule with your doctor\n`;
            }
        }

        // Medication-specific recommendations
        const needsAttentionMeds = allMedicationReports.filter(med => !med.isAsNeeded && med.status === 'needs_attention');
        if (needsAttentionMeds.length > 0) {
            report += `\n🔍 Scheduled medications needing attention:\n`;
            needsAttentionMeds.forEach(med => {
                report += `   • ${med.name}: ${med.adherenceRate}% adherence (${med.missedDoses} missed doses)\n`;
            });
        }

        if (data.asNeededMedications > 0) {
            const asNeededUsed = asNeededMeds.filter(med => med.status === 'used').length;
            const totalAsNeededDoses = asNeededMeds.reduce((sum, med) => sum + med.takenDoses, 0);
            
            report += `\n💊 As Needed Medication Usage:\n`;
            if (asNeededUsed === 0) {
                report += `   ✅ No as needed medications were required during this period.\n`;
            } else {
                report += `   📊 ${asNeededUsed} out of ${data.asNeededMedications} as needed medications were used.\n`;
                report += `   📈 Total as needed doses: ${totalAsNeededDoses}\n`;
            }
        }

        report += `\n📝 NOTE: Share this report with your healthcare provider\n`;
        report += `during your next appointment for better care coordination.\n`;

        return report;
    };

    // Utility functions
    const getAdherenceColor = (rate) => {
        if (rate >= 90) return '#4CAF50';
        if (rate >= 70) return '#FF9800';
        if (rate >= 50) return '#FF5722';
        return '#F44336';
    };

    const getStatusIcon = (status, isAsNeeded) => {
        if (isAsNeeded) {
            return status === 'used' ? 'checkmark-circle' : 'ellipse-outline';
        }
        switch (status) {
            case 'excellent': return 'checkmark-circle';
            case 'good': return 'checkmark';
            case 'fair': return 'warning';
            case 'needs_attention': return 'alert-circle';
            default: return 'help-circle';
        }
    };

    const getStatusColor = (status, isAsNeeded) => {
        if (isAsNeeded) {
            return status === 'used' ? '#4CAF50' : '#9E9E9E';
        }
        switch (status) {
            case 'excellent': return '#4CAF50';
            case 'good': return '#8BC34A';
            case 'fair': return '#FF9800';
            case 'needs_attention': return '#F44336';
            default: return '#9E9E9E';
        }
    };

    // 🆕 NEW: Render overview mode
    const renderOverviewMode = () => (
        <View style={styles.overviewContainer}>
            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
                <View style={[styles.summaryCard, { borderLeftColor: '#4CAF50' }]}>
                    <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                        {reportData.overallAdherence}%
                    </Text>
                    <Text style={styles.summaryLabel}>Overall Adherence</Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: '#2196F3' }]}>
                    <Text style={[styles.summaryValue, { color: '#2196F3' }]}>
                        {reportData.totalMedications}
                    </Text>
                    <Text style={styles.summaryLabel}>Total Medications</Text>
                </View>
            </View>

            <View style={styles.summaryGrid}>
                <View style={[styles.summaryCard, { borderLeftColor: '#FF9800' }]}>
                    <Text style={[styles.summaryValue, { color: '#FF9800' }]}>
                        {reportData.scheduledMedications}
                    </Text>
                    <Text style={styles.summaryLabel}>Scheduled</Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: '#9C27B0' }]}>
                    <Text style={[styles.summaryValue, { color: '#9C27B0' }]}>
                        {reportData.asNeededMedications}
                    </Text>
                    <Text style={styles.summaryLabel}>As Needed</Text>
                </View>
            </View>

            {/* Patient Stats */}
            {Object.keys(reportData.patientStats).length > 1 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Patient Overview</Text>
                    {Object.entries(reportData.patientStats).map(([patientName, stats]) => (
                        <View key={patientName} style={styles.patientStatsCard}>
                            <View style={styles.patientStatsHeader}>
                                <View style={[styles.patientStatsIcon, { backgroundColor: `${stats.color}20` }]}>
                                    <Ionicons name="person" size={20} color={stats.color} />
                                </View>
                                <Text style={styles.patientStatsName}>{patientName}</Text>
                                <Text style={[styles.patientStatsAdherence, { color: getAdherenceColor(stats.adherenceRate) }]}>
                                    {stats.adherenceRate}%
                                </Text>
                            </View>
                            <View style={styles.patientStatsDetails}>
                                <Text style={styles.patientStatsText}>
                                    {stats.total} medications • {stats.totalDoses}/{stats.expectedDoses} doses
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Category Analysis */}
            {reportData.categoryAnalysis.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>By Condition</Text>
                    {reportData.categoryAnalysis.map((category, index) => (
                        <View key={index} style={styles.categoryCard}>
                            <View style={styles.categoryHeader}>
                                <Text style={styles.categoryName}>{category.name}</Text>
                                <Text style={[styles.categoryAdherence, { color: getAdherenceColor(category.adherenceRate) }]}>
                                    {category.adherenceRate}%
                                </Text>
                            </View>
                            <Text style={styles.categoryDetails}>
                                {category.totalMeds} medications • {category.totalDoses}/{category.expectedDoses} doses
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );

    // 🆕 NEW: Render by-patient mode
    const renderByPatientMode = () => (
        <View style={styles.byPatientContainer}>
            {Object.entries(reportData.patientReports).map(([patientName, patientReport]) => (
                <View key={patientName} style={styles.patientReportCard}>
                    <TouchableOpacity
                        style={styles.patientReportHeader}
                        onPress={() => setExpandedPatients(prev => ({
                            ...prev,
                            [patientName]: !prev[patientName]
                        }))}
                    >
                        <View style={styles.patientReportHeaderLeft}>
                            <View style={[styles.patientReportIcon, { backgroundColor: `${reportData.patientStats[patientName]?.color || '#666'}20` }]}>
                                <Ionicons name="person" size={24} color={reportData.patientStats[patientName]?.color || '#666'} />
                            </View>
                            <View>
                                <Text style={styles.patientReportName}>{patientName}</Text>
                                <Text style={styles.patientReportSubtitle}>
                                    {patientReport.totalMedications} medications • {patientReport.overallAdherence}% adherence
                                </Text>
                            </View>
                        </View>
                        <Ionicons 
                            name={expandedPatients[patientName] ? "chevron-down" : "chevron-forward"} 
                            size={20} 
                            color="#666" 
                        />
                    </TouchableOpacity>

                    {expandedPatients[patientName] && (
                        <View style={styles.patientReportContent}>
                            <View style={styles.patientStatsRow}>
                                <View style={styles.patientStatItem}>
                                    <Text style={styles.patientStatValue}>{patientReport.totalTaken}</Text>
                                    <Text style={styles.patientStatLabel}>Taken</Text>
                                </View>
                                <View style={styles.patientStatItem}>
                                    <Text style={styles.patientStatValue}>{patientReport.totalExpected}</Text>
                                    <Text style={styles.patientStatLabel}>Expected</Text>
                                </View>
                                <View style={styles.patientStatItem}>
                                    <Text style={styles.patientStatValue}>{patientReport.excellentMeds}</Text>
                                    <Text style={styles.patientStatLabel}>Excellent</Text>
                                </View>
                                <View style={styles.patientStatItem}>
                                    <Text style={[styles.patientStatValue, { color: patientReport.needsAttentionMeds > 0 ? '#F44336' : '#333' }]}>
                                        {patientReport.needsAttentionMeds}
                                    </Text>
                                    <Text style={styles.patientStatLabel}>Needs Attention</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            ))}
        </View>
    );

    // 🆕 NEW: Render by-category mode
    const renderByCategoryMode = () => (
        <View style={styles.byCategoryContainer}>
            {reportData.categoryAnalysis.map((category, index) => (
                <View key={index} style={styles.categoryDetailCard}>
                    <View style={styles.categoryDetailHeader}>
                        <Text style={styles.categoryDetailName}>{category.name}</Text>
                        <Text style={[styles.categoryDetailAdherence, { color: getAdherenceColor(category.adherenceRate) }]}>
                            {category.adherenceRate}%
                        </Text>
                    </View>
                    <View style={styles.categoryDetailStats}>
                        <View style={styles.categoryStatItem}>
                            <Text style={styles.categoryStatValue}>{category.totalMeds}</Text>
                            <Text style={styles.categoryStatLabel}>Medications</Text>
                        </View>
                        <View style={styles.categoryStatItem}>
                            <Text style={styles.categoryStatValue}>{category.totalDoses}</Text>
                            <Text style={styles.categoryStatLabel}>Taken</Text>
                        </View>
                        <View style={styles.categoryStatItem}>
                            <Text style={styles.categoryStatValue}>{category.expectedDoses}</Text>
                            <Text style={styles.categoryStatLabel}>Expected</Text>
                        </View>
                    </View>
                    <View style={styles.categoryMedicationsList}>
                        {category.medications.slice(0, 3).map((med, idx) => (
                            <Text key={idx} style={styles.categoryMedicationItem}>
                                • {med.name} ({med.dosage})
                            </Text>
                        ))}
                        {category.medications.length > 3 && (
                            <Text style={styles.categoryMedicationMore}>
                                +{category.medications.length - 3} more...
                            </Text>
                        )}
                    </View>
                </View>
            ))}
        </View>
    );

    // 🆕 RESTORED: Detailed medication card from original (enhanced with patient info)
    const renderMedicationCard = (medication) => (
        <View key={medication.id} style={styles.medicationCard}>
            <View style={styles.medicationHeader}>
                <View style={[styles.medicationIcon, { backgroundColor: `${medication.color}20` }]}>
                    <Ionicons name="medical" size={24} color={medication.color} />
                </View>
                <View style={styles.medicationInfo}>
                    <Text style={styles.medicationName}>
                        {medication.name}
                        {medication.isAsNeeded && <Text style={styles.asNeededLabel}> (As Needed)</Text>}
                    </Text>
                    <Text style={styles.medicationDetails}>
                        {medication.dosage} • {medication.type} • {medication.illnessType}
                    </Text>
                    <Text style={styles.medicationSchedule}>
                        {medication.isAsNeeded ? 'Take as needed' : (medication.times ? medication.times.join(', ') : 'Not specified')}
                    </Text>
                    {/* 🆕 NEW: Patient info for multi-patient reports */}
                    {selectedPatient === 'all' && (
                        <Text style={styles.medicationPatient}>
                            Patient: {getPatientNameForMedication(medication)}
                        </Text>
                    )}
                </View>
                <View style={styles.statusContainer}>
                    {!medication.isAsNeeded ? (
                        <>
                            <View style={[styles.adherenceBadge, { backgroundColor: getAdherenceColor(medication.adherenceRate) }]}>
                                <Text style={styles.adherenceText}>{medication.adherenceRate}%</Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(medication.status, medication.isAsNeeded) }]}>
                                <Ionicons name={getStatusIcon(medication.status, medication.isAsNeeded)} size={16} color="white" />
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={[styles.adherenceBadge, { backgroundColor: '#2196F3' }]}>
                                <Text style={styles.adherenceText}>{medication.takenDoses} uses</Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(medication.status, medication.isAsNeeded) }]}>
                                <Ionicons name={getStatusIcon(medication.status, medication.isAsNeeded)} size={16} color="white" />
                            </View>
                        </>
                    )}
                </View>
            </View>
            
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{medication.takenDoses}</Text>
                    <Text style={styles.statLabel}>Taken</Text>
                </View>
                {!medication.isAsNeeded ? (
                    <>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: medication.missedDoses > 0 ? '#F44336' : '#666' }]}>
                                {medication.missedDoses}
                            </Text>
                            <Text style={styles.statLabel}>Missed</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: medication.currentStreak > 0 ? '#4CAF50' : '#666' }]}>
                                {medication.currentStreak}
                            </Text>
                            <Text style={styles.statLabel}>Streak</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{medication.activeDays}</Text>
                            <Text style={styles.statLabel}>Active Days</Text>
                        </View>
                    </>
                ) : (
                    <>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{medication.usageFrequency}</Text>
                            <Text style={styles.statLabel}>Avg/Day</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>-</Text>
                            <Text style={styles.statLabel}>Streak</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{medication.activeDays}</Text>
                            <Text style={styles.statLabel}>Period Days</Text>
                        </View>
                    </>
                )}
            </View>

            {medication.lastTaken !== 'Never' && (
                <View style={styles.lastTakenContainer}>
                    <Ionicons name="time-outline" size={14} color="#666" />
                    <Text style={styles.lastTakenText}>Last taken: {medication.lastTaken}</Text>
                </View>
            )}
        </View>
    );

    // 🆕 NEW: Render detailed medications list (from original)
    const renderDetailedMedicationsList = () => {
        if (!reportData) return null;

        // Get all medications from all patient reports
        const allMedicationReports = [];
        Object.values(reportData.patientReports).forEach(patientReport => {
            allMedicationReports.push(...patientReport.medicationReports);
        });

        if (allMedicationReports.length === 0) {
            return (
                <View style={styles.emptyMedicationsState}>
                    <Ionicons name="medical-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyMedicationsText}>No medications found</Text>
                    <Text style={styles.emptyMedicationsSubText}>
                        Add medications to start tracking your adherence
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.medicationsSection}>
                <View style={styles.medicationsSectionHeader}>
                    <Text style={styles.sectionTitle}>Medication Performance</Text>
                    <Text style={styles.medicationCount}>
                        {allMedicationReports.length} medication{allMedicationReports.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                {allMedicationReports.map(renderMedicationCard)}
            </View>
        );
    };

    // Main render logic
    if (loading) {
        return (
            <View style={styles.container}>
                <LinearGradient 
                    colors={["#E91E63", "#C2185B"]}
                    style={styles.headerGradient}
                />
                <View style={styles.content}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}
                        >
                            <Ionicons name="chevron-back" size={28} color="#E91E63" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Medical Reports</Text>
                    </View>
                    <View style={styles.loadingContainer}>
                        <Ionicons name="document-text" size={48} color="#E91E63" />
                        <Text style={styles.loadingText}>Generating Report...</Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient 
                colors={["#E91E63", "#C2185B"]}
                style={styles.headerGradient}
            />
            
            <View style={styles.content}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Ionicons name="chevron-back" size={28} color="#E91E63" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Medical Reports</Text>
                    <TouchableOpacity 
                        style={styles.exportHeaderButton}
                        onPress={exportReport}
                    >
                        <Ionicons name="share-outline" size={24} color="#E91E63" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {/* Controls Section */}
                    <View style={styles.controlsSection}>
                        {/* Patient Selector */}
                        {renderPatientSelector()}
                        
                        {/* Period Selection */}
                        <View style={styles.periodSelector}>
                            {REPORT_PERIODS.map((period) => (
                                <TouchableOpacity
                                    key={period.value}
                                    style={[
                                        styles.periodButton,
                                        selectedPeriod === period.value && styles.selectedPeriodButton
                                    ]}
                                    onPress={() => setSelectedPeriod(period.value)}
                                >
                                    <Text style={[
                                        styles.periodButtonText,
                                        selectedPeriod === period.value && styles.selectedPeriodButtonText
                                    ]}>
                                        {period.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* View Mode Selection */}
                        <View style={styles.viewModeSelector}>
                            {VIEW_MODES.map((mode) => (
                                <TouchableOpacity
                                    key={mode.value}
                                    style={[
                                        styles.viewModeButton,
                                        viewMode === mode.value && styles.selectedViewModeButton
                                    ]}
                                    onPress={() => setViewMode(mode.value)}
                                >
                                    <Ionicons 
                                        name={mode.icon} 
                                        size={16} 
                                        color={viewMode === mode.value ? 'white' : '#666'} 
                                    />
                                    <Text style={[
                                        styles.viewModeButtonText,
                                        viewMode === mode.value && styles.selectedViewModeButtonText
                                    ]}>
                                        {mode.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {reportData ? (
                        <>
                            {/* Render based on selected view mode */}
                            {viewMode === 'overview' && renderOverviewMode()}
                            {viewMode === 'by-patient' && renderByPatientMode()}
                            {viewMode === 'by-category' && renderByCategoryMode()}

                            {/* 🆕 RESTORED: Detailed Medications List (from original) */}
                            {renderDetailedMedicationsList()}

                            {/* Export Section */}
                            <View style={styles.exportSection}>
                                <TouchableOpacity 
                                    style={styles.exportFullButton}
                                    onPress={exportReport}
                                >
                                    <LinearGradient
                                        colors={["#E91E63", "#C2185B"]}
                                        style={styles.exportFullButtonGradient}
                                    >
                                        <Ionicons name="download-outline" size={20} color="white" />
                                        <Text style={styles.exportFullButtonText}>Export Detailed Report</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                                
                                <Text style={styles.exportNote}>
                                    💡 Share this comprehensive report with your healthcare provider to improve your treatment plan and medication management
                                </Text>
                            </View>
                        </>
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={48} color="#ccc" />
                            <Text style={styles.emptyStateText}>Unable to generate report</Text>
                            <Text style={styles.emptyStateSubText}>
                                Please check your connection and try again
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </View>

            {/* Patient Selector Modal */}
            {renderPatientSelectorModal()}
        </View>
    );
}

// Enhanced styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    headerGradient: {
        height: Platform.OS === 'ios' ? 120 : 100,
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
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 10,
    },
    exportHeaderButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    controlsSection: {
        marginBottom: 20,
    },
    // Patient selector styles
    patientSelectorContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
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
    periodSelector: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 4,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    periodButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    selectedPeriodButton: {
        backgroundColor: '#E91E63',
    },
    periodButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    selectedPeriodButtonText: {
        color: 'white',
    },
    viewModeSelector: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    viewModeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
    },
    selectedViewModeButton: {
        backgroundColor: '#E91E63',
    },
    viewModeButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    selectedViewModeButtonText: {
        color: 'white',
    },
    // Overview mode styles
    overviewContainer: {
        marginBottom: 20,
    },
    summaryGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    summaryValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    patientStatsCard: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingBottom: 12,
        marginBottom: 12,
    },
    patientStatsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    patientStatsIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    patientStatsName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    patientStatsAdherence: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    patientStatsDetails: {
        marginLeft: 44,
    },
    patientStatsText: {
        fontSize: 14,
        color: '#666',
    },
    categoryCard: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingBottom: 12,
        marginBottom: 12,
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    categoryAdherence: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    categoryDetails: {
        fontSize: 14,
        color: '#666',
    },
    // By-patient mode styles
    byPatientContainer: {
        marginBottom: 20,
    },
    patientReportCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    patientReportHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    patientReportHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    patientReportIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    patientReportName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    patientReportSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    patientReportContent: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        padding: 16,
    },
    patientStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    patientStatItem: {
        alignItems: 'center',
    },
    patientStatValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    patientStatLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    // By-category mode styles
    byCategoryContainer: {
        marginBottom: 20,
    },
    categoryDetailCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    categoryDetailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    categoryDetailName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    categoryDetailAdherence: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    categoryDetailStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 12,
    },
    categoryStatItem: {
        alignItems: 'center',
    },
    categoryStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    categoryStatLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    categoryMedicationsList: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 12,
    },
    categoryMedicationItem: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    categoryMedicationMore: {
        fontSize: 14,
        color: '#999',
        fontStyle: 'italic',
        marginTop: 4,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    patientModalContent: {
        backgroundColor: "white",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: "60%",
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
    // 🆕 RESTORED: Detailed medications section styles (from original)
    medicationsSection: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    medicationsSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    medicationCount: {
        fontSize: 14,
        color: '#666',
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        fontWeight: '500',
    },
    medicationCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#E91E63',
    },
    medicationHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    medicationIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    medicationInfo: {
        flex: 1,
        paddingRight: 10,
    },
    medicationName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    asNeededLabel: {
        fontSize: 14,
        fontWeight: 'normal',
        color: '#2196F3',
        fontStyle: 'italic',
    },
    medicationDetails: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    medicationSchedule: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
        marginBottom: 4,
    },
    medicationPatient: {
        fontSize: 12,
        color: '#1a8e2d',
        fontWeight: '500',
        backgroundColor: '#e6f7e9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    statusContainer: {
        alignItems: 'flex-end',
        gap: 6,
    },
    adherenceBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        minWidth: 60,
        alignItems: 'center',
    },
    adherenceText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'white',
    },
    statusBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        marginBottom: 8,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 11,
        color: '#666',
        marginTop: 2,
        textAlign: 'center',
    },
    lastTakenContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 8,
        gap: 6,
    },
    lastTakenText: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
    },
    emptyMedicationsState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyMedicationsText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#999',
        marginTop: 15,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyMedicationsSubText: {
        fontSize: 14,
        color: '#bbb',
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 280,
    },
    // Export section styles
    exportSection: {
        marginBottom: 30,
        paddingBottom: 20,
    },
    exportFullButton: {
        borderRadius: 16,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    exportFullButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 16,
        gap: 10,
    },
    exportFullButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    exportNote: {
        fontSize: 13,
        color: '#666',
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 10,
        fontStyle: 'italic',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#999',
        marginTop: 15,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateSubText: {
        fontSize: 14,
        color: '#bbb',
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 280,
    },
});