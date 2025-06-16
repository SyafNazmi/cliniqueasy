// app/profile/cancellation-history.jsx - PATIENT CANCELLATION HISTORY SCREEN
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  RefreshControl,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { account, DatabaseService, Query } from '@/configs/AppwriteConfig';
import { COLLECTIONS } from '@/constants';

// Cancellation status constants
const CANCELLATION_STATUS = {
  NONE: null,
  REQUESTED: 'cancellation_requested',
  APPROVED: 'cancellation_approved',
  DENIED: 'cancellation_denied'
};

const APPOINTMENT_STATUS = {
  BOOKED: 'Booked',
  CONFIRMED: 'Confirmed',
  RESCHEDULED: 'Rescheduled',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  NO_SHOW: 'No Show'
};

export default function CancellationHistory() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      const user = await account.get();
      setCurrentUser(user);
      await loadCancellationHistory(user.$id);
    } catch (error) {
      console.error('Error initializing data:', error);
    }
  };

  const loadCancellationHistory = async (userId) => {
    try {
      setLoading(true);
      
      console.log('Loading cancellation history for user:', userId);
      
      // Get all appointments for this user that have had cancellation requests
      const queries = [
        Query.equal('user_id', userId),
        Query.or([
          Query.equal('cancellation_status', CANCELLATION_STATUS.REQUESTED),
          Query.equal('cancellation_status', CANCELLATION_STATUS.APPROVED),
          Query.equal('cancellation_status', CANCELLATION_STATUS.DENIED)
        ]),
        Query.orderDesc('cancellation_requested_at')
      ];

      const response = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS,
        queries
      );

      console.log('Loaded cancellation history:', response.documents.length);
      setRequests(response.documents);
      
    } catch (error) {
      console.error('Error loading cancellation history:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (!currentUser) return;
    
    setRefreshing(true);
    await loadCancellationHistory(currentUser.$id);
    setRefreshing(false);
  };

  const getStatusInfo = (request) => {
    switch (request.cancellation_status) {
      case CANCELLATION_STATUS.REQUESTED:
        return { 
          color: '#F59E0B', 
          bgColor: '#FEF3C7', 
          text: 'Pending Review', 
          icon: 'hourglass',
          description: 'Your cancellation request is being reviewed by the health practitioner.'
        };
      case CANCELLATION_STATUS.APPROVED:
        return { 
          color: '#10B981', 
          bgColor: '#D1FAE5', 
          text: 'Approved & Cancelled', 
          icon: 'checkmark-circle',
          description: 'Your cancellation request was approved. The appointment has been cancelled.'
        };
      case CANCELLATION_STATUS.DENIED:
        return { 
          color: '#EF4444', 
          bgColor: '#FEE2E2', 
          text: 'Request Denied', 
          icon: 'close-circle',
          description: 'Your cancellation request was denied. The appointment remains active.'
        };
      default:
        return { 
          color: '#6B7280', 
          bgColor: '#F9FAFB', 
          text: 'Unknown Status', 
          icon: 'help-circle',
          description: 'Status unclear.'
        };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getTimeSinceRequest = (requestedAt) => {
    if (!requestedAt) return 'Unknown time';
    
    const now = new Date();
    const requestTime = new Date(requestedAt);
    const diffMs = now - requestTime;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 7) {
      return requestTime.toLocaleDateString();
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${Math.max(1, diffMinutes)} minute${diffMinutes > 1 ? 's' : ''} ago`;
    }
  };

  const navigateToAppointment = (appointmentId) => {
    router.push({
      pathname: '/profile/appointment-details',
      params: { appointmentId }
    });
  };

  const renderRequestCard = (request) => {
    const statusInfo = getStatusInfo(request);
    const timeSince = getTimeSinceRequest(request.cancellation_requested_at);
    
    return (
      <TouchableOpacity 
        key={request.$id} 
        style={styles.requestCard}
        onPress={() => navigateToAppointment(request.$id)}
        activeOpacity={0.7}
      >
        <View style={[styles.statusStripe, { backgroundColor: statusInfo.color }]} />
        
        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.appointmentInfo}>
              <Text style={styles.appointmentDate}>{request.date}</Text>
              <Text style={styles.appointmentTime}>{request.time_slot}</Text>
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
              <Ionicons name="medical" size={16} color="#666" />
              <Text style={styles.detailText}>
                {request.service_name || 'General Consultation'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.detailText}>
                {request.branch_name || 'Unknown Branch'}
              </Text>
            </View>
            {request.is_family_booking && (
              <View style={styles.detailRow}>
                <Ionicons name="people" size={16} color="#8B5CF6" />
                <Text style={[styles.detailText, { color: '#8B5CF6' }]}>
                  Family Member: {request.patient_name || 'Not specified'}
                </Text>
              </View>
            )}
          </View>

          {/* Status Description */}
          <View style={styles.statusDescription}>
            <Text style={styles.descriptionText}>{statusInfo.description}</Text>
          </View>

          {/* Request Details */}
          <View style={styles.requestDetails}>
            <View style={styles.requestRow}>
              <Text style={styles.requestLabel}>Your Reason:</Text>
              <Text style={styles.requestValue}>
                {request.cancellation_reason || 'No reason provided'}
              </Text>
            </View>
            
            <View style={styles.requestRow}>
              <Text style={styles.requestLabel}>Requested:</Text>
              <Text style={styles.requestValue}>{timeSince}</Text>
            </View>

            {request.cancellation_status === CANCELLATION_STATUS.DENIED && 
             request.cancellation_denial_reason && (
              <View style={styles.denialSection}>
                <Text style={styles.denialLabel}>Denial Reason:</Text>
                <Text style={styles.denialText}>
                  {request.cancellation_denial_reason}
                </Text>
              </View>
            )}

            {(request.cancellation_reviewed_at) && (
              <View style={styles.reviewInfo}>
                <Text style={styles.reviewText}>
                  Reviewed: {formatDate(request.cancellation_reviewed_at)}
                </Text>
              </View>
            )}
          </View>

          {/* Action Hint */}
          <View style={styles.actionHint}>
            <Text style={styles.hintText}>Tap for appointment details</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cancellation History</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0AD476" />
          <Text style={styles.loadingText}>Loading cancellation history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cancellation History</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text" size={50} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Cancellation Requests</Text>
            <Text style={styles.emptyText}>
              You haven't submitted any cancellation requests yet.
            </Text>
            <TouchableOpacity 
              style={styles.browseButton}
              onPress={() => router.push('/appointment')}
            >
              <Text style={styles.browseButtonText}>View Your Appointments</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Summary */}
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {requests.length} cancellation request{requests.length > 1 ? 's' : ''} found
              </Text>
              
              <View style={styles.summaryStats}>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>
                    {requests.filter(r => r.cancellation_status === CANCELLATION_STATUS.REQUESTED).length}
                  </Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>
                    {requests.filter(r => r.cancellation_status === CANCELLATION_STATUS.APPROVED).length}
                  </Text>
                  <Text style={styles.statLabel}>Approved</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>
                    {requests.filter(r => r.cancellation_status === CANCELLATION_STATUS.DENIED).length}
                  </Text>
                  <Text style={styles.statLabel}>Denied</Text>
                </View>
              </View>
            </View>

            {/* Requests List */}
            <View style={styles.requestsList}>
              {requests.map(renderRequestCard)}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 5,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  refreshButton: {
    padding: 5,
    width: 40,
    alignItems: 'center',
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
  content: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  summary: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0AD476',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  requestsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusStripe: {
    height: 4,
    width: '100%',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  appointmentInfo: {},
  appointmentDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  appointmentTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  statusDescription: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  requestDetails: {
    marginBottom: 12,
  },
  requestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  requestValue: {
    fontSize: 13,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  denialSection: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  denialLabel: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
    marginBottom: 4,
  },
  denialText: {
    fontSize: 13,
    color: '#7F1D1D',
    fontStyle: 'italic',
  },
  reviewInfo: {
    marginTop: 8,
  },
  reviewText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  hintText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#0AD476',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});