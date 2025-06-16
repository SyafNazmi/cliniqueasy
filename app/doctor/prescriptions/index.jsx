// app/doctor/prescriptions/index.jsx - FIXED with real-time updates and focus refresh
import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  StatusBar, 
  TextInput,
  FlatList,
  RefreshControl,
  Dimensions,
  Modal
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DatabaseService, Query } from '../../../configs/AppwriteConfig';
import { getLocalStorage } from '../../../service/Storage';
import { COLLECTIONS } from '../../../constants'; // Use constants instead of hardcoded IDs
import { useFocusEffect } from '@react-navigation/native'; // Added for focus refresh
import { appointmentManager } from '../../../service/appointmentUtils'; // Added for real-time updates

const { width } = Dimensions.get('window');

export default function EnhancedDoctorPrescriptions() {
  const [allAppointments, setAllAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [patientNames, setPatientNames] = useState({});
  const [branchNames, setBranchNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Advanced filter states
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedDateRange, setSelectedDateRange] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  
  const [statsData, setStatsData] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    today: 0
  });

  const [availableServices, setAvailableServices] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  // ADDED: Focus effect to refresh data when returning to screen
  useFocusEffect(
    useCallback(() => {
      loadData(false); // Don't show loader when refocusing
    }, [])
  );

  // ADDED: Set up real-time subscription for appointments/prescriptions
  useEffect(() => {
    let subscriptionKey = null;

    const setupRealtimeSubscription = async () => {
      try {
        const userData = await getLocalStorage('userDetail');
        if (userData?.uid) {
          subscriptionKey = appointmentManager.subscribeToAppointments(
            (event) => {
              console.log('Doctor prescriptions received update:', event);
              
              // Refresh prescriptions when any appointment changes
              const retryFetch = async (attempt = 1, maxAttempts = 3) => {
                await loadData(false);
                
                // Check if the appointment change is reflected
                const appointmentId = event.appointment?.$id;
                if (appointmentId && attempt < maxAttempts) {
                  setTimeout(() => {
                    setAllAppointments(currentAppointments => {
                      const hasAppointment = currentAppointments.some(apt => apt.$id === appointmentId);
                      
                      if (!hasAppointment && event.type !== 'delete') {
                        setTimeout(() => retryFetch(attempt + 1, maxAttempts), 1500);
                      }
                      
                      return currentAppointments;
                    });
                  }, 500);
                }
              };
              
              // Start the retry process with a delay
              setTimeout(() => retryFetch(), 1000);
            }
          );
        }
      } catch (error) {
        console.error('Error setting up doctor prescriptions real-time subscription:', error);
      }
    };

    setupRealtimeSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionKey) {
        appointmentManager.unsubscribe(subscriptionKey);
      }
    };
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [allAppointments, searchQuery, activeFilter, selectedServices, selectedDateRange, customDateFrom, customDateTo]);

  // UPDATED: Enhanced loadData with same logic as other doctor screens
  const loadData = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      const userData = await getLocalStorage('userDetail');
      setUser(userData);

      // Enhanced query with ordering (same as other doctor screens)
      const queries = [
        Query.orderDesc('$createdAt'),
        Query.limit(100)
      ];

      const appointmentsResponse = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS, // Use constant instead of hardcoded ID
        queries
      );
      
      let appointments = appointmentsResponse.documents || [];
      
      // Sort appointments by date (same logic as other screens)
      appointments.sort((a, b) => {
        try {
          const dateA = parseAppointmentDate(a.date);
          const dateB = parseAppointmentDate(b.date);
          
          if (dateA.getTime() === dateB.getTime()) {
            return convert12HourTo24Hour(a.time_slot || '').localeCompare(
              convert12HourTo24Hour(b.time_slot || '')
            );
          }
          
          return dateB - dateA;
        } catch (error) {
          return 0;
        }
      });
      
      setAllAppointments(appointments);
      await fetchPatientNames(appointments);
      await fetchBranchNames(appointments);
      calculateStats(appointments);
      extractAvailableServices(appointments);

    } catch (error) {
      console.error('Error loading prescription data:', error);
      Alert.alert('Error', 'Failed to load prescription data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const extractAvailableServices = (appointments) => {
    const services = [...new Set(appointments.map(apt => apt.service_name).filter(Boolean))];
    setAvailableServices(services.sort());
  };

  const onRefresh = async () => {
    await loadData(false);
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

  const convert12HourTo24Hour = (timeString) => {
    try {
      if (!timeString) return '';
      
      const [time, modifier] = timeString.split(' ');
      let [hours, minutes] = time.split(':');
      
      hours = parseInt(hours);
      
      if (modifier === 'PM' && hours < 12) {
        hours += 12;
      } else if (modifier === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    } catch (e) {
      return timeString;
    }
  };

  // UPDATED: Enhanced patient name fetching with same logic as other doctor screens
  const fetchPatientNames = async (appointments) => {
    try {
      const nameMap = {};
      
      for (const appointment of appointments) {
        let patientName = 'Unknown Patient';
        
        try {
          // Check if this is a family booking with patient_name
          if (appointment.is_family_booking && appointment.patient_name) {
            patientName = appointment.patient_name;
          } 
          // If family booking but no patient_name, try to fetch by patient_id
          else if (appointment.is_family_booking && appointment.patient_id) {
            try {
              const patientResponse = await DatabaseService.listDocuments(
                COLLECTIONS.PATIENT_PROFILES,
                [Query.equal('$id', appointment.patient_id)]
              );
              
              if (patientResponse.documents && patientResponse.documents.length > 0) {
                const patient = patientResponse.documents[0];
                patientName = patient.fullName || patient.name || patient.displayName || appointment.patient_name || 'Family Member';
              } else {
                patientName = appointment.patient_name || 'Family Member';
              }
            } catch (error) {
              patientName = appointment.patient_name || 'Family Member';
            }
          }
          // Regular booking - fetch by user_id
          else if (appointment.user_id) {
            try {
              const usersResponse = await DatabaseService.listDocuments(
                COLLECTIONS.PATIENT_PROFILES,
                [Query.equal('userId', appointment.user_id)]
              );
              
              if (usersResponse.documents && usersResponse.documents.length > 0) {
                const user = usersResponse.documents[0];
                patientName = user.fullName || user.name || user.displayName || 
                  (appointment.user_id.includes('@') ? appointment.user_id.split('@')[0].replace(/[._-]/g, ' ') : 
                   `Patient ${appointment.user_id.substring(0, 8)}`);
              } else {
                patientName = appointment.user_id.includes('@') ? 
                  appointment.user_id.split('@')[0].replace(/[._-]/g, ' ') : 
                  `Patient ${appointment.user_id.substring(0, 8)}`;
              }
            } catch (error) {
              patientName = `Patient ${appointment.user_id.substring(0, 8)}`;
            }
          }
          
          // Create a unique key for the appointment
          const appointmentKey = `${appointment.$id}`;
          nameMap[appointmentKey] = patientName;
          
        } catch (error) {
          console.error(`Error fetching patient name for appointment ${appointment.$id}:`, error);
          const appointmentKey = `${appointment.$id}`;
          nameMap[appointmentKey] = appointment.patient_name || 'Unknown Patient';
        }
      }
      
      setPatientNames(nameMap);
    } catch (error) {
      console.error("Error in fetchPatientNames:", error);
    }
  };

  const fetchBranchNames = async (appointments) => {
    try {
      const branchIds = [...new Set(appointments.map(apt => apt.branch_id).filter(Boolean))];
      const branchMap = {};
      
      console.log('Branch IDs found in appointments:', branchIds);
      
      // First, get all unique region IDs from branches
      const regionIds = new Set();
      
      for (const branchId of branchIds) {
        try {
          const branchResponse = await DatabaseService.listDocuments(
            COLLECTIONS.BRANCHES,
            [Query.equal('branch_id', branchId)]
          );
          
          if (branchResponse.documents && branchResponse.documents.length > 0) {
            const branch = branchResponse.documents[0];
            console.log(`Branch ${branchId} found with region_id:`, branch.region_id);
            if (branch.region_id) {
              regionIds.add(branch.region_id);
            }
          } else {
            console.log(`No branch found with branch_id: ${branchId}`);
          }
        } catch (error) {
          console.error(`Error fetching branch ${branchId}:`, error);
        }
      }
      
      console.log('Region IDs to fetch:', [...regionIds]);
      
      // Fetch region names
      const regionMap = await fetchRegionNames([...regionIds]);
      console.log('Region map:', regionMap);
      
      // Now fetch branch details with region names
      for (const branchId of branchIds) {
        try {
          const branchResponse = await DatabaseService.listDocuments(
            COLLECTIONS.BRANCHES,
            [Query.equal('branch_id', branchId)]
          );
          
          if (branchResponse.documents && branchResponse.documents.length > 0) {
            const branch = branchResponse.documents[0];
            branchMap[branchId] = {
              name: branch.name || 'Unknown Branch',
              region: regionMap[branch.region_id] || branch.region_id || 'Unknown Region'
            };
          }
        } catch (error) {
          branchMap[branchId] = {
            name: 'Unknown Branch',
            region: 'Unknown Region'
          };
        }
      }
      
      console.log('Final branch map:', branchMap);
      setBranchNames(branchMap);
    } catch (error) {
      console.error('Error fetching branch names:', error);
    }
  };

  const fetchRegionNames = async (regionIds) => {
    const regionMap = {};
    
    if (regionIds.length === 0) return regionMap;
    
    try {
      // Fetch regions from your regions collection
      for (const regionId of regionIds) {
        try {
          const regionResponse = await DatabaseService.listDocuments(
            COLLECTIONS.REGIONS,
            [Query.equal('region_id', regionId)]
          );
          
          if (regionResponse.documents && regionResponse.documents.length > 0) {
            const region = regionResponse.documents[0];
            regionMap[regionId] = region.name || regionId;
          } else {
            // Fallback to hardcoded regions from your constants
            const hardcodedRegions = {
              'tawau': 'Tawau',
              'semporna': 'Semporna', 
              'kota_kinabalu': 'Kota Kinabalu',
            };
            regionMap[regionId] = hardcodedRegions[regionId] || regionId;
          }
        } catch (error) {
          console.error(`Error fetching region ${regionId}:`, error);
          // Fallback to hardcoded regions
          const hardcodedRegions = {
            'tawau': 'Tawau',
            'semporna': 'Semporna', 
            'kota_kinabalu': 'Kota Kinabalu',
          };
          regionMap[regionId] = hardcodedRegions[regionId] || regionId;
        }
      }
    } catch (error) {
      console.error('Error in fetchRegionNames:', error);
      
      // Fallback to hardcoded mapping based on your RegionsData
      const hardcodedRegions = {
        'tawau': 'Tawau',
        'semporna': 'Semporna', 
        'kota_kinabalu': 'Kota Kinabalu',
      };
      
      regionIds.forEach(id => {
        regionMap[id] = hardcodedRegions[id] || id || 'Unknown Region';
      });
    }
    
    return regionMap;
  };

  const calculateStats = (appointments) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      total: appointments.length,
      completed: 0,
      pending: 0,
      today: 0
    };

    appointments.forEach(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      aptDate.setHours(0, 0, 0, 0);

      if (apt.has_prescription) {
        stats.completed++;
      } else {
        stats.pending++;
      }

      if (aptDate.getTime() === today.getTime()) {
        stats.today++;
      }
    });

    setStatsData(stats);
  };

  const isDateInRange = (appointmentDate, range) => {
    const aptDate = parseAppointmentDate(appointmentDate);
    const today = new Date();
    
    switch (range) {
      case 'today':
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        return aptDate >= todayStart && aptDate <= todayEnd;
        
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return aptDate >= weekStart;
        
      case 'month':
        const monthStart = new Date(today);
        monthStart.setDate(today.getDate() - 30);
        return aptDate >= monthStart;
        
      case 'custom':
        if (customDateFrom && customDateTo) {
          const fromDate = new Date(customDateFrom);
          const toDate = new Date(customDateTo);
          return aptDate >= fromDate && aptDate <= toDate;
        }
        return true;
        
      default:
        return true;
    }
  };

  const filterAppointments = () => {
    let filtered = allAppointments;

    // Apply status filter
    switch (activeFilter) {
      case 'completed':
        filtered = filtered.filter(apt => apt.has_prescription);
        break;
      case 'pending':
        filtered = filtered.filter(apt => !apt.has_prescription);
        break;
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filtered = filtered.filter(apt => {
          const aptDate = parseAppointmentDate(apt.date);
          aptDate.setHours(0, 0, 0, 0);
          return aptDate.getTime() === today.getTime();
        });
        break;
    }

    // Apply service filter
    if (selectedServices.length > 0) {
      filtered = filtered.filter(apt => 
        selectedServices.includes(apt.service_name)
      );
    }

    // Apply date range filter
    if (selectedDateRange !== 'all') {
      filtered = filtered.filter(apt => 
        isDateInRange(apt.date, selectedDateRange)
      );
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt => {
        const patientName = getPatientName(apt).toLowerCase();
        const serviceName = (apt.service_name || '').toLowerCase();
        const appointmentId = apt.$id.toLowerCase();
        const branchName = getBranchInfo(apt.branch_id).name.toLowerCase();
        
        return patientName.includes(query) || 
               serviceName.includes(query) || 
               appointmentId.includes(query) ||
               branchName.includes(query);
      });
    }

    setFilteredAppointments(filtered);
  };

  // UPDATED: Enhanced patient name getter to use appointment-specific key
  const getPatientName = (appointment) => {
    if (!appointment) return "Unknown Patient";
    
    // Check if this is a family booking with patient_name
    if (appointment.is_family_booking && appointment.patient_name) {
      return appointment.patient_name;
    }
    
    // Use the patientNames state with appointment-specific key
    const appointmentKey = `${appointment.$id}`;
    return patientNames[appointmentKey] || appointment.patient_name || "Unknown Patient";
  };

  const getBranchInfo = (branchId) => {
    return branchNames[branchId] || { name: 'Unknown Branch', region: 'Unknown Region' };
  };

  const getStatusInfo = (hasPrescription) => {
    if (hasPrescription) {
      return {
        color: '#0AD476',
        bgColor: '#F0FDF4',
        text: 'Completed',
        icon: 'checkmark-circle'
      };
    } else {
      return {
        color: '#FF9500',
        bgColor: '#FFF8E1',
        text: 'Pending',
        icon: 'time'
      };
    }
  };

  const handleAddPrescription = (appointmentId) => {
    router.push({
      pathname: '/doctor/prescriptions/create',
      params: { appointmentId }
    });
  };

  const handleViewPrescription = (appointmentId) => {
    router.push({
      pathname: '/doctor/prescriptions/view',
      params: { appointmentId }
    });
  };

  const renderQuickStats = () => (
    <View style={styles.statsContainer}>
      <TouchableOpacity 
        style={[styles.statCard, activeFilter === 'all' && styles.activeStatCard]}
        onPress={() => setActiveFilter('all')}
      >
        <Text style={[styles.statNumber, activeFilter === 'all' && styles.activeStatText]}>
          {statsData.total}
        </Text>
        <Text style={[styles.statLabel, activeFilter === 'all' && styles.activeStatText]}>
          Total
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.statCard, activeFilter === 'completed' && styles.activeStatCard]}
        onPress={() => setActiveFilter('completed')}
      >
        <Text style={[styles.statNumber, { color: '#0AD476' }, activeFilter === 'completed' && styles.activeStatText]}>
          {statsData.completed}
        </Text>
        <Text style={[styles.statLabel, activeFilter === 'completed' && styles.activeStatText]}>
          Completed
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.statCard, activeFilter === 'pending' && styles.activeStatCard]}
        onPress={() => setActiveFilter('pending')}
      >
        <Text style={[styles.statNumber, { color: '#FF9500' }, activeFilter === 'pending' && styles.activeStatText]}>
          {statsData.pending}
        </Text>
        <Text style={[styles.statLabel, activeFilter === 'pending' && styles.activeStatText]}>
          Pending
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.statCard, activeFilter === 'today' && styles.activeStatCard]}
        onPress={() => setActiveFilter('today')}
      >
        <Text style={[styles.statNumber, { color: '#007AFF' }, activeFilter === 'today' && styles.activeStatText]}>
          {statsData.today}
        </Text>
        <Text style={[styles.statLabel, activeFilter === 'today' && styles.activeStatText]}>
          Today
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Advanced Filters</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Service Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Services</Text>
              <View style={styles.serviceChips}>
                {availableServices.map((service) => (
                  <TouchableOpacity
                    key={service}
                    style={[
                      styles.serviceChip,
                      selectedServices.includes(service) && styles.selectedServiceChip
                    ]}
                    onPress={() => {
                      if (selectedServices.includes(service)) {
                        setSelectedServices(selectedServices.filter(s => s !== service));
                      } else {
                        setSelectedServices([...selectedServices, service]);
                      }
                    }}
                  >
                    <Text style={[
                      styles.serviceChipText,
                      selectedServices.includes(service) && styles.selectedServiceChipText
                    ]}>
                      {service}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Date Range</Text>
              <View style={styles.dateRangeOptions}>
                {[
                  { key: 'all', label: 'All Time' },
                  { key: 'today', label: 'Today' },
                  { key: 'week', label: 'Last 7 Days' },
                  { key: 'month', label: 'Last 30 Days' },
                  { key: 'custom', label: 'Custom Range' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.dateRangeOption,
                      selectedDateRange === option.key && styles.selectedDateRangeOption
                    ]}
                    onPress={() => setSelectedDateRange(option.key)}
                  >
                    <Text style={[
                      styles.dateRangeOptionText,
                      selectedDateRange === option.key && styles.selectedDateRangeOptionText
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedDateRange === 'custom' && (
                <View style={styles.customDateInputs}>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="From (YYYY-MM-DD)"
                    value={customDateFrom}
                    onChangeText={setCustomDateFrom}
                  />
                  <TextInput
                    style={styles.dateInput}
                    placeholder="To (YYYY-MM-DD)"
                    value={customDateTo}
                    onChangeText={setCustomDateTo}
                  />
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                setSelectedServices([]);
                setSelectedDateRange('all');
                setCustomDateFrom('');
                setCustomDateTo('');
              }}
            >
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.applyFiltersButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyFiltersText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // OPTIMIZED PRESCRIPTION CARD - More compact and readable
  const renderOptimizedPrescriptionCard = ({ item: appointment }) => {
    const statusInfo = getStatusInfo(appointment.has_prescription);
    const branchInfo = getBranchInfo(appointment.branch_id);
    const appointmentDate = parseAppointmentDate(appointment.date);

    return (
      <TouchableOpacity 
        style={styles.optimizedCard}
        onPress={() => appointment.has_prescription ? 
          handleViewPrescription(appointment.$id) : 
          handleAddPrescription(appointment.$id)
        }
      >
        {/* Top Row - Patient Info & Status */}
        <View style={styles.cardTopRow}>
          <View style={styles.patientSection}>
            <View style={[styles.compactAvatar, { backgroundColor: statusInfo.color }]}>
              <Text style={styles.avatarText}>
                {getPatientName(appointment).substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.patientDetails}>
              <Text style={styles.patientName} numberOfLines={1}>
                {getPatientName(appointment)}
              </Text>
              <Text style={styles.appointmentMeta}>
                {appointmentDate.toLocaleDateString('en-GB', { 
                  day: '2-digit', 
                  month: 'short' 
                })} • {appointment.time_slot}
              </Text>
            </View>
          </View>
          
          <View style={[styles.compactStatusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Ionicons name={statusInfo.icon} size={10} color={statusInfo.color} />
            <Text style={[styles.compactStatusText, { color: statusInfo.color }]}>
              {statusInfo.text}
            </Text>
          </View>
        </View>

        {/* Middle Row - Service & Branch */}
        <View style={styles.cardMiddleRow}>
          <View style={styles.serviceInfo}>
            <Ionicons name="medical-outline" size={12} color="#666" />
            <Text style={styles.serviceLabel} numberOfLines={1}>
              {appointment.service_name || 'General Consultation'}
            </Text>
          </View>
          
          <View style={styles.branchInfo}>
            <Ionicons name="location-outline" size={12} color="#666" />
            <Text style={styles.branchLabel} numberOfLines={1}>
              {branchInfo.name}
            </Text>
          </View>
        </View>

        {/* Bottom Row - Action & ID */}
        <View style={styles.cardBottomRow}>
          <Text style={styles.appointmentId}>
            ID: {appointment.$id.substring(0, 8)}
          </Text>
          
          {appointment.has_prescription ? (
            <View style={styles.prescriptionActions}>
              <TouchableOpacity 
                style={styles.compactViewButton}
                onPress={() => handleViewPrescription(appointment.$id)}
              >
                <Ionicons name="eye-outline" size={12} color="#0AD476" />
                <Text style={styles.compactButtonText}>View</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.compactEditButton}
                onPress={() => handleAddPrescription(appointment.$id)}
              >
                <Ionicons name="create-outline" size={12} color="#007AFF" />
                <Text style={styles.compactButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.compactAddButton}
              onPress={() => handleAddPrescription(appointment.$id)}
            >
              <Ionicons name="add" size={12} color="white" />
              <Text style={styles.compactAddButtonText}>Add Rx</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0AD476" />
        <Text style={styles.loadingText}>Loading prescriptions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0AD476" />
      
      {/* Enhanced Header */}
      <LinearGradient 
        colors={["#0AD476", "#08B96B"]}
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
            <Text style={styles.headerTitle}>Prescription Management</Text>
            <Text style={styles.headerSubtitle}>Digital prescriptions & patient care</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Ionicons 
              name={refreshing ? "sync" : "refresh"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Quick Stats */}
      {renderQuickStats()}

      {/* Search and Filter Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients, services, or branch..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="filter-outline" size={20} color="#0AD476" />
          {(selectedServices.length > 0 || selectedDateRange !== 'all') && (
            <View style={styles.filterIndicator} />
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filters Display */}
      {(selectedServices.length > 0 || selectedDateRange !== 'all') && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedServices.map((service) => (
              <View key={service} style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>{service}</Text>
                <TouchableOpacity
                  onPress={() => setSelectedServices(selectedServices.filter(s => s !== service))}
                >
                  <Ionicons name="close" size={14} color="#0AD476" />
                </TouchableOpacity>
              </View>
            ))}
            {selectedDateRange !== 'all' && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  {selectedDateRange === 'custom' ? 'Custom Date' : 
                   selectedDateRange === 'today' ? 'Today' :
                   selectedDateRange === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
                </Text>
                <TouchableOpacity onPress={() => setSelectedDateRange('all')}>
                  <Ionicons name="close" size={14} color="#0AD476" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Optimized Prescription List */}
      <FlatList
        data={filteredAppointments}
        renderItem={renderOptimizedPrescriptionCard}
        keyExtractor={(item) => item.$id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0AD476']}
            tintColor="#0AD476"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateIcon}>
              <Ionicons 
                name={searchQuery || selectedServices.length > 0 || selectedDateRange !== 'all' ? 
                      "search-outline" : "medical-outline"} 
                size={64} 
                color="#E0E0E0" 
              />
            </View>
            <Text style={styles.emptyStateText}>
              {searchQuery || selectedServices.length > 0 || selectedDateRange !== 'all' ? 
               'No matching prescriptions found' : 'No prescriptions found'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery || selectedServices.length > 0 || selectedDateRange !== 'all' 
                ? 'Try adjusting your search terms or filters' 
                : 'Prescriptions will appear here once you add them to appointments'
              }
            </Text>
          </View>
        )}
      />

      {/* Filter Modal */}
      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  
  // Header
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
    fontSize: 13,
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
  
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: -10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  activeStatCard: {
    backgroundColor: '#0AD476',
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  activeStatText: {
    color: 'white',
  },
  
  // Search and Filter Section
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: '#333',
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  filterIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },

  // Active Filters
  activeFiltersContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    gap: 6,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#0AD476',
    fontWeight: '500',
  },
  
  // List Container
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  
  // OPTIMIZED PRESCRIPTION CARD - More compact and space-efficient
  optimizedCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },

  // Card Top Row
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  appointmentMeta: {
    fontSize: 11,
    color: '#666',
  },
  compactStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  compactStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Card Middle Row
  cardMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  serviceLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  branchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  branchLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },

  // Card Bottom Row
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appointmentId: {
    fontSize: 10,
    color: '#999',
  },
  
  // Compact Action Buttons
  prescriptionActions: {
    flexDirection: 'row',
    gap: 6,
  },
  compactViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  compactEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  compactButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0AD476',
  },
  compactAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0AD476',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 3,
  },
  compactAddButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },

  // Filter Modal (keeping existing styles)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  
  // Service Chips
  serviceChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedServiceChip: {
    backgroundColor: '#F0FDF4',
    borderColor: '#0AD476',
  },
  serviceChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  selectedServiceChipText: {
    color: '#0AD476',
  },
  
  // Date Range Options
  dateRangeOptions: {
    gap: 8,
  },
  dateRangeOption: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedDateRangeOption: {
    backgroundColor: '#F0FDF4',
    borderColor: '#0AD476',
  },
  dateRangeOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedDateRangeOptionText: {
    color: '#0AD476',
  },
  
  // Custom Date Inputs
  customDateInputs: {
    marginTop: 12,
    gap: 8,
  },
  dateInput: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 14,
    color: '#333',
  },
  
  // Modal Footer
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  clearFiltersButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  applyFiltersButton: {
    flex: 1,
    backgroundColor: '#0AD476',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyFiltersText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  
  // Empty State
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: 'white',
    borderRadius: 16,
    marginTop: 20,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});