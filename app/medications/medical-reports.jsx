// app/medications/medical-reports.jsx
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Dimensions, Alert, Share } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import PageHeader from '../../components/PageHeader';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getMedications, getDoseHistory } from '../../service/Storage';

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

    const loadReportData = async () => {
        try {
            setLoading(true);
            const [allMedications, allDoseHistory] = await Promise.all([
                getMedications(),
                getDoseHistory()
            ]);

            setMedications(allMedications);
            setDoseHistory(allDoseHistory);

            // Generate report data
            const report = generateMedicalReport(allMedications, allDoseHistory, parseInt(selectedPeriod));
            setReportData(report);
        } catch (error) {
            console.error('Error loading report data:', error);
            Alert.alert('Error', 'Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    const generateMedicalReport = (medications, doseHistory, periodDays) => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        // Filter dose history for the selected period
        const periodHistory = doseHistory.filter(dose => {
            const doseDate = new Date(dose.timestamp);
            return doseDate >= startDate && doseDate <= endDate;
        });

        // Calculate adherence for each medication
        const medicationReports = medications.map(medication => {
            const medicationDoses = periodHistory.filter(dose => dose.medicationId === medication.id);
            const takenDoses = medicationDoses.filter(dose => dose.taken);
            
            // Calculate expected doses based on frequency and period
            const dailyDoses = medication.times ? medication.times.length : 1;
            const expectedDoses = Math.min(periodDays * dailyDoses, periodDays * dailyDoses);
            
            const adherenceRate = expectedDoses > 0 ? (takenDoses.length / expectedDoses) * 100 : 0;

            return {
                ...medication,
                takenDoses: takenDoses.length,
                expectedDoses,
                adherenceRate: Math.round(adherenceRate),
                missedDoses: expectedDoses - takenDoses.length,
                lastTaken: takenDoses.length > 0 ? 
                    new Date(Math.max(...takenDoses.map(dose => new Date(dose.timestamp)))).toLocaleDateString() : 
                    'Never'
            };
        });

        // Calculate overall statistics
        const totalExpected = medicationReports.reduce((sum, med) => sum + med.expectedDoses, 0);
        const totalTaken = medicationReports.reduce((sum, med) => sum + med.takenDoses, 0);
        const overallAdherence = totalExpected > 0 ? Math.round((totalTaken / totalExpected) * 100) : 0;

        return {
            period: `${periodDays} Days`,
            startDate: startDate.toLocaleDateString(),
            endDate: endDate.toLocaleDateString(),
            overallAdherence,
            totalMedications: medications.length,
            totalDosesTaken: totalTaken,
            totalDosesExpected: totalExpected,
            medicationReports,
            generatedAt: new Date().toLocaleString()
        };
    };

    const exportReport = async () => {
        if (!reportData) return;

        try {
            const reportText = generateReportText(reportData);
            await Share.share({
                message: reportText,
                title: `Medical Report - ${reportData.period}`
            });
        } catch (error) {
            console.error('Error sharing report:', error);
            Alert.alert('Error', 'Failed to export report');
        }
    };

    const generateReportText = (data) => {
        let report = `MEDICAL REPORT\n`;
        report += `Generated: ${data.generatedAt}\n`;
        report += `Period: ${data.startDate} to ${data.endDate}\n\n`;
        
        report += `SUMMARY\n`;
        report += `Overall Adherence: ${data.overallAdherence}%\n`;
        report += `Total Medications: ${data.totalMedications}\n`;
        report += `Doses Taken: ${data.totalDosesTaken}/${data.totalDosesExpected}\n\n`;

        report += `MEDICATION DETAILS\n`;
        data.medicationReports.forEach((med, index) => {
            report += `${index + 1}. ${med.name}\n`;
            report += `   Dosage: ${med.dosage}\n`;
            report += `   Type: ${med.type}\n`;
            report += `   For: ${med.illnessType}\n`;
            report += `   Adherence: ${med.adherenceRate}%\n`;
            report += `   Taken: ${med.takenDoses}/${med.expectedDoses} doses\n`;
            report += `   Last Taken: ${med.lastTaken}\n\n`;
        });

        return report;
    };

    const getAdherenceColor = (rate) => {
        if (rate >= 90) return '#4CAF50';
        if (rate >= 70) return '#FF9800';
        return '#F44336';
    };

    const renderMedicationCard = (medication) => (
        <View key={medication.id} style={styles.medicationCard}>
            <View style={styles.medicationHeader}>
                <View style={[styles.medicationIcon, { backgroundColor: `${medication.color}20` }]}>
                    <Ionicons name="medical" size={24} color={medication.color} />
                </View>
                <View style={styles.medicationInfo}>
                    <Text style={styles.medicationName}>{medication.name}</Text>
                    <Text style={styles.medicationDetails}>
                        {medication.dosage} • {medication.type} • {medication.illnessType}
                    </Text>
                </View>
                <View style={[styles.adherenceBadge, { backgroundColor: getAdherenceColor(medication.adherenceRate) }]}>
                    <Text style={styles.adherenceText}>{medication.adherenceRate}%</Text>
                </View>
            </View>
            
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{medication.takenDoses}</Text>
                    <Text style={styles.statLabel}>Taken</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{medication.missedDoses}</Text>
                    <Text style={styles.statLabel}>Missed</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{medication.lastTaken}</Text>
                    <Text style={styles.statLabel}>Last Taken</Text>
                </View>
            </View>
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
                        <PageHeader onPress={() => router.back()} />
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
                    <PageHeader onPress={() => router.back()} />
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

                    {reportData && (
                        <>
                            {/* Summary Card */}
                            <View style={styles.summaryCard}>
                                <View style={styles.summaryHeader}>
                                    <Text style={styles.summaryTitle}>Overall Summary</Text>
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
                                            {reportData.overallAdherence}%
                                        </Text>
                                        <Text style={styles.summaryStatLabel}>Adherence Rate</Text>
                                    </View>
                                    <View style={styles.summaryStatItem}>
                                        <Text style={styles.summaryStatValue}>{reportData.totalMedications}</Text>
                                        <Text style={styles.summaryStatLabel}>Medications</Text>
                                    </View>
                                    <View style={styles.summaryStatItem}>
                                        <Text style={styles.summaryStatValue}>
                                            {reportData.totalDosesTaken}/{reportData.totalDosesExpected}
                                        </Text>
                                        <Text style={styles.summaryStatLabel}>Doses</Text>
                                    </View>
                                </View>

                                <Text style={styles.reportPeriod}>
                                    Report Period: {reportData.startDate} - {reportData.endDate}
                                </Text>
                            </View>

                            {/* Medications List */}
                            <View style={styles.medicationsSection}>
                                <Text style={styles.sectionTitle}>Medication Details</Text>
                                {reportData.medicationReports.map(renderMedicationCard)}
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
                                        <Text style={styles.exportFullButtonText}>Export Full Report</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                                
                                <Text style={styles.exportNote}>
                                    Share this report with your healthcare provider for better medical consultations
                                </Text>
                            </View>
                        </>
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
    },
    reportPeriod: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
    },
    medicationsSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    medicationCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    medicationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    medicationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    medicationInfo: {
        flex: 1,
    },
    medicationName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    medicationDetails: {
        fontSize: 12,
        color: '#666',
    },
    adherenceBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    adherenceText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: 'white',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 10,
        color: '#666',
        marginTop: 2,
    },
    exportSection: {
        marginBottom: 40,
    },
    exportFullButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
    },
    exportFullButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    exportFullButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    exportNote: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});