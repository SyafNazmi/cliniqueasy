// app/doctor/appointments/index.jsx - ENHANCED VERSION WITH ADVANCED FILTERS
import React, { useState, useEffect } from 'react';
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
  const [filter, setFilter] = useState('all'); // 'all', 'upcoming', 'past', 'today'
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
    today: 0
  });

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [allAppointments, searchQuery, filter, selectedServices, selectedRegions, selectedStatuses, selectedDateRange, customDateFrom, customDateTo]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      
      const userData = await getLocalStorage('userDetail');
      if (!userData?.uid) {
        Alert.alert('Error', 'User data not found');
        return;
      }

      const appointmentsResponse = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS,
        []
      );
      
      let allAppointments = appointmentsResponse.documents || [];
      
      // Sort appointments by date
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
      extractAvailableOptions(allAppointments);
      calculateStats(allAppointments);
      
    } catch (error) {
      console.error('Error loading appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
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

  const fetchPatientNames = async (appointments) => {
    try {
      const userIds = [...new Set(appointments.map(apt => apt.user_id))];
      const nameMap = {};
      
      for (const userId of userIds) {
        try {
          const usersResponse = await DatabaseService.listDocuments(
            COLLECTIONS.PATIENT_PROFILES,
            [Query.equal('userId', userId)]
          );
          
          if (usersResponse.documents && usersResponse.documents.length > 0) {
            const user = usersResponse.documents[0];
            nameMap[userId] = user.fullName || user.name || user.displayName || 
              (userId.includes('@') ? userId.split('@')[0].replace(/[._-]/g, ' ') : 
               `Patient ${userId.substring(0, 8)}`);
          } else {
            nameMap[userId] = userId.includes('@') ? 
              userId.split('@')[0].replace(/[._-]/g, ' ') : 
              `Patient ${userId.substring(0, 8)}`;
          }
        } catch (error) {
          nameMap[userId] = `Patient ${userId.substring(0, 8)}`;
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
            if (branch.region_id) {
              regionIds.add(branch.region_id);
            }
          }
        } catch (error) {
          console.error(`Error fetching branch ${branchId}:`, error);
        }
      }
      
      // Fetch region names
      const regionMap = await fetchRegionNames([...regionIds]);
      
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
            // Fallback to hardcoded regions
            const hardcodedRegions = {
              'tawau': 'Tawau',
              'semporna': 'Semporna', 
              'kota_kinabalu': 'Kota Kinabalu',
            };
            regionMap[regionId] = hardcodedRegions[regionId] || regionId;
          }
        } catch (error) {
          console.error(`Error fetching region ${regionId}:`, error);
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
    
    // Extract unique regions from branch info
    const regions = [...new Set(
      appointments.map(apt => {
        const branchInfo = getBranchInfo(apt.branch_id);
        return branchInfo.region;
      }).filter(region => region && region !== 'Unknown Region')
    )];
    setAvailableRegions(regions.sort());
  };

  const calculateStats = (appointments) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      total: appointments.length,
      upcoming: 0,
      completed: 0,
      cancelled: 0,
      today: 0
    };

    appointments.forEach(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      aptDate.setHours(0, 0, 0, 0);

      // Count by status
      if (apt.status === APPOINTMENT_STATUS.COMPLETED) {
        stats.completed++;
      } else if (apt.status === APPOINTMENT_STATUS.CANCELLED) {
        stats.cancelled++;
      } else if (aptDate >= today) {
        stats.upcoming++;
      }

      // Count today's appointments
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
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Apply main filter
    switch (filter) {
      case 'upcoming':
        filtered = filtered.filter(apt => {
          const aptDate = parseAppointmentDate(apt.date);
          return aptDate >= now && apt.status !== APPOINTMENT_STATUS.CANCELLED;
        });
        break;
      case 'past':
        filtered = filtered.filter(apt => {
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

    // Apply service filter
    if (selectedServices.length > 0) {
      filtered = filtered.filter(apt => 
        selectedServices.includes(apt.service_name)
      );
    }

    // Apply region filter
    if (selectedRegions.length > 0) {
      filtered = filtered.filter(apt => {
        const branchInfo = getBranchInfo(apt.branch_id);
        return selectedRegions.includes(branchInfo.region);
      });
    }

    // Apply status filter
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(apt => 
        selectedStatuses.includes(apt.status || APPOINTMENT_STATUS.BOOKED)
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
        const patientName = getPatientName(apt.user_id).toLowerCase();
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

  const getPatientName = (userId) => {
    if (!userId) return "Unknown Patient";
    return patientNames[userId] || "Patient";
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
          {statsData.completed}
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
            {/* Service Filter */}
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

            {/* Region Filter */}
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

            {/* Status Filter */}
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

  const renderOptimizedAppointmentCard = ({ item: appointment }) => {
    const statusInfo = getStatusInfo(appointment.status);
    const branchInfo = getBranchInfo(appointment.branch_id);
    const appointmentDate = parseAppointmentDate(appointment.date);

    return (
      <TouchableOpacity 
        style={styles.optimizedCard}
        onPress={() => router.push({
          pathname: '/doctor/appointments/detail',
          params: { appointmentId: appointment.$id }
        })}
      >
        {/* Top Row - Patient Info & Status */}
        <View style={styles.cardTopRow}>
          <View style={styles.patientSection}>
            <View style={[styles.compactAvatar, { backgroundColor: statusInfo.color }]}>
              <Text style={styles.avatarText}>
                {getPatientName(appointment.user_id).substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.patientDetails}>
              <Text style={styles.patientName} numberOfLines={1}>
                {getPatientName(appointment.user_id)}
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

        {/* Bottom Row - Region & ID */}
        <View style={styles.cardBottomRow}>
          <View style={styles.regionContainer}>
            <View style={styles.regionBadge}>
              <Ionicons name="business-outline" size={10} color="#0AD476" />
              <Text style={styles.regionText}>{branchInfo.region}</Text>
            </View>
          </View>
          
          <Text style={styles.appointmentId}>
            ID: {appointment.$id.substring(0, 8)}
          </Text>
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
      <View style={styles.header}>
        <PageHeader onPress={() => router.back()} />
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Appointments Management</Text>
          <Text style={styles.headerSubtitle}>Manage patient appointments & schedules</Text>
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

      {/* Quick Stats */}
      {renderQuickStats()}

      {/* Search and Filter Section */}
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

      {/* Active Filters Display */}
      {(selectedServices.length > 0 || selectedRegions.length > 0 || selectedStatuses.length > 0 || selectedDateRange !== 'all') && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedServices.map((service) => (
              <View key={service} style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>{service}</Text>
                <TouchableOpacity
                  onPress={() => setSelectedServices(selectedServices.filter(s => s !== service))}
                >
                  <Ionicons name="close" size={14} color="#1a8e2d" />
                </TouchableOpacity>
              </View>
            ))}
            {selectedRegions.map((region) => (
              <View key={region} style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>{region}</Text>
                <TouchableOpacity
                  onPress={() => setSelectedRegions(selectedRegions.filter(r => r !== region))}
                >
                  <Ionicons name="close" size={14} color="#1a8e2d" />
                </TouchableOpacity>
              </View>
            ))}
            {selectedStatuses.map((status) => (
              <View key={status} style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>{status}</Text>
                <TouchableOpacity
                  onPress={() => setSelectedStatuses(selectedStatuses.filter(s => s !== status))}
                >
                  <Ionicons name="close" size={14} color="#1a8e2d" />
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
                  <Ionicons name="close" size={14} color="#1a8e2d" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Optimized Appointments List */}
      <FlatList
        data={filteredAppointments}
        renderItem={renderOptimizedAppointmentCard}
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
  headerGradient: {
    height: 100,
    width: '100%',
    position: 'absolute',
    top: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    marginBottom: 20,
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
  
  // OPTIMIZED APPOINTMENT CARD
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
  regionContainer: {
    flex: 1,
  },
  regionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  regionText: {
    fontSize: 10,
    color: '#1a8e2d',
    fontWeight: '500',
    marginLeft: 3,
  },
  appointmentId: {
    fontSize: 10,
    color: '#999',
  },

  // Filter Modal
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
  
  // Filter Chips
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