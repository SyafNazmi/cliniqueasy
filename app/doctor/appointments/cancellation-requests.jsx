// app/doctor/appointments/cancellation-requests.jsx - Complete Cancellation Requests Management
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
  Modal,
  TextInput,
  RefreshControl,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import PageHeader from '../../../components/PageHeader';
import { DatabaseService, Query } from '../../../configs/AppwriteConfig';
import { getLocalStorage } from '../../../service/Storage';
import { COLLECTIONS } from '../../../constants';
import { useFocusEffect } from '@react-navigation/native';
import { appointmentManager, CANCELLATION_STATUS, APPOINTMENT_STATUS } from '../../../service/appointmentUtils';

export default function CancellationRequestsManagement() {
  const [cancellationRequests, setCancellationRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('pending'); // 'pending', 'approved', 'denied', 'all'
  const [patientNames, setPatientNames] = useState({});
  const [branchNames, setBranchNames] = useState({});
  
  // Action modal states
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(''); // 'approve' or 'deny'
  const [denialReason, setDenialReason] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    denied: 0,
    total: 0
  });

  useEffect(() => {
    loadCancellationRequests();
  }, []);

  // Focus effect to refresh data when returning to screen
  useFocusEffect(
    useCallback(() => {
      loadCancellationRequests(false);
    }, [])
  );

  // Set up real-time subscription
  useEffect(() => {
    let subscriptionKey = null;

    const setupRealtimeSubscription = async () => {
      try {
        subscriptionKey = appointmentManager.subscribeToAppointments(
          (event) => {
            console.log('Cancellation requests received update:', event);
            
            // Check if the update is related to cancellation requests
            if (event.updateType && event.updateType.includes('cancellation')) {
              loadCancellationRequests(false);
            }
          }
        );
      } catch (error) {
        console.error('Error setting up cancellation requests real-time subscription:', error);
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (subscriptionKey) {
        appointmentManager.unsubscribe(subscriptionKey);
      }
    };
  }, []);

  useEffect(() => {
    filterRequests();
  }, [cancellationRequests, filter]);

  const loadCancellationRequests = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      // Get all appointments with cancellation requests
      const queries = [
        Query.or([
          Query.equal('cancellation_status', CANCELLATION_STATUS.REQUESTED),
          Query.equal('cancellation_status', CANCELLATION_STATUS.APPROVED),
          Query.equal('cancellation_status', CANCELLATION_STATUS.DENIED)
        ]),
        Query.orderDesc('cancellation_requested_at'),
        Query.limit(100)
      ];

      const response = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS,
        queries
      );

      const requests = response.documents || [];
      setCancellationRequests(requests);

      // Fetch additional data
      await Promise.all([
        fetchPatientNames(requests),
        fetchBranchNames(requests)
      ]);

      calculateStats(requests);

    } catch (error) {
      console.error('Error loading cancellation requests:', error);
      Alert.alert('Error', 'Failed to load cancellation requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    await loadCancellationRequests(false);
  };

  const fetchPatientNames = async (requests) => {
    try {
      const nameMap = {};
      
      for (const request of requests) {
        let patientName = 'Unknown Patient';
        
        try {
          if (request.is_family_booking && request.patient_name) {
            patientName = request.patient_name;
          } 
          else if (request.is_family_booking && request.patient_id) {
            try {
              const patientResponse = await DatabaseService.listDocuments(
                COLLECTIONS.PATIENT_PROFILES,
                [Query.equal('$id', request.patient_id)]
              );
              
              if (patientResponse.documents && patientResponse.documents.length > 0) {
                const patient = patientResponse.documents[0];
                patientName = patient.fullName || patient.name || patient.displayName || request.patient_name || 'Family Member';
              } else {
                patientName = request.patient_name || 'Family Member';
              }
            } catch (error) {
              patientName = request.patient_name || 'Family Member';
            }
          }
          else if (request.user_id) {
            try {
              const usersResponse = await DatabaseService.listDocuments(
                COLLECTIONS.PATIENT_PROFILES,
                [Query.equal('userId', request.user_id)]
              );
              
              if (usersResponse.documents && usersResponse.documents.length > 0) {
                const user = usersResponse.documents[0];
                patientName = user.fullName || user.name || user.displayName || 
                  (request.user_id.includes('@') ? request.user_id.split('@')[0].replace(/[._-]/g, ' ') : 
                   `Patient ${request.user_id.substring(0, 8)}`);
              } else {
                patientName = request.user_id.includes('@') ? 
                  request.user_id.split('@')[0].replace(/[._-]/g, ' ') : 
                  `Patient ${request.user_id.substring(0, 8)}`;
              }
            } catch (error) {
              patientName = `Patient ${request.user_id.substring(0, 8)}`;
            }
          }
          
          nameMap[request.$id] = patientName;
          
        } catch (error) {
          console.error(`Error fetching patient name for request ${request.$id}:`, error);
          nameMap[request.$id] = request.patient_name || 'Unknown Patient';
        }
      }
      
      setPatientNames(nameMap);
    } catch (error) {
      console.error('Error fetching patient names:', error);
    }
  };

  const fetchBranchNames = async (requests) => {
    try {
      const branchIds = [...new Set(requests.map(req => req.branch_id).filter(Boolean))];
      const branchMap = {};
      
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
              region: branch.region_id || 'Unknown Region'
            };
          }
        } catch (error) {
          branchMap[branchId] = {
            name: 'Unknown Branch',
            region: 'Unknown Region'
          };
        }
      }
      
      setBranchNames(branchMap);
    } catch (error) {
      console.error('Error fetching branch names:', error);
    }
  };

  const calculateStats = (requests) => {
    const newStats = {
      pending: 0,
      approved: 0,
      denied: 0,
      total: requests.length
    };

    requests.forEach(request => {
      switch (request.cancellation_status) {
        case CANCELLATION_STATUS.REQUESTED:
          newStats.pending++;
          break;
        case CANCELLATION_STATUS.APPROVED:
          newStats.approved++;
          break;
        case CANCELLATION_STATUS.DENIED:
          newStats.denied++;
          break;
      }
    });

    setStats(newStats);
  };

  const filterRequests = () => {
    let filtered = cancellationRequests;

    switch (filter) {
      case 'pending':
        filtered = filtered.filter(req => req.cancellation_status === CANCELLATION_STATUS.REQUESTED);
        break;
      case 'approved':
        filtered = filtered.filter(req => req.cancellation_status === CANCELLATION_STATUS.APPROVED);
        break;
      case 'denied':
        filtered = filtered.filter(req => req.cancellation_status === CANCELLATION_STATUS.DENIED);
        break;
      // 'all' shows everything
    }

    setFilteredRequests(filtered);
  };

  const handleApproveRequest = (request) => {
    setSelectedRequest(request);
    setActionType('approve');
    setShowActionModal(true);
  };

  const handleDenyRequest = (request) => {
    setSelectedRequest(request);
    setActionType('deny');
    setDenialReason('');
    setShowActionModal(true);
  };

  const executeAction = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      let result;
      
      if (actionType === 'approve') {
        result = await appointmentManager.approveCancellationRequest(
          selectedRequest.$id,
          'doctor'
        );
      } else if (actionType === 'deny') {
        if (!denialReason.trim()) {
          Alert.alert('Error', 'Please provide a reason for denial');
          return;
        }
        
        result = await appointmentManager.denyCancellationRequest(
          selectedRequest.$id,
          denialReason.trim(),
          'doctor'
        );
      }

      if (result.success) {
        Alert.alert(
          'Success', 
          `Cancellation request ${actionType === 'approve' ? 'approved' : 'denied'} successfully`
        );
        
        setShowActionModal(false);
        setSelectedRequest(null);
        setDenialReason('');
        
        // Refresh the list
        await loadCancellationRequests(false);
      } else {
        Alert.alert('Error', result.error || `Failed to ${actionType} request`);
      }
    } catch (error) {
      console.error(`Error ${actionType}ing request:`, error);
      Alert.alert('Error', `Failed to ${actionType} request`);
    } finally {
      setProcessing(false);
    }
  };

  const getPatientName = (request) => {
    return patientNames[request.$id] || request.patient_name || "Unknown Patient";
  };

  const getBranchInfo = (branchId) => {
    return branchNames[branchId] || { name: 'Unknown Branch', region: 'Unknown Region' };
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case CANCELLATION_STATUS.REQUESTED:
        return { 
          color: '#F59E0B', 
          bgColor: '#FEF3C7', 
          text: 'Pending Review', 
          icon: 'hourglass' 
        };
      case CANCELLATION_STATUS.APPROVED:
        return { 
          color: '#10B981', 
          bgColor: '#D1FAE5', 
          text: 'Approved', 
          icon: 'checkmark-circle' 
        };
      case CANCELLATION_STATUS.DENIED:
        return { 
          color: '#EF4444', 
          bgColor: '#FEE2E2', 
          text: 'Denied', 
          icon: 'close-circle' 
        };
      default:
        return { 
          color: '#6B7280', 
          bgColor: '#F9FAFB', 
          text: 'Unknown', 
          icon: 'help-circle' 
        };
    }
  };

  const formatDate = (dateString) => {
    try {
      if (dateString && dateString.includes(',')) {
        return dateString;
      }
      return 'Unknown date';
    } catch (error) {
      return 'Unknown date';
    }
  };

  const formatRequestTime = (requestedAt) => {
    try {
      if (!requestedAt) return 'Unknown time';
      
      const date = new Date(requestedAt);
      return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Unknown time';
    }
  };

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <TouchableOpacity 
        style={[styles.statCard, filter === 'pending' && styles.activeStatCard]}
        onPress={() => setFilter('pending')}
      >
        <View style={styles.statIconContainer}>
          <Ionicons name="hourglass" size={20} color="#F59E0B" />
        </View>
        <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.pending}</Text>
        <Text style={styles.statLabel}>Pending</Text>
        {stats.pending > 0 && <View style={styles.urgentDot} />}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.statCard, filter === 'approved' && styles.activeStatCard]}
        onPress={() => setFilter('approved')}
      >
        <View style={styles.statIconContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        </View>
        <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.approved}</Text>
        <Text style={styles.statLabel}>Approved</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.statCard, filter === 'denied' && styles.activeStatCard]}
        onPress={() => setFilter('denied')}
      >
        <View style={styles.statIconContainer}>
          <Ionicons name="close-circle" size={20} color="#EF4444" />
        </View>
        <Text style={[styles.statNumber, { color: '#EF4444' }]}>{stats.denied}</Text>
        <Text style={styles.statLabel}>Denied</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.statCard, filter === 'all' && styles.activeStatCard]}
        onPress={() => setFilter('all')}
      >
        <View style={styles.statIconContainer}>
          <Ionicons name="list" size={20} color="#6B7280" />
        </View>
        <Text style={[styles.statNumber, { color: '#6B7280' }]}>{stats.total}</Text>
        <Text style={styles.statLabel}>All</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRequestCard = ({ item: request }) => {
    const statusInfo = getStatusInfo(request.cancellation_status);
    const branchInfo = getBranchInfo(request.branch_id);
    const patientName = getPatientName(request);
    const isPending = request.cancellation_status === CANCELLATION_STATUS.REQUESTED;

    return (
      <View style={[styles.requestCard, isPending && styles.pendingCard]}>
        {isPending && <View style={styles.urgentStripe} />}
        
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.patientSection}>
            <View style={[styles.patientAvatar, { backgroundColor: statusInfo.color }]}>
              <Text style={styles.avatarText}>
                {patientName.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patientName}</Text>
              <Text style={styles.requestTime}>
                Requested {formatRequestTime(request.cancellation_requested_at)}
              </Text>
            </View>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.text}
            </Text>
          </View>
        </View>

        {/* Appointment Details */}
        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {formatDate(request.date)} at {request.time_slot || 'No time'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="medical-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {request.service_name || 'General Consultation'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {branchInfo.name} • {branchInfo.region}
            </Text>
          </View>
        </View>

        {/* Cancellation Reason */}
        {request.cancellation_reason && (
          <View style={styles.reasonSection}>
            <Text style={styles.reasonLabel}>Reason for cancellation:</Text>
            <Text style={styles.reasonText}>{request.cancellation_reason}</Text>
          </View>
        )}

        {/* Denial Reason */}
        {request.cancellation_status === CANCELLATION_STATUS.DENIED && request.cancellation_denial_reason && (
          <View style={styles.denialSection}>
            <Text style={styles.denialLabel}>Denial Reason:</Text>
            <Text style={styles.denialText}>{request.cancellation_denial_reason}</Text>
          </View>
        )}

        {/* Action Buttons */}
        {isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.denyButton}
              onPress={() => handleDenyRequest(request)}
            >
              <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
              <Text style={styles.denyButtonText}>Deny</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.approveButton}
              onPress={() => handleApproveRequest(request)}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="white" />
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* View Details Button */}
        <TouchableOpacity 
          style={styles.viewDetailsButton}
          onPress={() => router.push({
            pathname: '/doctor/appointments/detail',
            params: { appointmentId: request.$id }
          })}
        >
          <Text style={styles.viewDetailsText}>View Appointment Details</Text>
          <Ionicons name="arrow-forward" size={14} color="#4CAF50" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderActionModal = () => (
    <Modal
      visible={showActionModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowActionModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {actionType === 'approve' ? 'Approve Cancellation' : 'Deny Cancellation'}
            </Text>
            <TouchableOpacity onPress={() => setShowActionModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {selectedRequest && (
              <>
                <Text style={styles.modalPatientName}>
                  {getPatientName(selectedRequest)}
                </Text>
                <Text style={styles.modalAppointmentInfo}>
                  {formatDate(selectedRequest.date)} at {selectedRequest.time_slot}
                </Text>
                
                {selectedRequest.cancellation_reason && (
                  <View style={styles.modalReasonSection}>
                    <Text style={styles.modalReasonLabel}>Patient's Reason:</Text>
                    <Text style={styles.modalReasonText}>
                      {selectedRequest.cancellation_reason}
                    </Text>
                  </View>
                )}

                {actionType === 'approve' && (
                  <View style={styles.confirmationSection}>
                    <Text style={styles.confirmationText}>
                      Are you sure you want to approve this cancellation request? 
                      This will cancel the appointment permanently.
                    </Text>
                  </View>
                )}

                {actionType === 'deny' && (
                  <View style={styles.denialInputSection}>
                    <Text style={styles.denialInputLabel}>
                      Reason for denial (required):
                    </Text>
                    <TextInput
                      style={styles.denialInput}
                      placeholder="Enter reason for denying this cancellation request..."
                      value={denialReason}
                      onChangeText={setDenialReason}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowActionModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.confirmButton,
                actionType === 'approve' ? styles.approveConfirmButton : styles.denyConfirmButton
              ]}
              onPress={executeAction}
              disabled={processing || (actionType === 'deny' && !denialReason.trim())}
            >
              {processing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons 
                    name={actionType === 'approve' ? "checkmark-circle" : "close-circle"} 
                    size={16} 
                    color="white" 
                  />
                  <Text style={styles.confirmButtonText}>
                    {actionType === 'approve' ? 'Approve' : 'Deny'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a8e2d" />
        <Text style={styles.loadingText}>Loading cancellation requests...</Text>
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
      
      {/* Header */}
      <View style={styles.header}>
        <PageHeader onPress={() => router.back()} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Cancellation</Text>
          <Text style={styles.headerTitle}>Requests</Text>
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

      {renderStatsCards()}

      <FlatList
        data={filteredRequests}
        renderItem={renderRequestCard}
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
                name={filter === 'pending' ? "hourglass-outline" : "document-text-outline"} 
                size={64} 
                color="#E0E0E0" 
              />
            </View>
            <Text style={styles.emptyStateText}>
              {filter === 'pending' ? 'No pending requests' : `No ${filter} requests`}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {filter === 'pending' 
                ? 'All caught up! No cancellation requests need your attention.' 
                : `There are no ${filter} cancellation requests at the moment.`
              }
            </Text>
          </View>
        )}
      />

      {renderActionModal()}
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
  
  // Stats Cards
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
    position: 'relative',
  },
  activeStatCard: {
    backgroundColor: '#F0FDF4',
    marginHorizontal: 4,
  },
  statIconContainer: {
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  urgentDot: {
    position: 'absolute',
    top: 4,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  
  // List
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  
  // Request Card
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  urgentStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    backgroundColor: '#EF4444',
  },
  
  // Card Header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  patientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  requestTime: {
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
  
  // Appointment Details
  appointmentDetails: {
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  
  // Reason Section
  reasonSection: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  
  // Denial Section
  denialSection: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  denialLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
    marginBottom: 4,
  },
  denialText: {
    fontSize: 14,
    color: '#7F1D1D',
    fontStyle: 'italic',
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  denyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: 'white',
    gap: 4,
  },
  denyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#10B981',
    gap: 4,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  
  // View Details Button
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4CAF50',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
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
  modalPatientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  modalAppointmentInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalReasonSection: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalReasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  modalReasonText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  confirmationSection: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  confirmationText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  denialInputSection: {
    marginTop: 8,
  },
  denialInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  denialInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  approveConfirmButton: {
    backgroundColor: '#10B981',
  },
  denyConfirmButton: {
    backgroundColor: '#EF4444',
  },
  confirmButtonText: {
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