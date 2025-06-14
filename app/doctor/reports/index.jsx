// app/doctor/reports/index.jsx - Full screen reports with better readability
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DatabaseService } from '../../../configs/AppwriteConfig';
import { getLocalStorage } from '../../../service/Storage';

const APPOINTMENTS_COLLECTION_ID = '67e0332c0001131d71ec';
const USERS_COLLECTION_ID = '67e032ec0025cf1956ff';

export default function DoctorReports() {
  const [allAppointments, setAllAppointments] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load user data
      const userData = await getLocalStorage('userDetail');
      setUser(userData);

      // Load appointments
      const appointmentsResponse = await DatabaseService.listDocuments(APPOINTMENTS_COLLECTION_ID, []);
      setAllAppointments(appointmentsResponse.documents || []);

      // Load patients
      const usersResponse = await DatabaseService.listDocuments(USERS_COLLECTION_ID, []);
      const patients = usersResponse.documents.filter(user => !user.role || user.role !== 'doctor');
      setAllPatients(patients);

    } catch (error) {
      console.error('Error loading report data:', error);
      Alert.alert('Error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const parseAppointmentDate = (dateString) => {
    try {
      if (dateString && dateString.includes(',')) {
        const [, datePart] = dateString.split(', ');
        const [day, month, year] = datePart.split(' ');
        const monthIndex = getMonthIndex(month);
        return new Date(year, monthIndex, parseInt(day));
      }
      return new Date();
    } catch (error) {
      return new Date();
    }
  };

  const getMonthIndex = (monthName) => {
    const months = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    return months[monthName] || 0;
  };

  const getReportAnalytics = () => {
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    
    // Today's appointments
    const todayAppointments = allAppointments.filter(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      return aptDate.toDateString() === today.toDateString();
    });
    
    // This month's appointments
    const thisMonthAppointments = allAppointments.filter(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      return aptDate.getMonth() === thisMonth && aptDate.getFullYear() === thisYear;
    });
    
    // Prescription statistics
    const prescriptionsAdded = allAppointments.filter(apt => apt.has_prescription).length;
    const prescriptionsPending = allAppointments.filter(apt => !apt.has_prescription).length;
    
    // Patient demographics
    const uniquePatients = [...new Set(allAppointments.map(apt => apt.user_id))].length;
    
    // Service statistics
    const serviceStats = {};
    allAppointments.forEach(apt => {
      const service = apt.service_name || 'General Consultation';
      serviceStats[service] = (serviceStats[service] || 0) + 1;
    });
    
    const mostPopularService = Object.keys(serviceStats).length > 0 
      ? Object.keys(serviceStats).reduce((a, b) => serviceStats[a] > serviceStats[b] ? a : b)
      : 'General Consultation';
    
    return {
      todayAppointments: todayAppointments.length,
      thisMonthAppointments: thisMonthAppointments.length,
      totalAppointments: allAppointments.length,
      prescriptionsAdded,
      prescriptionsPending,
      uniquePatients,
      totalPatients: allPatients.length,
      mostPopularService,
      serviceStats
    };
  };

  const handleExportPDF = () => {
    Alert.alert('Export PDF', 'PDF export functionality will be implemented soon');
  };

  const handleExportExcel = () => {
    Alert.alert('Export Excel', 'Excel export functionality will be implemented soon');
  };

  const handleShareReport = () => {
    Alert.alert('Share Report', 'Report sharing functionality will be implemented soon');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading report data...</Text>
      </View>
    );
  }

  const analytics = getReportAnalytics();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a8e2d" />
      
      {/* Header */}
      <LinearGradient 
        colors={["#1a8e2d", "#146922"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Healthcare Reports</Text>
            <Text style={styles.headerSubtitle}>Permai Polyclinic Management</Text>
          </View>
          
          <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Overview Summary</Text>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewCard}>
              <View style={styles.overviewIconContainer}>
                <Ionicons name="calendar-outline" size={32} color="#4CAF50" />
              </View>
              <Text style={styles.overviewNumber}>{analytics.todayAppointments}</Text>
              <Text style={styles.overviewLabel}>Today's Appointments</Text>
            </View>
            
            <View style={styles.overviewCard}>
              <View style={styles.overviewIconContainer}>
                <Ionicons name="calendar" size={32} color="#2196F3" />
              </View>
              <Text style={styles.overviewNumber}>{analytics.thisMonthAppointments}</Text>
              <Text style={styles.overviewLabel}>This Month</Text>
            </View>
            
            <View style={styles.overviewCard}>
              <View style={styles.overviewIconContainer}>
                <Ionicons name="medical" size={32} color="#FF9800" />
              </View>
              <Text style={styles.overviewNumber}>{analytics.prescriptionsAdded}</Text>
              <Text style={styles.overviewLabel}>Prescriptions Added</Text>
            </View>
            
            <View style={styles.overviewCard}>
              <View style={styles.overviewIconContainer}>
                <Ionicons name="people" size={32} color="#9C27B0" />
              </View>
              <Text style={styles.overviewNumber}>{analytics.uniquePatients}</Text>
              <Text style={styles.overviewLabel}>Active Patients</Text>
            </View>
          </View>
        </View>

        {/* Patient Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Patient Analytics</Text>
          <View style={styles.analyticsCard}>
            <View style={styles.analyticRow}>
              <View style={styles.analyticInfo}>
                <Text style={styles.analyticLabel}>Total Registered Patients</Text>
                <Text style={styles.analyticDescription}>All patients in the system</Text>
              </View>
              <Text style={styles.analyticValue}>{analytics.totalPatients}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.analyticRow}>
              <View style={styles.analyticInfo}>
                <Text style={styles.analyticLabel}>Patients with Appointments</Text>
                <Text style={styles.analyticDescription}>Active patients with recent visits</Text>
              </View>
              <Text style={styles.analyticValue}>{analytics.uniquePatients}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.analyticRow}>
              <View style={styles.analyticInfo}>
                <Text style={styles.analyticLabel}>Patient Engagement Rate</Text>
                <Text style={styles.analyticDescription}>Percentage of active patients</Text>
              </View>
              <Text style={[styles.analyticValue, { color: '#4CAF50' }]}>
                {analytics.totalPatients > 0 ? 
                  Math.round((analytics.uniquePatients / analytics.totalPatients) * 100) : 0}%
              </Text>
            </View>
          </View>
        </View>

        {/* Prescription Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💊 Prescription Management</Text>
          <View style={styles.analyticsCard}>
            <View style={styles.analyticRow}>
              <View style={styles.analyticInfo}>
                <Text style={styles.analyticLabel}>Total Appointments</Text>
                <Text style={styles.analyticDescription}>All scheduled appointments</Text>
              </View>
              <Text style={styles.analyticValue}>{analytics.totalAppointments}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.analyticRow}>
              <View style={styles.analyticInfo}>
                <Text style={styles.analyticLabel}>Prescriptions Added</Text>
                <Text style={styles.analyticDescription}>Completed appointments with prescriptions</Text>
              </View>
              <Text style={[styles.analyticValue, { color: '#4CAF50' }]}>{analytics.prescriptionsAdded}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.analyticRow}>
              <View style={styles.analyticInfo}>
                <Text style={styles.analyticLabel}>Pending Prescriptions</Text>
                <Text style={styles.analyticDescription}>Appointments awaiting prescriptions</Text>
              </View>
              <Text style={[styles.analyticValue, { color: '#FF9800' }]}>{analytics.prescriptionsPending}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.analyticRow}>
              <View style={styles.analyticInfo}>
                <Text style={styles.analyticLabel}>Completion Rate</Text>
                <Text style={styles.analyticDescription}>Percentage of completed appointments</Text>
              </View>
              <View style={styles.completionContainer}>
                <Text style={[styles.analyticValue, { color: '#4CAF50' }]}>
                  {analytics.totalAppointments > 0 ? 
                    Math.round((analytics.prescriptionsAdded / analytics.totalAppointments) * 100) : 0}%
                </Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${analytics.totalAppointments > 0 ? 
                          (analytics.prescriptionsAdded / analytics.totalAppointments) * 100 : 0}%` 
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Service Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏥 Service Analytics</Text>
          <View style={styles.analyticsCard}>
            <View style={styles.analyticRow}>
              <View style={styles.analyticInfo}>
                <Text style={styles.analyticLabel}>Most Popular Service</Text>
                <Text style={styles.analyticDescription}>Service with highest demand</Text>
              </View>
              <Text style={[styles.analyticValue, { color: '#4CAF50' }]}>{analytics.mostPopularService}</Text>
            </View>
            
            {Object.keys(analytics.serviceStats).length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.serviceStatsTitle}>Service Distribution</Text>
                {Object.entries(analytics.serviceStats).slice(0, 6).map(([service, count]) => (
                  <View key={service} style={styles.serviceStatRow}>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{service}</Text>
                      <Text style={styles.serviceCount}>{count} appointments</Text>
                    </View>
                    <View style={styles.serviceBarContainer}>
                      <View 
                        style={[
                          styles.serviceBar, 
                          { 
                            width: `${(count / Math.max(...Object.values(analytics.serviceStats))) * 100}%`,
                            backgroundColor: getServiceColor(service)
                          }
                        ]} 
                      />
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Performance Metrics</Text>
          <View style={styles.performanceGrid}>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceNumber}>{analytics.todayAppointments}</Text>
              <Text style={styles.performanceLabel}>Today</Text>
              <Text style={styles.performanceDescription}>Appointments scheduled</Text>
            </View>
            
            <View style={styles.performanceCard}>
              <Text style={styles.performanceNumber}>
                {Math.round(analytics.thisMonthAppointments / new Date().getDate())}
              </Text>
              <Text style={styles.performanceLabel}>Daily Average</Text>
              <Text style={styles.performanceDescription}>This month</Text>
            </View>
            
            <View style={styles.performanceCard}>
              <Text style={styles.performanceNumber}>{analytics.thisMonthAppointments}</Text>
              <Text style={styles.performanceLabel}>Monthly Total</Text>
              <Text style={styles.performanceDescription}>Current month</Text>
            </View>
          </View>
        </View>

        {/* Export Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📄 Export Options</Text>
          <View style={styles.exportContainer}>
            <TouchableOpacity style={styles.exportCard} onPress={handleExportPDF}>
              <View style={styles.exportIconContainer}>
                <Ionicons name="document-text" size={28} color="#4CAF50" />
              </View>
              <Text style={styles.exportTitle}>Export to PDF</Text>
              <Text style={styles.exportDescription}>Generate comprehensive PDF report</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.exportCard} onPress={handleExportExcel}>
              <View style={styles.exportIconContainer}>
                <Ionicons name="grid" size={28} color="#4CAF50" />
              </View>
              <Text style={styles.exportTitle}>Export to Excel</Text>
              <Text style={styles.exportDescription}>Download data as spreadsheet</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.exportCard} onPress={handleShareReport}>
              <View style={styles.exportIconContainer}>
                <Ionicons name="share" size={28} color="#4CAF50" />
              </View>
              <Text style={styles.exportTitle}>Share Report</Text>
              <Text style={styles.exportDescription}>Share via email or messaging</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Information */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Report Generated</Text>
          <Text style={styles.footerDate}>{new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</Text>
          <Text style={styles.footerText}>Permai Polyclinic Management System</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const getServiceColor = (service) => {
  const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#795548'];
  const index = service.length % colors.length;
  return colors[index];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  
  // Overview Cards
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  overviewCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewIconContainer: {
    marginBottom: 12,
  },
  overviewNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  overviewLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Analytics Cards
  analyticsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  analyticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  analyticInfo: {
    flex: 1,
    marginRight: 16,
  },
  analyticLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  analyticDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  analyticValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: -24,
  },
  completionContainer: {
    alignItems: 'flex-end',
  },
  progressBar: {
    width: 80,
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  
  // Service Analytics
  serviceStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  serviceStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 16,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  serviceCount: {
    fontSize: 12,
    color: '#666',
  },
  serviceBarContainer: {
    width: 100,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  serviceBar: {
    height: '100%',
    borderRadius: 4,
  },
  
  // Performance Metrics
  performanceGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  performanceCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  performanceNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  performanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  performanceDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  
  // Export Options
  exportContainer: {
    gap: 16,
  },
  exportCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f9f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    flex: 1,
  },
  exportDescription: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  
  // Footer
  footer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  footerDate: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});