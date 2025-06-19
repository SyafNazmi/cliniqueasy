// app/medications/medical-reports.jsx - Fixed "As Needed" medication handling
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Dimensions, Alert, Share } from 'react-native';
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
    const [selectedPeriod, setSelectedPeriod] = useState('30'); // 7, 30, 90 days

    const REPORT_PERIODS = [
        { label: '7 Days', value: '7' },
        { label: '30 Days', value: '30' },
        { label: '90 Days', value: '90' }
    ];

    useEffect(() => {
        loadReportData();
    }, [selectedPeriod]);

    // 🚨 FIXED: Helper function to check if medication is "As Needed"
    const isAsNeeded = (medication) => {
        return medication.frequencies === "As Needed" || 
               medication.frequency === "As Needed" ||
               !medication.times || 
               medication.times.length === 0;
    };

    // 🚨 FIXED: Helper function to check if dose is "As Needed" by ID pattern
    const isAsNeededDose = (doseId) => {
        return doseId.includes('as-needed');
    };

    // Load both medications and dose history from Appwrite
    const loadReportData = async () => {
        try {
            setLoading(true);
            console.log('🔄 Loading medical report data from Appwrite...');
            
            const [allMedications, allDoseHistory] = await Promise.all([
                integratedPatientMedicationService.getPatientMedications(),
                doseTrackingService.getAllDoseHistory()
            ]);

            console.log("📋 Medical report medications from Appwrite:", allMedications);
            console.log("📊 Medical report dose history from Appwrite:", allDoseHistory);

            setMedications(allMedications || []);
            setDoseHistory(allDoseHistory || []);

            // Generate report data
            const report = generateMedicalReport(allMedications || [], allDoseHistory || [], parseInt(selectedPeriod));
            setReportData(report);
        } catch (error) {
            console.error('❌ Error loading report data:', error);
            Alert.alert('Error', 'Failed to load report data. Please check your connection and try again.');
            // Set empty arrays as fallback
            setMedications([]);
            setDoseHistory([]);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    // Helper function to handle date comparison with Appwrite format
    const isSameDay = (date1, date2) => {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return (
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate()
        );
    };

    // 🚨 FIXED: Generate medical report with proper "As Needed" handling
    const generateMedicalReport = (medications, doseHistory, periodDays) => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        console.log(`📊 Generating report for ${periodDays} days: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

        // Filter dose history for the selected period
        const periodHistory = doseHistory.filter(dose => {
            const doseDate = new Date(dose.timestamp);
            return doseDate >= startDate && doseDate <= endDate;
        });

        console.log(`📈 Found ${periodHistory.length} dose records in period`);

        // 🚨 FIXED: Separate scheduled and "As Needed" medications for different calculations
        const medicationReports = medications.map(medication => {
            const medicationDoses = periodHistory.filter(dose => dose.medication_id === medication.id);
            const takenDoses = medicationDoses.filter(dose => dose.taken);
            
            // 🚨 FIXED: Handle "As Needed" medications differently
            if (isAsNeeded(medication)) {
                // For "As Needed" medications, only track usage, not adherence
                const lastTakenDose = takenDoses.length > 0 ? 
                    new Date(Math.max(...takenDoses.map(dose => new Date(dose.timestamp)))) : null;

                return {
                    ...medication,
                    isAsNeeded: true,
                    takenDoses: takenDoses.length,
                    expectedDoses: null, // No expected doses for "As Needed"
                    adherenceRate: null, // No adherence rate for "As Needed"
                    missedDoses: null, // No missed doses for "As Needed"
                    activeDays: periodDays, // Always active for "As Needed"
                    currentStreak: null, // No streak for "As Needed"
                    lastTaken: lastTakenDose ? lastTakenDose.toLocaleDateString() : 'Never',
                    status: takenDoses.length > 0 ? 'used' : 'unused',
                    usageFrequency: takenDoses.length > 0 ? (takenDoses.length / periodDays).toFixed(2) : '0'
                };
            } else {
                // For scheduled medications, calculate adherence normally
                const dailyDoses = medication.times ? medication.times.length : 1;
                
                // Calculate how many days this medication should have been taken in the period
                const medStartDate = new Date(medication.startDate);
                const effectiveStartDate = medStartDate > startDate ? medStartDate : startDate;
                
                // Handle duration
                let medEndDate;
                if (medication.duration === 'On going' || medication.duration === 'Ongoing') {
                    medEndDate = endDate;
                } else {
                    const durationMatch = medication.duration.match(/(\d+)/);
                    const durationDays = durationMatch ? parseInt(durationMatch[1]) : 30;
                    medEndDate = new Date(medStartDate);
                    medEndDate.setDate(medStartDate.getDate() + durationDays);
                    if (medEndDate > endDate) medEndDate = endDate;
                }
                
                // Calculate actual days the medication should be taken
                const activeDays = Math.max(0, Math.floor((medEndDate - effectiveStartDate) / (24 * 60 * 60 * 1000)) + 1);
                const expectedDoses = activeDays * dailyDoses;
                
                const adherenceRate = expectedDoses > 0 ? (takenDoses.length / expectedDoses) * 100 : 0;
                const missedDoses = Math.max(0, expectedDoses - takenDoses.length);
                const lastTakenDose = takenDoses.length > 0 ? 
                    new Date(Math.max(...takenDoses.map(dose => new Date(dose.timestamp)))) : null;
                
                // Calculate current streak for scheduled medications
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

        // 🚨 FIXED: Calculate overall statistics only for scheduled medications
        const scheduledMedications = medicationReports.filter(med => !med.isAsNeeded);
        const asNeededMedications = medicationReports.filter(med => med.isAsNeeded);
        
        const totalExpected = scheduledMedications.reduce((sum, med) => sum + (med.expectedDoses || 0), 0);
        const totalTaken = scheduledMedications.reduce((sum, med) => sum + med.takenDoses, 0);
        const overallAdherence = totalExpected > 0 ? Math.round((totalTaken / totalExpected) * 100) : 0;

        // Enhanced insights
        const excellentMeds = scheduledMedications.filter(med => med.status === 'excellent').length;
        const needsAttentionMeds = scheduledMedications.filter(med => med.status === 'needs_attention').length;
        const averageStreak = scheduledMedications.length > 0 ? 
            Math.round(scheduledMedications.reduce((sum, med) => sum + (med.currentStreak || 0), 0) / scheduledMedications.length) : 0;
        
        const asNeededUsed = asNeededMedications.filter(med => med.status === 'used').length;
        const totalAsNeededDoses = asNeededMedications.reduce((sum, med) => sum + med.takenDoses, 0);

        return {
            period: `${periodDays} Days`,
            startDate: startDate.toLocaleDateString(),
            endDate: endDate.toLocaleDateString(),
            overallAdherence,
            totalMedications: medications.length,
            scheduledMedications: scheduledMedications.length,
            asNeededMedications: asNeededMedications.length,
            totalDosesTaken: totalTaken,
            totalDosesExpected: totalExpected,
            totalAsNeededDoses,
            excellentMeds,
            needsAttentionMeds,
            asNeededUsed,
            averageStreak,
            medicationReports: medicationReports.sort((a, b) => {
                // Sort: scheduled medications first (by adherence), then "As Needed" (by usage)
                if (a.isAsNeeded && !b.isAsNeeded) return 1;
                if (!a.isAsNeeded && b.isAsNeeded) return -1;
                if (a.isAsNeeded && b.isAsNeeded) return b.takenDoses - a.takenDoses;
                return (b.adherenceRate || 0) - (a.adherenceRate || 0);
            }),
            generatedAt: new Date().toLocaleString()
        };
    };

    const exportReport = async () => {
        if (!reportData) return;

        try {
            const reportText = generateReportText(reportData);
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

    // 🚨 FIXED: Enhanced report text generation with proper "As Needed" handling
    const generateReportText = (data) => {
        let report = `📋 MEDICAL ADHERENCE REPORT\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `Generated: ${data.generatedAt}\n`;
        report += `Period: ${data.startDate} to ${data.endDate}\n\n`;
        
        report += `📊 EXECUTIVE SUMMARY\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `Overall Adherence Rate: ${data.overallAdherence}% (scheduled medications only)\n`;
        report += `Total Active Medications: ${data.totalMedications}\n`;
        report += `  • Scheduled: ${data.scheduledMedications}\n`;
        report += `  • As Needed: ${data.asNeededMedications}\n`;
        report += `Scheduled Doses Taken: ${data.totalDosesTaken}/${data.totalDosesExpected}\n`;
        report += `As Needed Doses Taken: ${data.totalAsNeededDoses}\n`;
        report += `Average Consecutive Days: ${data.averageStreak}\n`;
        report += `Excellent Adherence (≥90%): ${data.excellentMeds} medications\n`;
        report += `Needs Attention (<50%): ${data.needsAttentionMeds} medications\n`;
        report += `As Needed Medications Used: ${data.asNeededUsed}/${data.asNeededMedications}\n\n`;

        report += `💊 MEDICATION BREAKDOWN\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        
        // Scheduled medications first
        const scheduledMeds = data.medicationReports.filter(med => !med.isAsNeeded);
        const asNeededMeds = data.medicationReports.filter(med => med.isAsNeeded);
        
        if (scheduledMeds.length > 0) {
            report += `📅 SCHEDULED MEDICATIONS:\n`;
            scheduledMeds.forEach((med, index) => {
                const statusEmoji = med.status === 'excellent' ? '🟢' : 
                                  med.status === 'good' ? '🟡' : 
                                  med.status === 'fair' ? '🟠' : '🔴';
                
                report += `${index + 1}. ${statusEmoji} ${med.name}\n`;
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
                report += `   Condition: ${med.illnessType || 'Not specified'}\n`;
                report += `   Dosage: ${med.dosage} ${med.type ? `(${med.type})` : ''}\n`;
                report += `   Usage: ${med.takenDoses} doses taken\n`;
                report += `   Usage Frequency: ${med.usageFrequency} doses/day average\n`;
                report += `   Last Taken: ${med.lastTaken}\n`;
                report += `\n`;
            });
        }

        // Recommendations section
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

        if (data.needsAttentionMeds > 0) {
            report += `\n🔍 Scheduled medications needing attention:\n`;
            const lowAdherenceMeds = data.medicationReports.filter(med => !med.isAsNeeded && med.status === 'needs_attention');
            lowAdherenceMeds.forEach(med => {
                report += `   • ${med.name}: ${med.adherenceRate}% adherence\n`;
            });
        }

        if (data.asNeededMedications > 0) {
            report += `\n💊 As Needed Medication Usage:\n`;
            if (data.asNeededUsed === 0) {
                report += `   ✅ No as needed medications were required during this period.\n`;
            } else {
                report += `   📊 ${data.asNeededUsed} out of ${data.asNeededMedications} as needed medications were used.\n`;
                report += `   📈 Total as needed doses: ${data.totalAsNeededDoses}\n`;
            }
        }

        report += `\n📝 NOTE: Share this report with your healthcare provider\n`;
        report += `during your next appointment for better care coordination.\n`;

        return report;
    };

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

    // 🚨 FIXED: Enhanced medication card with proper "As Needed" display
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
                </View>

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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

                    {reportData ? (
                        <>
                            {/* 🚨 FIXED: Summary Card with separate scheduled and as needed stats */}
                            <View style={styles.summaryCard}>
                                <View style={styles.summaryHeader}>
                                    <Text style={styles.summaryTitle}>Health Overview</Text>
                                    <TouchableOpacity 
                                        style={styles.exportButton}
                                        onPress={exportReport}
                                    >
                                        <Ionicons name="share-outline" size={20} color="#E91E63" />
                                    </TouchableOpacity>
                                </View>
                                
                                <View style={styles.summaryStats}>
                                    <View style={styles.summaryStatItem}>
                                        <Text style={[styles.summaryStatValue, { color: getAdherenceColor(reportData.overallAdherence) }]}>
                                            {reportData.scheduledMedications > 0 ? `${reportData.overallAdherence}%` : 'N/A'}
                                        </Text>
                                        <Text style={styles.summaryStatLabel}>Scheduled Adherence</Text>
                                    </View>
                                    <View style={styles.summaryStatItem}>
                                        <Text style={styles.summaryStatValue}>{reportData.totalMedications}</Text>
                                        <Text style={styles.summaryStatLabel}>Total Medications</Text>
                                    </View>
                                    <View style={styles.summaryStatItem}>
                                        <Text style={styles.summaryStatValue}>
                                            {reportData.totalDosesTaken + reportData.totalAsNeededDoses}
                                        </Text>
                                        <Text style={styles.summaryStatLabel}>Total Doses Taken</Text>
                                    </View>
                                </View>

                                {/* 🚨 FIXED: Updated insights for both medication types */}
                                <View style={styles.insightsContainer}>
                                    {reportData.scheduledMedications > 0 && (
                                        <>
                                            <View style={styles.insightItem}>
                                                <Ionicons name="trending-up" size={16} color="#4CAF50" />
                                                <Text style={styles.insightText}>{reportData.excellentMeds} excellent scheduled</Text>
                                            </View>
                                            <View style={styles.insightItem}>
                                                <Ionicons name="flame" size={16} color="#FF9800" />
                                                <Text style={styles.insightText}>{reportData.averageStreak} day avg streak</Text>
                                            </View>
                                            {reportData.needsAttentionMeds > 0 && (
                                                <View style={styles.insightItem}>
                                                    <Ionicons name="warning" size={16} color="#F44336" />
                                                    <Text style={[styles.insightText, { color: '#F44336' }]}>
                                                        {reportData.needsAttentionMeds} need attention
                                                    </Text>
                                                </View>
                                            )}
                                        </>
                                    )}
                                    {reportData.asNeededMedications > 0 && (
                                        <View style={styles.insightItem}>
                                            <Ionicons name="medical" size={16} color="#2196F3" />
                                            <Text style={styles.insightText}>
                                                {reportData.asNeededUsed}/{reportData.asNeededMedications} as needed used
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={styles.reportPeriod}>
                                    Report Period: {reportData.startDate} - {reportData.endDate}
                                </Text>
                            </View>

                            {/* Medications List */}
                            <View style={styles.medicationsSection}>
                                <Text style={styles.sectionTitle}>Medication Performance</Text>
                                {reportData.medicationReports.length > 0 ? (
                                    reportData.medicationReports.map(renderMedicationCard)
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="medical-outline" size={48} color="#ccc" />
                                        <Text style={styles.emptyStateText}>No medications found</Text>
                                        <Text style={styles.emptyStateSubText}>
                                            Add medications to start tracking your adherence
                                        </Text>
                                    </View>
                                )}
                            </View>

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
        </View>
    );
}

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
        marginLeft: 15,
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
    periodSelector: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
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
    summaryCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    exportButton: {
        padding: 8,
        backgroundColor: '#E91E6320',
        borderRadius: 8,
    },
    summaryStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 15,
    },
    summaryStatItem: {
        alignItems: 'center',
    },
    summaryStatValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    summaryStatLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        textAlign: 'center',
    },
    insightsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 15,
    },
    insightItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    insightText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
        marginLeft: 5,
    },
    reportPeriod: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        marginTop: 10,
        fontStyle: 'italic',
    },
    medicationsSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
        paddingLeft: 5,
    },
    medicationCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
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