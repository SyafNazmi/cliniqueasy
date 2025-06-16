
// app/doctor/appointments/index.jsx - FIXED with real-time updates and focus refresh
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
  TextInput,
  FlatList,
  RefreshControl,
  Modal,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import PageHeader from '../../../components/PageHeader';
import { DatabaseService, Query } from '../../../configs/AppwriteConfig';
import { getLocalStorage } from '../../../service/Storage';
import { COLLECTIONS } from '../../../constants';
import { useFocusEffect } from '@react-navigation/native'; // Added for focus refresh
import { appointmentManager } from '../../../service/appointmentUtils'; // Added for real-time updates

const { width } = Dimensions.get('window');

const APPOINTMENT_STATUS = {
  BOOKED: 'Booked',
  CONFIRMED: 'Confirmed',
  RESCHEDULED: 'Rescheduled',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  NO_SHOW: 'No Show'
};

export default function EnhancedAppointmentsManagement() {
  const [allAppointments, setAllAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [patientNames, setPatientNames] = useState({});
  const [branchNames, setBranchNames] = useState({});
  const [serviceNames, setServiceNames] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Advanced filter states
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedDateRange, setSelectedDateRange] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  
  const [availableServices, setAvailableServices] = useState([]);
  const [availableRegions, setAvailableRegions] = useState([]);
  const [statsData, setStatsData] = useState({
    total: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
    today: 0,
    booked: 0,
    confirmed: 0,
    past: 0
  });

  useEffect(() => {
    loadAppointments();
  }, []);

  // ADDED: Focus effect to refresh data when returning to screen
  useFocusEffect(
    useCallback(() => {
      loadAppointments(false); // Don't show loader when refocusing
    }, [])
  );

  // ADDED: Set up real-time subscription for appointments
  useEffect(() => {
    let subscriptionKey = null;

    const setupRealtimeSubscription = async () => {
      try {
        const userData = await getLocalStorage('userDetail');
        if (userData?.uid) {
          subscriptionKey = appointmentManager.subscribeToAppointments(
            (event) => {
              console.log('Doctor appointments management received update:', event);
              
              // Refresh appointments when any appointment changes
              const retryFetch = async (attempt = 1, maxAttempts = 3) => {
                await loadAppointments(false);
                
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
        console.error('Error setting up doctor appointments real-time subscription:', error);
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
  }, [allAppointments, searchQuery, filter, selectedServices, selectedRegions, selectedStatuses, selectedDateRange, customDateFrom, customDateTo]);

  // UPDATED: Enhanced loadAppointments with same logic as patient HomeScreen
  const loadAppointments = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      const userData = await getLocalStorage('userDetail');
      if (!userData?.uid) {
        Alert.alert('Error', 'User data not found');
        return;
      }

      // Enhanced query with ordering (same as patient HomeScreen)
      const queries = [
        Query.orderDesc('$createdAt'),
        Query.limit(100)
      ];
      
      const appointmentsResponse = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS,
        queries
      );
      
      let allAppointments = appointmentsResponse.documents || [];
      
      // Sort appointments by date (same logic as patient HomeScreen)
      allAppointments.sort((a, b) => {
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
      
      setAllAppointments(allAppointments);
      await fetchPatientNames(allAppointments);
      await fetchBranchNames(allAppointments);
      await fetchServiceNames(allAppointments);
      
      // Extract services first
      extractAvailableOptions(allAppointments);
      
      // Calculate stats
      calculateStats(allAppointments);
      
      // Update regions after branch data is loaded
      setTimeout(() => {
        updateAvailableRegions();
      }, 100);
      
    } catch (error) {
      console.error('Error loading appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    await loadAppointments(false);
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

  // Enhanced patient name fetching with proper family booking support (same as dashboard)
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
              // Try to get patient profile by patient_id
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
      console.error('Error fetching patient names:', error);
    }
  };

  const fetchBranchNames = async (appointments) => {
    try {
      const branchIds = [...new Set(appointments.map(apt => apt.branch_id).filter(Boolean))];
      const branchMap = {};
      
      const regionIds = new Set();
      
      for (const branchId of branchIds) {
        try {
          const branchResponse = await DatabaseService.listDocuments(
            COLLECTIONS.BRANCHES,
            [Query.equal('branch_id', branchId)]
          );
          
          if (branchResponse.documents && branchResponse.documents.length > 0) {
            const branch = branchResponse.documents[0];
            if (branch.region_id) {
              regionIds.add(branch.region_id);
            }
          }
        } catch (error) {
          console.error(`Error fetching branch ${branchId}:`, error);
        }
      }
      
      const regionMap = await fetchRegionNames([...regionIds]);
      
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
              region: regionMap[branch.region_id] || branch.region_id || 'Unknown Region',
              regionId: branch.region_id
            };
          }
        } catch (error) {
          branchMap[branchId] = {
            name: 'Unknown Branch',
            region: 'Unknown Region',
            regionId: null
          };
        }
      }
      
      setBranchNames(branchMap);
      
      // Update available regions after branch names are set
      if (allAppointments.length > 0) {
        const regions = [...new Set(
          allAppointments.map(apt => {
            const branchData = branchMap[apt.branch_id];
            return branchData ? branchData.region : null;
          }).filter(region => region && region !== 'Unknown Region')
        )];
        setAvailableRegions(regions.sort());
      }
    } catch (error) {
      console.error('Error fetching branch names:', error);
    }
  };

  const fetchRegionNames = async (regionIds) => {
    const regionMap = {};
    
    if (regionIds.length === 0) return regionMap;
    
    try {
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
            const hardcodedRegions = {
              'tawau': 'Tawau',
              'semporna': 'Semporna', 
              'kota_kinabalu': 'Kota Kinabalu',
            };
            regionMap[regionId] = hardcodedRegions[regionId] || regionId;
          }
        } catch (error) {
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

  const fetchServiceNames = async (appointments) => {
    try {
      const serviceIds = [...new Set(appointments.map(apt => apt.service_id).filter(Boolean))];
      const serviceMap = {};
      
      for (const serviceId of serviceIds) {
        try {
          const serviceResponse = await DatabaseService.listDocuments(
            COLLECTIONS.SERVICES,
            [Query.equal('service_id', serviceId)]
          );
          
          if (serviceResponse.documents && serviceResponse.documents.length > 0) {
            const service = serviceResponse.documents[0];
            serviceMap[serviceId] = service.name || 'Unknown Service';
          } else {
            serviceMap[serviceId] = 'Unknown Service';
          }
        } catch (error) {
          serviceMap[serviceId] = 'Unknown Service';
        }
      }
      
      setServiceNames(serviceMap);
    } catch (error) {
      console.error('Error fetching service names:', error);
    }
  };

  const extractAvailableOptions = (appointments) => {
    // Extract unique services
    const services = [...new Set(appointments.map(apt => apt.service_name).filter(Boolean))];
    setAvailableServices(services.sort());
    
    // Extract unique regions - need to wait for branchNames to be populated
    // This will be called after fetchBranchNames completes
    const regions = [...new Set(
      appointments.map(apt => {
        const branchInfo = getBranchInfo(apt.branch_id);
        return branchInfo.region;
      }).filter(region => region && region !== 'Unknown Region')
    )];
    setAvailableRegions(regions.sort());
  };

  // New function to update available regions after branch data is loaded
  const updateAvailableRegions = () => {
    const regions = [...new Set(
      allAppointments.map(apt => {
        const branchInfo = getBranchInfo(apt.branch_id);
        return branchInfo.region;
      }).filter(region => region && region !== 'Unknown Region')
    )];
    setAvailableRegions(regions.sort());
  };

  // UPDATED: Enhanced stats calculation with same logic as patient HomeScreen
  const calculateStats = (appointments) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      total: appointments.length,
      upcoming: 0,
      completed: 0,
      cancelled: 0,
      today: 0,
      booked: 0,
      confirmed: 0,
      past: 0
    };

    appointments.forEach(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      aptDate.setHours(0, 0, 0, 0);
      
      const status = apt.status?.toLowerCase() || 'booked';

      // Count by status
      switch (status) {
        case 'booked':
          stats.booked++;
          break;
        case 'confirmed':
          stats.confirmed++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
      }

      // Count upcoming (same logic as patient HomeScreen)
      if (aptDate >= today && status !== 'cancelled' && status !== 'completed') {
        stats.upcoming++;
      }

      // Count today's appointments
      if (aptDate.getTime() === today.getTime()) {
        stats.today++;
      }

      // Count past appointments (same logic as patient HomeScreen)
      if (aptDate < today || status === 'completed' || status === 'cancelled') {
        stats.past++;
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

  // UPDATED: Enhanced filterAppointments with same logic as patient HomeScreen
  const filterAppointments = () => {
    let filtered = allAppointments;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'upcoming':
        filtered = filtered.filter(apt => {
          // Same logic as patient HomeScreen
          const status = apt.status?.toLowerCase();
          if (status === 'cancelled' || status === 'completed') {
            return false;
          }
          
          const aptDate = parseAppointmentDate(apt.date);
          return aptDate >= now;
        });
        break;
      case 'past':
        filtered = filtered.filter(apt => {
          // Same logic as patient HomeScreen
          const status = apt.status?.toLowerCase();
          if (status === 'cancelled' || status === 'completed') {
            return true;
          }
          
          const aptDate = parseAppointmentDate(apt.date);
          return aptDate < now;
        });
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

    if (selectedServices.length > 0) {
      filtered = filtered.filter(apt => 
        selectedServices.includes(apt.service_name)
      );
    }

    if (selectedRegions.length > 0) {
      filtered = filtered.filter(apt => {
        const branchInfo = getBranchInfo(apt.branch_id);
        return selectedRegions.includes(branchInfo.region);
      });
    }

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(apt => 
        selectedStatuses.includes(apt.status || APPOINTMENT_STATUS.BOOKED)
      );
    }

    if (selectedDateRange !== 'all') {
      filtered = filtered.filter(apt => 
        isDateInRange(apt.date, selectedDateRange)
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt => {
        const patientName = getPatientName(apt).toLowerCase();
        const serviceName = (apt.service_name || '').toLowerCase();
        const appointmentId = apt.$id.toLowerCase();
        const branchName = getBranchInfo(apt.branch_id).name.toLowerCase();
        const status = (apt.status || '').toLowerCase();
        
        return patientName.includes(query) || 
               serviceName.includes(query) || 
               appointmentId.includes(query) ||
               branchName.includes(query) ||
               status.includes(query);
      });
    }

    setFilteredAppointments(filtered);
  };

  // Updated patient name getter to use appointment-specific key
  const getPatientName = (appointment) => {
    if (!appointment) return "Unknown Patient";
    const appointmentKey = `${appointment.$id}`;
    return patientNames[appointmentKey] || appointment.patient_name || "Unknown Patient";
  };

  const getBranchInfo = (branchId) => {
    return branchNames[branchId] || { name: 'Unknown Branch', region: 'Unknown Region', regionId: null };
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case APPOINTMENT_STATUS.CONFIRMED:
        return { color: '#0AD476', bgColor: '#F0FDF4', text: 'Confirmed', icon: 'checkmark-circle' };
      case APPOINTMENT_STATUS.COMPLETED:
        return { color: '#3B82F6', bgColor: '#EFF6FF', text: 'Completed', icon: 'checkmark-done-circle' };
      case APPOINTMENT_STATUS.CANCELLED:
        return { color: '#EF4444', bgColor: '#FEF2F2', text: 'Cancelled', icon: 'close-circle' };
      case APPOINTMENT_STATUS.RESCHEDULED:
        return { color: '#F59E0B', bgColor: '#FFFBEB', text: 'Rescheduled', icon: 'refresh-circle' };
      case APPOINTMENT_STATUS.NO_SHOW:
        return { color: '#8B5CF6', bgColor: '#F5F3FF', text: 'No Show', icon: 'alert-circle' };
      default:
        return { color: '#6B7280', bgColor: '#F9FAFB', text: 'Booked', icon: 'calendar' };
    }
  };

  const renderQuickStats = () => (
    <View style={styles.statsContainer}>
      <TouchableOpacity 
        style={[styles.statCard, filter === 'all' && styles.activeStatCard]}
        onPress={() => setFilter('all')}
      >
        <Text style={[styles.statNumber, filter === 'all' && styles.activeStatText]}>
          {statsData.total}
        </Text>
        <Text style={[styles.statLabel, filter === 'all' && styles.activeStatText]}>
          Total
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.statCard, filter === 'upcoming' && styles.activeStatCard]}
        onPress={() => setFilter('upcoming')}
      >
        <Text style={[styles.statNumber, { color: '#0AD476' }, filter === 'upcoming' && styles.activeStatText]}>
          {statsData.upcoming}
        </Text>
        <Text style={[styles.statLabel, filter === 'upcoming' && styles.activeStatText]}>
          Upcoming
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.statCard, filter === 'today' && styles.activeStatCard]}
        onPress={() => setFilter('today')}
      >
        <Text style={[styles.statNumber, { color: '#3B82F6' }, filter === 'today' && styles.activeStatText]}>
          {statsData.today}
        </Text>
        <Text style={[styles.statLabel, filter === 'today' && styles.activeStatText]}>
          Today
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.statCard, filter === 'past' && styles.activeStatCard]}
        onPress={() => setFilter('past')}
      >
        <Text style={[styles.statNumber, { color: '#6B7280' }, filter === 'past' && styles.activeStatText]}>
          {statsData.past}
        </Text>
        <Text style={[styles.statLabel, filter === 'past' && styles.activeStatText]}>
          Past
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
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Services</Text>
              <View style={styles.filterChips}>
                {availableServices.map((service) => (
                  <TouchableOpacity
                    key={service}
                    style={[
                      styles.filterChip,
                      selectedServices.includes(service) && styles.selectedFilterChip
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
                      styles.filterChipText,
                      selectedServices.includes(service) && styles.selectedFilterChipText
                    ]}>
                      {service}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Regions</Text>
              <View style={styles.filterChips}>
                {availableRegions.map((region) => (
                  <TouchableOpacity
                    key={region}
                    style={[
                      styles.filterChip,
                      selectedRegions.includes(region) && styles.selectedFilterChip
                    ]}
                    onPress={() => {
                      if (selectedRegions.includes(region)) {
                        setSelectedRegions(selectedRegions.filter(r => r !== region));
                      } else {
                        setSelectedRegions([...selectedRegions, region]);
                      }
                    }}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedRegions.includes(region) && styles.selectedFilterChipText
                    ]}>
                      {region}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterChips}>
                {Object.values(APPOINTMENT_STATUS).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      selectedStatuses.includes(status) && styles.selectedFilterChip
                    ]}
                    onPress={() => {
                      if (selectedStatuses.includes(status)) {
                        setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                      } else {
                        setSelectedStatuses([...selectedStatuses, status]);
                      }
                    }}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedStatuses.includes(status) && styles.selectedFilterChipText
                    ]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

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
                setSelectedRegions([]);
                setSelectedStatuses([]);
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
    

  const renderMinimalAppointmentCard = ({ item: appointment }) => {
    const statusInfo = getStatusInfo(appointment.status);
    const branchInfo = getBranchInfo(appointment.branch_id);
    const appointmentDate = parseAppointmentDate(appointment.date);
    const patientName = getPatientName(appointment);

    return (
      <TouchableOpacity 
        style={styles.minimalCard}
        onPress={() => router.push({
          pathname: '/doctor/appointments/detail',
          params: { appointmentId: appointment.$id }
        })}
      >
        {/* Patient Avatar and Info */}
        <View style={styles.cardMainRow}>
          <View style={[styles.patientAvatar, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.avatarText}>
              {patientName.substring(0, 2).toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.patientDetails}>
            <Text style={styles.patientName} numberOfLines={1}>
              {patientName}
            </Text>
            <Text style={styles.appointmentDateTime}>
              {appointmentDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} • {appointment.time_slot}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Ionicons name="bookmark" size={12} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.text}
            </Text>
          </View>
        </View>

        {/* Service and Branch Info */}
        <View style={styles.serviceRow}>
          <View style={styles.serviceInfo}>
            <Ionicons name="medical-outline" size={16} color="#666" />
            <Text style={styles.serviceText} numberOfLines={1}>
              {appointment.service_name || 'Health Check-ups and Pr...'}
            </Text>
          </View>
          
          <View style={styles.branchInfo}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.branchText} numberOfLines={1}>
              {branchInfo.name}
            </Text>
          </View>
        </View>

        {/* Footer with Region and ID */}
        <View style={styles.cardFooter}>
          <View style={styles.regionTag}>
            <Text style={styles.regionText}>{branchInfo.region}</Text>
          </View>
          <Text style={styles.appointmentId}>ID: {appointment.$id.substring(0, 8)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a8e2d" />
        <Text style={styles.loadingText}>Loading appointments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={["#1a8e2d", "#146922"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />
      
      {/* FIXED: Properly positioned header */}
      <View style={styles.header}>
        <PageHeader onPress={() => router.back()} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Appointments</Text>
          <Text style={styles.headerTitle}>Management</Text>
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

      {renderQuickStats()}

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients, services, or ID..."
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
          <Ionicons name="filter-outline" size={20} color="#1a8e2d" />
          {(selectedServices.length > 0 || selectedRegions.length > 0 || selectedStatuses.length > 0 || selectedDateRange !== 'all') && (
            <View style={styles.filterIndicator} />
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredAppointments}
        renderItem={renderMinimalAppointmentCard}
        keyExtractor={(item) => item.$id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1a8e2d']}
            tintColor="#1a8e2d"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateIcon}>
              <Ionicons 
                name={searchQuery || selectedServices.length > 0 || selectedRegions.length > 0 || selectedStatuses.length > 0 || selectedDateRange !== 'all' ? 
                      "search-outline" : "calendar-outline"} 
                size={64} 
                color="#E0E0E0" 
              />
            </View>
            <Text style={styles.emptyStateText}>
              {searchQuery || selectedServices.length > 0 || selectedRegions.length > 0 || selectedStatuses.length > 0 || selectedDateRange !== 'all' ? 
               'No matching appointments found' : 'No appointments found'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery || selectedServices.length > 0 || selectedRegions.length > 0 || selectedStatuses.length > 0 || selectedDateRange !== 'all' 
                ? 'Try adjusting your search terms or filters' 
                : 'Appointments will appear here when patients book them'
              }
            </Text>
          </View>
        )}
      />

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
  
  // FIXED: Header positioning and layout
  headerGradient: {
    height: 120,
    width: '100%',
    position: 'absolute',
    top: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    lineHeight: 22,
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
    marginTop: 10,
    marginBottom: 20,
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
    backgroundColor: '#1a8e2d',
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
    color: '#1a8e2d',
    fontWeight: '500',
  },
  
  // List Container
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  
  // MINIMAL APPOINTMENT CARD (like image 2)
  minimalCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },

  // Main row with avatar, patient info, and status
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  appointmentDateTime: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Service and branch row
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  serviceText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  branchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  branchText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },

  // Footer with region and ID
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  regionTag: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  regionText: {
    fontSize: 11,
    color: '#1a8e2d',
    fontWeight: '500',
  },
  appointmentId: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
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
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedFilterChip: {
    backgroundColor: '#F0FDF4',
    borderColor: '#1a8e2d',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  selectedFilterChipText: {
    color: '#1a8e2d',
  },
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
    borderColor: '#1a8e2d',
  },
  dateRangeOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedDateRangeOptionText: {
    color: '#1a8e2d',
  },
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
    backgroundColor: '#1a8e2d',
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