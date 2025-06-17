// app/doctor/reports/index.jsx - Enhanced reports with meaningful insights and better data visualization
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
  const [timeFilter, setTimeFilter] = useState('month'); // week, month, quarter, year

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

  const getEnhancedAnalytics = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    
    // Current period appointments
    const todayAppointments = allAppointments.filter(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      return aptDate.toDateString() === today.toDateString();
    });
    
    const yesterdayAppointments = allAppointments.filter(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      return aptDate.toDateString() === yesterday.toDateString();
    });
    
    const thisMonthAppointments = allAppointments.filter(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      return aptDate.getMonth() === thisMonth && aptDate.getFullYear() === thisYear;
    });
    
    const lastMonthAppointments = allAppointments.filter(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      return aptDate.getMonth() === lastMonth && aptDate.getFullYear() === lastMonthYear;
    });
    
    // Weekly data for trends
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return date;
    }).reverse();
    
    const weeklyData = last7Days.map(date => {
      const count = allAppointments.filter(apt => {
        const aptDate = parseAppointmentDate(apt.date);
        return aptDate.toDateString() === date.toDateString();
      }).length;
      return { date, count };
    });
    
    // Status breakdown
    const statusBreakdown = {};
    allAppointments.forEach(apt => {
      const status = apt.status || 'Scheduled';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });
    
    // Prescription insights
    const prescriptionsAdded = allAppointments.filter(apt => apt.has_prescription).length;
    const prescriptionsPending = allAppointments.filter(apt => !apt.has_prescription && apt.status !== 'Cancelled').length;
    
    // Patient insights
    const uniquePatients = [...new Set(allAppointments.map(apt => apt.user_id))].length;
    const newPatientsThisMonth = [...new Set(thisMonthAppointments.map(apt => apt.user_id))].length;
    
    // Service analytics
    const serviceStats = {};
    allAppointments.forEach(apt => {
      const service = apt.service_name || 'General Consultation';
      serviceStats[service] = (serviceStats[service] || 0) + 1;
    });
    
    // Calculate trends
    const dailyGrowth = yesterdayAppointments.length > 0 
      ? ((todayAppointments.length - yesterdayAppointments.length) / yesterdayAppointments.length * 100)
      : (todayAppointments.length > 0 ? 100 : 0);
      
    const monthlyGrowth = lastMonthAppointments.length > 0 
      ? ((thisMonthAppointments.length - lastMonthAppointments.length) / lastMonthAppointments.length * 100)
      : (thisMonthAppointments.length > 0 ? 100 : 0);
    
    // Performance insights
    const completionRate = allAppointments.length > 0 
      ? (prescriptionsAdded / allAppointments.length * 100) 
      : 0;
      
    const patientRetentionRate = allPatients.length > 0 
      ? (uniquePatients / allPatients.length * 100) 
      : 0;
    
    // Identify trends and insights
    const insights = generateInsights({
      todayAppointments: todayAppointments.length,
      yesterdayAppointments: yesterdayAppointments.length,
      thisMonthAppointments: thisMonthAppointments.length,
      lastMonthAppointments: lastMonthAppointments.length,
      prescriptionsPending,
      completionRate,
      patientRetentionRate,
      serviceStats
    });
    
    return {
      // Basic metrics
      todayAppointments: todayAppointments.length,
      yesterdayAppointments: yesterdayAppointments.length,
      thisMonthAppointments: thisMonthAppointments.length,
      lastMonthAppointments: lastMonthAppointments.length,
      totalAppointments: allAppointments.length,
      prescriptionsAdded,
      prescriptionsPending,
      uniquePatients,
      totalPatients: allPatients.length,
      newPatientsThisMonth,
      
      // Trends
      dailyGrowth,
      monthlyGrowth,
      weeklyData,
      
      // Breakdown
      statusBreakdown,
      serviceStats,
      
      // Performance
      completionRate,
      patientRetentionRate,
      
      // Insights
      insights
    };
  };

  const generateInsights = (data) => {
    const insights = [];
    
    // Daily performance insight
    if (data.todayAppointments > data.yesterdayAppointments) {
      insights.push({
        type: 'positive',
        title: 'Daily Growth',
        message: `${data.todayAppointments - data.yesterdayAppointments} more appointments than yesterday`,
        icon: 'trending-up',
        priority: 'high'
      });
    } else if (data.todayAppointments < data.yesterdayAppointments) {
      insights.push({
        type: 'warning',
        title: 'Daily Decline',
        message: `${data.yesterdayAppointments - data.todayAppointments} fewer appointments than yesterday`,
        icon: 'trending-down',
        priority: 'medium'
      });
    }
    
    // Prescription management insight
    if (data.prescriptionsPending > 5) {
      insights.push({
        type: 'action',
        title: 'Prescription Backlog',
        message: `${data.prescriptionsPending} appointments need prescriptions`,
        icon: 'medical',
        priority: 'high'
      });
    }
    
    // Patient retention insight
    if (data.patientRetentionRate > 70) {
      insights.push({
        type: 'positive',
        title: 'High Patient Engagement',
        message: `${Math.round(data.patientRetentionRate)}% of patients are actively visiting`,
        icon: 'people',
        priority: 'medium'
      });
    }
    
    // Service popularity insight
    const mostPopularService = Object.keys(data.serviceStats).reduce((a, b) => 
      data.serviceStats[a] > data.serviceStats[b] ? a : b, 'General Consultation'
    );
    
    if (mostPopularService !== 'General Consultation') {
      insights.push({
        type: 'info',
        title: 'Popular Service',
        message: `${mostPopularService} is your most requested service`,
        icon: 'star',
        priority: 'low'
      });
    }
    
    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const getInsightColor = (type) => {
    switch (type) {
      case 'positive': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'action': return '#f44336';
      case 'info': return '#2196F3';
      default: return '#666';
    }
  };

  const getTrendIcon = (value) => {
    if (value > 0) return { name: 'trending-up', color: '#4CAF50' };
    if (value < 0) return { name: 'trending-down', color: '#f44336' };
    return { name: 'remove', color: '#666' };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Analyzing your practice data...</Text>
      </View>
    );
  }

  const analytics = getEnhancedAnalytics();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a8e2d" />
      
      {/* Enhanced Header */}
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
            <Text style={styles.headerTitle}>Practice Analytics</Text>
            <Text style={styles.headerSubtitle}>Insights & Performance Dashboard</Text>
          </View>
          
          <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Key Insights Section */}
        {analytics.insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Key Insights</Text>
            {analytics.insights.slice(0, 3).map((insight, index) => (
              <View key={index} style={[styles.insightCard, { borderLeftColor: getInsightColor(insight.type) }]}>
                <View style={styles.insightHeader}>
                  <View style={[styles.insightIcon, { backgroundColor: `${getInsightColor(insight.type)}20` }]}>
                    <Ionicons name={insight.icon} size={20} color={getInsightColor(insight.type)} />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightMessage}>{insight.message}</Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: getInsightColor(insight.type) }]}>
                    <Text style={styles.priorityText}>{insight.priority.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Enhanced KPI Dashboard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Key Performance Indicators</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiValue}>{analytics.todayAppointments}</Text>
                <View style={styles.trendContainer}>
                  <Ionicons 
                    name={getTrendIcon(analytics.dailyGrowth).name} 
                    size={16} 
                    color={getTrendIcon(analytics.dailyGrowth).color} 
                  />
                  <Text style={[styles.trendText, { color: getTrendIcon(analytics.dailyGrowth).color }]}>
                    {Math.abs(analytics.dailyGrowth).toFixed(1)}%
                  </Text>
                </View>
              </View>
              <Text style={styles.kpiLabel}>Today's Appointments</Text>
              <Text style={styles.kpiDescription}>vs yesterday: {analytics.yesterdayAppointments}</Text>
            </View>
            
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiValue}>{analytics.thisMonthAppointments}</Text>
                <View style={styles.trendContainer}>
                  <Ionicons 
                    name={getTrendIcon(analytics.monthlyGrowth).name} 
                    size={16} 
                    color={getTrendIcon(analytics.monthlyGrowth).color} 
                  />
                  <Text style={[styles.trendText, { color: getTrendIcon(analytics.monthlyGrowth).color }]}>
                    {Math.abs(analytics.monthlyGrowth).toFixed(1)}%
                  </Text>
                </View>
              </View>
              <Text style={styles.kpiLabel}>This Month</Text>
              <Text style={styles.kpiDescription}>vs last month: {analytics.lastMonthAppointments}</Text>
            </View>
            
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <Text style={[styles.kpiValue, { color: '#4CAF50' }]}>
                  {Math.round(analytics.completionRate)}%
                </Text>
                <View style={styles.circularProgress}>
                  <View style={[styles.progressCircle, { 
                    transform: [{ rotate: `${analytics.completionRate * 3.6}deg` }] 
                  }]} />
                </View>
              </View>
              <Text style={styles.kpiLabel}>Completion Rate</Text>
              <Text style={styles.kpiDescription}>{analytics.prescriptionsAdded}/{analytics.totalAppointments} completed</Text>
            </View>
            
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <Text style={[styles.kpiValue, { color: '#2196F3' }]}>
                  {Math.round(analytics.patientRetentionRate)}%
                </Text>
                <View style={styles.engagementIndicator}>
                  <View style={[styles.engagementBar, { 
                    width: `${analytics.patientRetentionRate}%`,
                    backgroundColor: analytics.patientRetentionRate > 70 ? '#4CAF50' : 
                                   analytics.patientRetentionRate > 50 ? '#FF9800' : '#f44336'
                  }]} />
                </View>
              </View>
              <Text style={styles.kpiLabel}>Patient Engagement</Text>
              <Text style={styles.kpiDescription}>{analytics.uniquePatients}/{analytics.totalPatients} active patients</Text>
            </View>
          </View>
        </View>

        {/* Weekly Trend Visualization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Weekly Appointment Trends</Text>
          <View style={styles.chartCard}>
            <View style={styles.chartContainer}>
              {analytics.weeklyData.map((day, index) => {
                const maxCount = Math.max(...analytics.weeklyData.map(d => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <View key={index} style={styles.chartColumn}>
                    <View style={styles.chartBarContainer}>
                      <View style={[styles.chartBar, { 
                        height: `${height}%`,
                        backgroundColor: day.count > 0 ? '#4CAF50' : '#e0e0e0'
                      }]} />
                    </View>
                    <Text style={styles.chartLabel}>
                      {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <Text style={styles.chartValue}>{day.count}</Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.chartSummary}>
              <Text style={styles.chartSummaryText}>
                Average: {(analytics.weeklyData.reduce((sum, day) => sum + day.count, 0) / 7).toFixed(1)} appointments/day
              </Text>
            </View>
          </View>
        </View>

        {/* Status Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Appointment Status Breakdown</Text>
          <View style={styles.statusGrid}>
            {Object.entries(analytics.statusBreakdown).map(([status, count]) => (
              <View key={status} style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <View style={[styles.statusIcon, { backgroundColor: getStatusColor(status) }]}>
                    <Ionicons name={getStatusIcon(status)} size={20} color="white" />
                  </View>
                  <Text style={styles.statusCount}>{count}</Text>
                </View>
                <Text style={styles.statusLabel}>{status}</Text>
                <Text style={styles.statusPercentage}>
                  {((count / analytics.totalAppointments) * 100).toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Service Performance Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏥 Service Performance Analysis</Text>
          <View style={styles.serviceAnalysisCard}>
            {Object.entries(analytics.serviceStats)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([service, count], index) => {
                const percentage = (count / analytics.totalAppointments) * 100;
                const isTop = index === 0;
                return (
                  <View key={service} style={styles.serviceRow}>
                    <View style={styles.serviceInfo}>
                      <View style={styles.serviceRank}>
                        <Text style={[styles.rankNumber, isTop && styles.topRank]}>#{index + 1}</Text>
                      </View>
                      <View style={styles.serviceDetails}>
                        <Text style={[styles.serviceName, isTop && styles.topService]}>{service}</Text>
                        <Text style={styles.serviceStats}>{count} appointments • {percentage.toFixed(1)}%</Text>
                      </View>
                    </View>
                    <View style={styles.serviceBarContainer}>
                      <View style={[styles.serviceBar, { 
                        width: `${percentage}%`,
                        backgroundColor: isTop ? '#4CAF50' : '#e0e0e0'
                      }]} />
                    </View>
                  </View>
                );
              })}
          </View>
        </View>

        {/* Action Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Recommended Actions</Text>
          <View style={styles.actionItemsContainer}>
            {analytics.prescriptionsPending > 0 && (
              <TouchableOpacity style={styles.actionCard}>
                <View style={styles.actionIcon}>
                  <Ionicons name="medical" size={24} color="#f44336" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Complete Prescriptions</Text>
                  <Text style={styles.actionDescription}>
                    {analytics.prescriptionsPending} appointments need prescriptions
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            )}
            
            {analytics.newPatientsThisMonth > 5 && (
              <TouchableOpacity style={styles.actionCard}>
                <View style={styles.actionIcon}>
                  <Ionicons name="people" size={24} color="#4CAF50" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Follow Up New Patients</Text>
                  <Text style={styles.actionDescription}>
                    {analytics.newPatientsThisMonth} new patients this month - consider follow-up
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            )}
            
            {analytics.completionRate < 70 && (
              <TouchableOpacity style={styles.actionCard}>
                <View style={styles.actionIcon}>
                  <Ionicons name="trending-up" size={24} color="#FF9800" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Improve Completion Rate</Text>
                  <Text style={styles.actionDescription}>
                    Current rate: {Math.round(analytics.completionRate)}% - aim for 80%+
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Export & Share Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📤 Export & Share</Text>
          <View style={styles.exportGrid}>
            <TouchableOpacity style={styles.exportOption}>
              <Ionicons name="document-text" size={32} color="#4CAF50" />
              <Text style={styles.exportTitle}>PDF Report</Text>
              <Text style={styles.exportSubtitle}>Detailed analysis</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.exportOption}>
              <Ionicons name="grid" size={32} color="#2196F3" />
              <Text style={styles.exportTitle}>Excel Data</Text>
              <Text style={styles.exportSubtitle}>Raw data export</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.exportOption}>
              <Ionicons name="share" size={32} color="#FF9800" />
              <Text style={styles.exportTitle}>Share Insights</Text>
              <Text style={styles.exportSubtitle}>Quick summary</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Enhanced Footer */}
        <View style={styles.footer}>
          <View style={styles.footerStats}>
            <Text style={styles.footerTitle}>Report Summary</Text>
            <Text style={styles.footerDescription}>
              Generated for {analytics.totalAppointments} total appointments and {analytics.totalPatients} patients
            </Text>
          </View>
          <Text style={styles.footerTimestamp}>
            Last updated: {new Date().toLocaleString()}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// Helper functions
const getStatusColor = (status) => {
  switch (status.toLowerCase()) {
    case 'completed': return '#4CAF50';
    case 'confirmed': return '#2196F3';
    case 'cancelled': return '#f44336';
    case 'rescheduled': return '#FF9800';
    case 'no show': return '#9C27B0';
    default: return '#666';
  }
};

const getStatusIcon = (status) => {
  switch (status.toLowerCase()) {
    case 'completed': return 'checkmark-circle';
    case 'confirmed': return 'calendar';
    case 'cancelled': return 'close-circle';
    case 'rescheduled': return 'time';
    case 'no show': return 'alert-circle';
    default: return 'ellipse';
  }
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },

  // Key Insights
  insightCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  insightMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },

  // KPI Cards
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  kpiLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  kpiDescription: {
    fontSize: 12,
    color: '#666',
  },

  // Progress indicators
  circularProgress: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  progressCircle: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  engagementIndicator: {
    width: 50,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  engagementBar: {
    height: '100%',
    borderRadius: 2,
  },

  // Chart
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: 16,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  chartBarContainer: {
    height: 80,
    width: 20,
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 2,
  },
  chartLabel: {
    fontSize: 10,
    color: '#666',
  },
  chartValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  chartSummary: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    alignItems: 'center',
  },
  chartSummaryText: {
    fontSize: 14,
    color: '#666',
  },

  // Status breakdown
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statusCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  statusPercentage: {
    fontSize: 12,
    color: '#666',
  },

  // Service analysis
  serviceAnalysisCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  serviceRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  topRank: {
    color: '#4CAF50',
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  topService: {
    color: '#4CAF50',
  },
  serviceStats: {
    fontSize: 12,
    color: '#666',
  },
  serviceBarContainer: {
    width: 80,
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  serviceBar: {
    height: '100%',
    borderRadius: 3,
  },

  // Action items
  actionItemsContainer: {
    gap: 12,
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  // Export options
  exportGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  exportOption: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  exportSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },

  // Footer
  footer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  footerStats: {
    marginBottom: 12,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  footerDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footerTimestamp: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
});