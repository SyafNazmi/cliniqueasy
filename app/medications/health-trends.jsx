// app/medications/health-trends.jsx
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Dimensions, Alert, TextInput, Modal } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import PageHeader from '../../components/PageHeader';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getMedications, getDoseHistory, getLocalStorage, setLocalStorage } from '../../service/Storage';

const { width } = Dimensions.get("window");

// Constants for health metrics
const HEALTH_METRICS = [
    { id: 'blood_pressure', name: 'Blood Pressure', unit: 'mmHg', icon: 'heart', color: '#E91E63' },
    { id: 'weight', name: 'Weight', unit: 'kg', icon: 'fitness', color: '#4CAF50' },
    { id: 'mood', name: 'Mood', unit: '1-10', icon: 'happy', color: '#FF9800' },
    { id: 'pain_level', name: 'Pain Level', unit: '1-10', icon: 'medical', color: '#F44336' },
    { id: 'sleep_hours', name: 'Sleep Hours', unit: 'hrs', icon: 'bed', color: '#9C27B0' },
    { id: 'energy_level', name: 'Energy Level', unit: '1-10', icon: 'flash', color: '#2196F3' },
];

export default function HealthTrendsScreen() {
    const router = useRouter();
    const [medications, setMedications] = useState([]);
    const [doseHistory, setDoseHistory] = useState([]);
    const [healthData, setHealthData] = useState([]);
    const [selectedMetric, setSelectedMetric] = useState('blood_pressure');
    const [selectedPeriod, setSelectedPeriod] = useState('30');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newEntry, setNewEntry] = useState({ value: '', notes: '' });
    const [loading, setLoading] = useState(true);

    const PERIOD_OPTIONS = [
        { label: '7 Days', value: '7' },
        { label: '30 Days', value: '30' },
        { label: '90 Days', value: '90' }
    ];

    useEffect(() => {
        loadHealthData();
    }, []);

    const loadHealthData = async () => {
        try {
            setLoading(true);
            const [allMedications, allDoseHistory, storedHealthData] = await Promise.all([
                getMedications(),
                getDoseHistory(),
                getLocalStorage('healthMetrics')
            ]);

            // Ensure all data is properly initialized as arrays
            setMedications(Array.isArray(allMedications) ? allMedications : []);
            setDoseHistory(Array.isArray(allDoseHistory) ? allDoseHistory : []);
            setHealthData(Array.isArray(storedHealthData) ? storedHealthData : []);
        } catch (error) {
            console.error('Error loading health data:', error);
            // Set empty arrays on error
            setMedications([]);
            setDoseHistory([]);
            setHealthData([]);
        } finally {
            setLoading(false);
        }
    };

    const addHealthEntry = async () => {
        if (!newEntry.value.trim()) {
            Alert.alert('Error', 'Please enter a value');
            return;
        }

        try {
            const entry = {
                id: Math.random().toString(36).substr(2, 9),
                metricId: selectedMetric,
                value: parseFloat(newEntry.value),
                notes: newEntry.notes,
                timestamp: new Date().toISOString(),
                date: new Date().toDateString()
            };

            // Ensure healthData is an array before spreading
            const currentHealthData = Array.isArray(healthData) ? healthData : [];
            const updatedHealthData = [...currentHealthData, entry];
            
            await setLocalStorage('healthMetrics', updatedHealthData);
            setHealthData(updatedHealthData);
            setNewEntry({ value: '', notes: '' });
            setShowAddModal(false);
            
            Alert.alert('Success', 'Health metric added successfully');
        } catch (error) {
            console.error('Error adding health entry:', error);
            Alert.alert('Error', 'Failed to add health metric');
        }
    };

    const getFilteredData = () => {
        // Ensure healthData is an array before filtering
        if (!Array.isArray(healthData)) {
            return [];
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(selectedPeriod));

        return healthData.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= startDate && entryDate <= endDate && entry.metricId === selectedMetric;
        }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    };

    const getAdherenceData = () => {
        // Ensure doseHistory is an array before filtering
        if (!Array.isArray(doseHistory)) {
            return [];
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(selectedPeriod));

        const periodHistory = doseHistory.filter(dose => {
            const doseDate = new Date(dose.timestamp);
            return doseDate >= startDate && doseDate <= endDate && dose.taken;
        });

        // Group by date
        const dailyAdherence = {};
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toDateString();
            const dayDoses = periodHistory.filter(dose => 
                new Date(dose.timestamp).toDateString() === dateStr
            );
            dailyAdherence[dateStr] = dayDoses.length;
        }

        return Object.entries(dailyAdherence).map(([date, count]) => ({
            date,
            value: count
        }));
    };

    const calculateTrend = (data) => {
        if (data.length < 2) return { trend: 'stable', percentage: 0 };
        
        const latest = data[data.length - 1].value;
        const previous = data[0].value;
        const change = ((latest - previous) / previous) * 100;
        
        let trend = 'stable';
        if (Math.abs(change) > 5) {
            trend = change > 0 ? 'increasing' : 'decreasing';
        }
        
        return { trend, percentage: Math.abs(change) };
    };

    const getCurrentMetric = () => {
        return HEALTH_METRICS.find(metric => metric.id === selectedMetric);
    };

    const renderMetricSelector = () => (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricSelector}>
            {HEALTH_METRICS.map((metric) => (
                <TouchableOpacity
                    key={metric.id}
                    style={[
                        styles.metricButton,
                        selectedMetric === metric.id && styles.selectedMetricButton,
                        { borderColor: metric.color }
                    ]}
                    onPress={() => setSelectedMetric(metric.id)}
                >
                    <Ionicons 
                        name={metric.icon} 
                        size={20} 
                        color={selectedMetric === metric.id ? 'white' : metric.color} 
                    />
                    <Text style={[
                        styles.metricButtonText,
                        selectedMetric === metric.id && styles.selectedMetricButtonText
                    ]}>
                        {metric.name}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    const renderSimpleChart = (data) => {
        if (data.length === 0) {
            return (
                <View style={styles.emptyChart}>
                    <Ionicons name="analytics-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyChartText}>No data available</Text>
                    <Text style={styles.emptyChartSubtext}>Add your first health metric to see trends</Text>
                </View>
            );
        }

        const maxValue = Math.max(...data.map(d => d.value));
        const minValue = Math.min(...data.map(d => d.value));
        const range = maxValue - minValue || 1;

        return (
            <View style={styles.chartContainer}>
                <View style={styles.chartArea}>
                    {data.map((point, index) => {
                        const height = ((point.value - minValue) / range) * 120 + 20;
                        const leftPosition = (index / (data.length - 1 || 1)) * (width - 80);
                        
                        return (
                            <View
                                key={index}
                                style={[
                                    styles.chartPoint,
                                    {
                                        height,
                                        left: leftPosition,
                                        backgroundColor: getCurrentMetric().color
                                    }
                                ]}
                            />
                        );
                    })}
                </View>
                <View style={styles.chartLabels}>
                    <Text style={styles.chartLabel}>{minValue.toFixed(1)}</Text>
                    <Text style={styles.chartLabel}>{maxValue.toFixed(1)}</Text>
                </View>
            </View>
        );
    };

    const renderTrendInsights = () => {
        const filteredData = getFilteredData();
        const adherenceData = getAdherenceData();
        const trend = calculateTrend(filteredData);
        const currentMetric = getCurrentMetric();

        return (
            <View style={styles.insightsContainer}>
                <Text style={styles.sectionTitle}>Insights & Analysis</Text>
                
                {/* Trend Card */}
                <View style={styles.insightCard}>
                    <View style={styles.insightHeader}>
                        <Ionicons name="trending-up" size={20} color={currentMetric.color} />
                        <Text style={styles.insightTitle}>Trend Analysis</Text>
                    </View>
                    {filteredData.length > 0 ? (
                        <View>
                            <Text style={styles.insightText}>
                                Your {currentMetric.name.toLowerCase()} is{' '}
                                <Text style={{ color: trend.trend === 'increasing' ? '#4CAF50' : trend.trend === 'decreasing' ? '#F44336' : '#666' }}>
                                    {trend.trend}
                                </Text>
                                {trend.percentage > 0 && ` by ${trend.percentage.toFixed(1)}%`} over the last {selectedPeriod} days.
                            </Text>
                            <Text style={styles.insightSubtext}>
                                Latest: {filteredData[filteredData.length - 1]?.value} {currentMetric.unit}
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.insightText}>Add more data points to see trend analysis</Text>
                    )}
                </View>

                {/* Medication Adherence Correlation */}
                <View style={styles.insightCard}>
                    <View style={styles.insightHeader}>
                        <Ionicons name="medical" size={20} color="#2196F3" />
                        <Text style={styles.insightTitle}>Medication Impact</Text>
                    </View>
                    <Text style={styles.insightText}>
                        Average daily medication adherence: {adherenceData && adherenceData.length > 0 ? 
                            (adherenceData.reduce((sum, day) => sum + day.value, 0) / adherenceData.length).toFixed(1) : 0} doses
                    </Text>
                    <Text style={styles.insightSubtext}>
                        Track how your medication adherence affects your health metrics
                    </Text>
                </View>

                {/* Quick Stats */}
                {filteredData.length > 0 && (
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                                {(filteredData.reduce((sum, d) => sum + d.value, 0) / filteredData.length).toFixed(1)}
                            </Text>
                            <Text style={styles.statLabel}>Average</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{Math.max(...filteredData.map(d => d.value)).toFixed(1)}</Text>
                            <Text style={styles.statLabel}>Highest</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{Math.min(...filteredData.map(d => d.value)).toFixed(1)}</Text>
                            <Text style={styles.statLabel}>Lowest</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{filteredData.length}</Text>
                            <Text style={styles.statLabel}>Entries</Text>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <LinearGradient 
                    colors={["#FF5722", "#E64A19"]}
                    style={styles.headerGradient}
                />
                <View style={styles.content}>
                    <View style={styles.header}>
                        <PageHeader onPress={() => router.back()} />
                        <Text style={styles.headerTitle}>Health Trends</Text>
                    </View>
                    <View style={styles.loadingContainer}>
                        <Ionicons name="analytics" size={48} color="#FF5722" />
                        <Text style={styles.loadingText}>Loading Health Data...</Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient 
                colors={["#FF5722", "#E64A19"]}
                style={styles.headerGradient}
            />
            
            <View style={styles.content}>
                <View style={styles.header}>
                    <PageHeader onPress={() => router.back()} />
                    <Text style={styles.headerTitle}>Health Trends</Text>
                    <TouchableOpacity 
                        style={styles.addButton}
                        onPress={() => setShowAddModal(true)}
                    >
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {/* Metric Selector */}
                    {renderMetricSelector()}

                    {/* Period Selector */}
                    <View style={styles.periodSelector}>
                        {PERIOD_OPTIONS.map((period) => (
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

                    {/* Chart Section */}
                    <View style={styles.chartSection}>
                        <View style={styles.chartHeader}>
                            <Text style={styles.chartTitle}>
                                {getCurrentMetric().name} Trend
                            </Text>
                            <Text style={styles.chartSubtitle}>
                                Last {selectedPeriod} days
                            </Text>
                        </View>
                        {renderSimpleChart(getFilteredData())}
                    </View>

                    {/* Insights */}
                    {renderTrendInsights()}

                    {/* Recent Entries */}
                    <View style={styles.recentSection}>
                        <Text style={styles.sectionTitle}>Recent Entries</Text>
                        {getFilteredData().length > 0 ? 
                            getFilteredData().slice(-5).reverse().map((entry) => (
                                <View key={entry.id} style={styles.entryCard}>
                                    <View style={styles.entryInfo}>
                                        <Text style={styles.entryValue}>
                                            {entry.value} {getCurrentMetric().unit}
                                        </Text>
                                        <Text style={styles.entryDate}>
                                            {new Date(entry.timestamp).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    {entry.notes && (
                                        <Text style={styles.entryNotes}>{entry.notes}</Text>
                                    )}
                                </View>
                            )) : (
                                <View style={styles.emptyState}>
                                    <Ionicons name="document-text-outline" size={32} color="#ccc" />
                                    <Text style={styles.emptyStateText}>No entries yet</Text>
                                    <Text style={styles.emptyStateSubtext}>
                                        Add your first {getCurrentMetric().name.toLowerCase()} reading
                                    </Text>
                                </View>
                            )
                        }
                    </View>
                </ScrollView>
            </View>

            {/* Add Entry Modal */}
            <Modal
                visible={showAddModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Add {getCurrentMetric().name}
                            </Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setShowAddModal(false)}
                            >
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.inputLabel}>
                                Value ({getCurrentMetric().unit})
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={newEntry.value}
                                onChangeText={(text) => setNewEntry({...newEntry, value: text})}
                                placeholder={`Enter ${getCurrentMetric().name.toLowerCase()}`}
                                keyboardType="numeric"
                            />

                            <Text style={styles.inputLabel}>Notes (Optional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={newEntry.notes}
                                onChangeText={(text) => setNewEntry({...newEntry, notes: text})}
                                placeholder="Add any notes about this reading..."
                                multiline
                                numberOfLines={3}
                            />

                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={addHealthEntry}
                            >
                                <LinearGradient
                                    colors={["#FF5722", "#E64A19"]}
                                    style={styles.saveButtonGradient}
                                >
                                    <Text style={styles.saveButtonText}>Save Entry</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        flex: 1,
    },
    addButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
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
    metricSelector: {
        marginBottom: 20,
    },
    metricButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
    },
    selectedMetricButton: {
        backgroundColor: '#FF5722',
        borderColor: '#FF5722',
    },
    metricButtonText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    selectedMetricButtonText: {
        color: 'white',
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
        backgroundColor: '#FF5722',
    },
    periodButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    selectedPeriodButtonText: {
        color: 'white',
    },
    chartSection: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    chartHeader: {
        marginBottom: 20,
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    chartSubtitle: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    chartContainer: {
        height: 150,
        position: 'relative',
    },
    chartArea: {
        height: 120,
        position: 'relative',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    chartPoint: {
        position: 'absolute',
        bottom: 0,
        width: 8,
        borderRadius: 4,
    },
    chartLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    chartLabel: {
        fontSize: 12,
        color: '#666',
    },
    emptyChart: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 150,
    },
    emptyChartText: {
        fontSize: 16,
        color: '#999',
        marginTop: 10,
    },
    emptyChartSubtext: {
        fontSize: 12,
        color: '#ccc',
        marginTop: 4,
    },
    insightsContainer: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    insightCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    insightTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginLeft: 8,
    },
    insightText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    insightSubtext: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    recentSection: {
        marginBottom: 40,
    },
    entryCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
    },
    entryInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    entryValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    entryDate: {
        fontSize: 12,
        color: '#666',
    },
    entryNotes: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
        fontStyle: 'italic',
    },
    emptyState: {
        alignItems: 'center',
        padding: 30,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#999',
        marginTop: 10,
    },
    emptyStateSubtext: {
        fontSize: 12,
        color: '#ccc',
        marginTop: 4,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 5,
    },
    modalBody: {
        paddingBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e5e5',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    saveButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    saveButtonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});