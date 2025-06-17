// service/appointmentUtils.js - FIXED VERSION with formatDateForDisplay method
import { DatabaseService, Query, RealtimeService } from '../configs/AppwriteConfig';
import { COLLECTIONS } from '../constants';

// Appointment status constants
export const APPOINTMENT_STATUS = {
  BOOKED: 'Booked',
  CONFIRMED: 'Confirmed',
  RESCHEDULED: 'Rescheduled',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  NO_SHOW: 'No Show'
};

// Cancellation status constants
export const CANCELLATION_STATUS = {
  NONE: null,
  REQUESTED: 'cancellation_requested',
  APPROVED: 'cancellation_approved',
  DENIED: 'cancellation_denied'
};

export class EnhancedAppointmentManager {
  constructor() {
    this.subscriptions = new Map();
    this.listeners = new Map();
    this.isDestroyed = false;
    this.activeCallbacks = new Map(); // Track active callbacks to prevent duplicates
  }

  // Enhanced subscription method with deduplication
  subscribeToAppointments(callback, options = {}) {
    if (this.isDestroyed) {
      console.warn('AppointmentManager is destroyed, cannot create new subscriptions');
      return null;
    }

    try {
      // Create a unique subscription key based on options
      const subscriptionKey = `appointments_${JSON.stringify(options)}_${Date.now()}`;
      
      // Check if we already have an identical subscription
      if (this.subscriptions.has(subscriptionKey)) {
        console.log('Subscription already exists, cleaning up first:', subscriptionKey);
        this.unsubscribe(subscriptionKey);
      }

      console.log('Creating appointment subscription with key:', subscriptionKey);

      // Create a wrapper callback to prevent duplicate processing
      let lastProcessedTimestamp = 0;
      const DEBOUNCE_DELAY = 200; // Increased debounce delay

      const wrappedCallback = (response) => {
        if (this.isDestroyed) {
          console.log('Manager destroyed, ignoring realtime event');
          return;
        }

        try {
          const currentTime = Date.now();
          
          // Debounce rapid consecutive calls
          if (currentTime - lastProcessedTimestamp < DEBOUNCE_DELAY) {
            console.log('Debouncing appointment callback');
            return;
          }
          
          lastProcessedTimestamp = currentTime;

          console.log('Processing appointment realtime event:', response);
          
          const { events, payload, timestamp } = response;
          
          if (!events || !Array.isArray(events) || events.length === 0) {
            console.log('No valid events in appointment response');
            return;
          }

          // Create a unique event identifier to prevent duplicate processing
          const eventId = `${payload?.$id || 'unknown'}_${timestamp || currentTime}_${events.join('_')}`;
          
          if (this.activeCallbacks.has(eventId)) {
            console.log('Duplicate event detected, skipping:', eventId);
            return;
          }

          // Mark this event as being processed
          this.activeCallbacks.set(eventId, currentTime);
          
          // Clean up old event IDs (keep only last 10)
          if (this.activeCallbacks.size > 10) {
            const entries = Array.from(this.activeCallbacks.entries());
            entries.slice(0, -10).forEach(([key]) => {
              this.activeCallbacks.delete(key);
            });
          }

          const eventString = events.join(' ').toLowerCase();
          console.log('Event string:', eventString);
          
          let eventType = 'unknown';
          let message = 'Appointment updated';
          
          if (eventString.includes('create')) {
            eventType = 'created';
            message = `New appointment created: ${payload?.status || 'Unknown status'}`;
          } else if (eventString.includes('update')) {
            eventType = 'updated';
            const updateType = this.detectUpdateType(payload);
            message = this.getUpdateMessage(updateType, payload);
          } else if (eventString.includes('delete')) {
            eventType = 'deleted';
            message = 'Appointment deleted';
          }
          
          const processedEvent = {
            type: eventType,
            appointment: payload,
            updateType: eventType === 'updated' ? this.detectUpdateType(payload) : null,
            message: message,
            timestamp: currentTime,
            eventId: eventId
          };
          
          console.log('Calling callback with processed event:', processedEvent);
          
          // Use setTimeout to ensure callback runs asynchronously
          setTimeout(() => {
            try {
              callback(processedEvent);
            } catch (callbackError) {
              console.error('Error in appointment callback:', callbackError);
            }
          }, 0);
          
        } catch (eventError) {
          console.error('Error processing appointment realtime event:', eventError);
          
          setTimeout(() => {
            try {
              callback({
                type: 'error',
                appointment: null,
                message: 'Error processing realtime update',
                error: eventError.message,
                timestamp: Date.now()
              });
            } catch (callbackError) {
              console.error('Error calling error callback:', callbackError);
            }
          }, 0);
        }
      };

      // Use the fixed RealtimeService from the config
      const subscriptionResult = RealtimeService.subscribeToCollection(
        COLLECTIONS.APPOINTMENTS,
        wrappedCallback,
        subscriptionKey // Pass subscription ID for tracking
      );

      if (subscriptionResult && subscriptionResult.unsubscribe) {
        this.subscriptions.set(subscriptionKey, subscriptionResult.unsubscribe);
        console.log('Successfully subscribed to appointments with ID:', subscriptionResult.subscriptionId);
        return subscriptionKey;
      } else {
        console.warn('Failed to create appointment subscription - no unsubscribe function returned');
        return null;
      }
      
    } catch (error) {
      console.error('Error setting up appointment subscription:', error);
      return null;
    }
  }

  // Enhanced specific appointment subscription
  subscribeToAppointment(appointmentId, callback) {
    if (this.isDestroyed) {
      console.warn('AppointmentManager is destroyed, cannot create new subscriptions');
      return null;
    }

    try {
      const subscriptionKey = `appointment_${appointmentId}_${Date.now()}`;
      
      if (this.subscriptions.has(subscriptionKey)) {
        console.log('Specific appointment subscription exists, cleaning up first');
        this.unsubscribe(subscriptionKey);
      }

      console.log('Creating specific appointment subscription:', appointmentId);

      let lastProcessedTimestamp = 0;
      const DEBOUNCE_DELAY = 150;

      const wrappedCallback = (response) => {
        if (this.isDestroyed) {
          return;
        }

        try {
          const currentTime = Date.now();
          
          if (currentTime - lastProcessedTimestamp < DEBOUNCE_DELAY) {
            console.log('Debouncing specific appointment callback');
            return;
          }
          
          lastProcessedTimestamp = currentTime;

          console.log('Specific appointment update:', response);
          
          const { events, payload } = response;
          
          if (events && Array.isArray(events) && events.length > 0) {
            const eventString = events.join(' ').toLowerCase();
            const updateType = this.detectUpdateType(payload);
            
            const processedEvent = {
              type: eventString.includes('update') ? 'updated' : 'general',
              appointment: payload,
              updateType: updateType,
              message: this.getUpdateMessage(updateType, payload),
              timestamp: currentTime
            };

            setTimeout(() => {
              try {
                callback(processedEvent);
              } catch (callbackError) {
                console.error('Error in specific appointment callback:', callbackError);
              }
            }, 0);
          }
        } catch (eventError) {
          console.error('Error processing specific appointment event:', eventError);
          
          setTimeout(() => {
            try {
              callback({
                type: 'error',
                appointment: null,
                message: 'Error processing appointment update',
                error: eventError.message,
                timestamp: Date.now()
              });
            } catch (callbackError) {
              console.error('Error calling appointment error callback:', callbackError);
            }
          }, 0);
        }
      };

      const subscriptionResult = RealtimeService.subscribeToDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId,
        wrappedCallback,
        subscriptionKey
      );

      if (subscriptionResult && subscriptionResult.unsubscribe) {
        this.subscriptions.set(subscriptionKey, subscriptionResult.unsubscribe);
        console.log('Successfully subscribed to appointment:', appointmentId);
        return subscriptionKey;
      }
      
      return null;
    } catch (error) {
      console.error('Error subscribing to specific appointment:', error);
      return null;
    }
  }

  // Get pending cancellation requests count for doctor dashboard
  async getPendingCancellationRequestsCount(doctorId = null) {
    try {
      let queries = [Query.equal('cancellation_status', CANCELLATION_STATUS.REQUESTED)];
      
      if (doctorId) {
        queries.push(Query.equal('doctor_id', doctorId));
      }
      
      const response = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS,
        queries
      );
      
      return response.documents.length;
    } catch (error) {
      console.error('Error getting pending cancellation requests count:', error);
      return 0;
    }
  }

  // Request appointment cancellation (Patient side)
  async requestCancellation(appointmentId, reason = '', requestedBy = 'patient') {
    try {
      if (!appointmentId) {
        return { success: false, error: 'Appointment ID is required' };
      }

      const currentAppointment = await DatabaseService.getDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId
      );

      if (!currentAppointment) {
        return { success: false, error: 'Appointment not found' };
      }

      if (currentAppointment.status === APPOINTMENT_STATUS.CANCELLED) {
        return { success: false, error: 'Appointment is already cancelled' };
      }

      if (currentAppointment.status === APPOINTMENT_STATUS.COMPLETED) {
        return { success: false, error: 'Cannot request cancellation for completed appointment' };
      }

      if (currentAppointment.cancellation_status === CANCELLATION_STATUS.REQUESTED) {
        return { success: false, error: 'Cancellation request already exists' };
      }

      const updateData = {
        cancellation_status: CANCELLATION_STATUS.REQUESTED,
        cancellation_reason: reason,
        cancellation_requested_at: new Date().toISOString(),
        cancellation_requested_by: requestedBy
      };

      const result = await DatabaseService.updateDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId,
        updateData
      );

      return { success: true, data: result };
    } catch (error) {
      console.error('Error requesting cancellation:', error);
      return { success: false, error: error.message || 'Failed to request cancellation' };
    }
  }

  // Withdraw cancellation request (Patient side)
  async withdrawCancellationRequest(appointmentId) {
    try {
      if (!appointmentId) {
        return { success: false, error: 'Appointment ID is required' };
      }

      const currentAppointment = await DatabaseService.getDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId
      );

      if (!currentAppointment) {
        return { success: false, error: 'Appointment not found' };
      }

      if (currentAppointment.cancellation_status !== CANCELLATION_STATUS.REQUESTED) {
        return { success: false, error: 'No pending cancellation request found' };
      }

      const updateData = {
        cancellation_status: CANCELLATION_STATUS.NONE,
        cancellation_reason: null,
        cancellation_requested_at: null,
        cancellation_requested_by: null
      };

      const result = await DatabaseService.updateDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId,
        updateData
      );

      return { success: true, data: result };
    } catch (error) {
      console.error('Error withdrawing cancellation request:', error);
      return { success: false, error: error.message || 'Failed to withdraw cancellation request' };
    }
  }

  // Approve cancellation request (Doctor side)
  async approveCancellationRequest(appointmentId, reviewedBy = 'doctor') {
    try {
      if (!appointmentId) {
        return { success: false, error: 'Appointment ID is required' };
      }

      const currentAppointment = await DatabaseService.getDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId
      );

      if (!currentAppointment) {
        return { success: false, error: 'Appointment not found' };
      }

      if (currentAppointment.cancellation_status !== CANCELLATION_STATUS.REQUESTED) {
        return { success: false, error: 'No pending cancellation request found' };
      }

      const updateData = {
        status: APPOINTMENT_STATUS.CANCELLED,
        cancellation_status: CANCELLATION_STATUS.APPROVED,
        cancellation_reviewed_at: new Date().toISOString(),
        cancellation_reviewed_by: reviewedBy,
        cancellation_approved_at: new Date().toISOString()
      };

      const result = await DatabaseService.updateDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId,
        updateData
      );

      return { success: true, data: result };
    } catch (error) {
      console.error('Error approving cancellation request:', error);
      return { success: false, error: error.message || 'Failed to approve cancellation request' };
    }
  }

  // Deny cancellation request (Doctor side)
  async denyCancellationRequest(appointmentId, denialReason = '', reviewedBy = 'doctor') {
    try {
      if (!appointmentId) {
        return { success: false, error: 'Appointment ID is required' };
      }

      if (!denialReason.trim()) {
        return { success: false, error: 'Denial reason is required' };
      }

      const currentAppointment = await DatabaseService.getDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId
      );

      if (!currentAppointment) {
        return { success: false, error: 'Appointment not found' };
      }

      if (currentAppointment.cancellation_status !== CANCELLATION_STATUS.REQUESTED) {
        return { success: false, error: 'No pending cancellation request found' };
      }

      const updateData = {
        cancellation_status: CANCELLATION_STATUS.DENIED,
        cancellation_reviewed_at: new Date().toISOString(),
        cancellation_reviewed_by: reviewedBy,
        cancellation_denial_reason: denialReason
      };

      const result = await DatabaseService.updateDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId,
        updateData
      );

      return { success: true, data: result };
    } catch (error) {
      console.error('Error denying cancellation request:', error);
      return { success: false, error: error.message || 'Failed to deny cancellation request' };
    }
  }

  // Get cancellation requests with filtering options
  async getCancellationRequests(options = {}) {
    try {
      const {
        status = 'all',
        doctorId = null,
        limit = 100,
        offset = 0,
        sortBy = 'desc'
      } = options;

      let queries = [];

      if (status === 'pending') {
        queries.push(Query.equal('cancellation_status', CANCELLATION_STATUS.REQUESTED));
      } else if (status === 'approved') {
        queries.push(Query.equal('cancellation_status', CANCELLATION_STATUS.APPROVED));
      } else if (status === 'denied') {
        queries.push(Query.equal('cancellation_status', CANCELLATION_STATUS.DENIED));
      } else if (status === 'all') {
        queries.push(
          Query.or([
            Query.equal('cancellation_status', CANCELLATION_STATUS.REQUESTED),
            Query.equal('cancellation_status', CANCELLATION_STATUS.APPROVED),
            Query.equal('cancellation_status', CANCELLATION_STATUS.DENIED)
          ])
        );
      }

      if (doctorId) {
        queries.push(Query.equal('doctor_id', doctorId));
      }

      if (sortBy === 'desc') {
        queries.push(Query.orderDesc('cancellation_requested_at'));
      } else {
        queries.push(Query.orderAsc('cancellation_requested_at'));
      }

      queries.push(Query.limit(limit));
      if (offset > 0) {
        queries.push(Query.offset(offset));
      }

      const response = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS,
        queries
      );

      return { success: true, data: response.documents, total: response.total };
    } catch (error) {
      console.error('Error getting cancellation requests:', error);
      return { success: false, error: error.message || 'Failed to get cancellation requests' };
    }
  }

  // Get booked slots for a specific doctor and date
  async getBookedSlots(doctorId, date, excludeAppointmentId = null) {
    try {
      if (!doctorId || !date) {
        console.log('Missing doctorId or date for getBookedSlots');
        return [];
      }

      const formattedDate = this.formatDateForQuery(date);
      console.log('Fetching booked slots for doctor:', doctorId, 'on date:', formattedDate);

      const queries = [
        Query.equal('doctor_id', doctorId),
        Query.equal('date', formattedDate),
        Query.notEqual('status', APPOINTMENT_STATUS.CANCELLED)
      ];

      if (excludeAppointmentId) {
        queries.push(Query.notEqual('$id', excludeAppointmentId));
      }

      const response = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS,
        queries
      );

      console.log('Found appointments:', response.documents);
      const bookedSlots = response.documents.map(appointment => appointment.time_slot);
      
      console.log('Booked time slots:', bookedSlots);
      return bookedSlots;

    } catch (error) {
      console.error('Error fetching booked slots:', error);
      throw error;
    }
  }

  // Check if a specific slot is available
  async checkSlotAvailability(doctorId, date, timeSlot, excludeAppointmentId = null) {
    try {
      if (!doctorId || !date || !timeSlot) {
        console.log('Missing parameters for checkSlotAvailability');
        return false;
      }

      const formattedDate = this.formatDateForQuery(date);
      console.log('Checking availability for:', { doctorId, formattedDate, timeSlot });

      const queries = [
        Query.equal('doctor_id', doctorId),
        Query.equal('date', formattedDate),
        Query.equal('time_slot', timeSlot),
        Query.notEqual('status', APPOINTMENT_STATUS.CANCELLED)
      ];

      if (excludeAppointmentId) {
        queries.push(Query.notEqual('$id', excludeAppointmentId));
      }

      const response = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS,
        queries
      );

      const isAvailable = response.documents.length === 0;
      console.log('Slot availability:', isAvailable);
      
      return isAvailable;

    } catch (error) {
      console.error('Error checking slot availability:', error);
      return false;
    }
  }

  // Helper method to format date consistently
  formatDateForQuery(date) {
    if (typeof date === 'string') {
      return date;
    }

    if (date instanceof Date) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    console.error('Invalid date format:', date);
    return '';
  }

  // FIXED: Added the missing formatDateForDisplay method
  formatDateForDisplay(date) {
    return this.formatDateForQuery(date);
  }

  // Enhanced reschedule method
  async rescheduleAppointment(appointmentId, newDate, newTimeSlot, reason = '') {
    try {
      if (!appointmentId || !newDate || !newTimeSlot) {
        return { success: false, error: 'Missing required parameters' };
      }

      const currentAppointment = await DatabaseService.getDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId
      );

      if (!currentAppointment) {
        return { success: false, error: 'Appointment not found' };
      }

      if (currentAppointment.status === APPOINTMENT_STATUS.CANCELLED) {
        return { success: false, error: 'Cannot reschedule a cancelled appointment' };
      }

      if (currentAppointment.status === APPOINTMENT_STATUS.COMPLETED) {
        return { success: false, error: 'Cannot reschedule a completed appointment' };
      }

      if (currentAppointment.cancellation_status === CANCELLATION_STATUS.REQUESTED) {
        return { success: false, error: 'Cannot reschedule while cancellation request is pending' };
      }

      const isAvailable = await this.checkSlotAvailability(
        currentAppointment.doctor_id,
        newDate,
        newTimeSlot,
        appointmentId
      );

      if (!isAvailable) {
        return { success: false, error: 'Selected time slot is not available' };
      }

      const formattedNewDate = this.formatDateForQuery(newDate);

      const updateData = {
        date: formattedNewDate,
        time_slot: newTimeSlot,
        status: APPOINTMENT_STATUS.RESCHEDULED,
        rescheduled_at: new Date().toISOString(),
        reschedule_reason: reason,
        original_date: currentAppointment.original_date || currentAppointment.date,
        original_time_slot: currentAppointment.original_time_slot || currentAppointment.time_slot,
        reschedule_count: (currentAppointment.reschedule_count || 0) + 1
      };

      const result = await DatabaseService.updateDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId,
        updateData
      );

      return { success: true, data: result };

    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      return { success: false, error: error.message || 'Failed to reschedule appointment' };
    }
  }

  // Detect update type including cancellation requests
  detectUpdateType(appointment) {
    if (!appointment) return 'general_update';
    
    try {
      if (appointment.cancellation_status === CANCELLATION_STATUS.REQUESTED) {
        return 'cancellation_requested';
      } else if (appointment.cancellation_status === CANCELLATION_STATUS.APPROVED) {
        return 'cancellation_approved';
      } else if (appointment.cancellation_status === CANCELLATION_STATUS.DENIED) {
        return 'cancellation_denied';
      }
      
      if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
        return 'cancelled';
      } else if (appointment.rescheduled_at) {
        return 'rescheduled';
      } else if (appointment.status === APPOINTMENT_STATUS.CONFIRMED) {
        return 'confirmed';
      } else if (appointment.status === APPOINTMENT_STATUS.COMPLETED) {
        return 'completed';
      }
      
      return 'general_update';
    } catch (error) {
      console.error('Error detecting update type:', error);
      return 'general_update';
    }
  }

  // Get user-friendly message for updates including cancellation requests
  getUpdateMessage(updateType, appointment) {
    try {
      if (!appointment) return 'Appointment updated';
      
      const dateStr = appointment.date || 'Unknown date';
      const timeStr = appointment.time_slot || 'Unknown time';
      
      switch (updateType) {
        case 'cancellation_requested':
          return `Cancellation requested for: ${dateStr} at ${timeStr}`;
        case 'cancellation_approved':
          return `Cancellation approved for: ${dateStr} at ${timeStr}`;
        case 'cancellation_denied':
          return `Cancellation denied for: ${dateStr} at ${timeStr}`;
        case 'cancelled':
          return `Appointment cancelled: ${dateStr} at ${timeStr}`;
        case 'rescheduled':
          return `Appointment rescheduled to: ${dateStr} at ${timeStr}`;
        case 'confirmed':
          return `Appointment confirmed: ${dateStr} at ${timeStr}`;
        case 'completed':
          return `Appointment completed: ${dateStr} at ${timeStr}`;
        default:
          return 'Appointment updated';
      }
    } catch (error) {
      console.error('Error generating update message:', error);
      return 'Appointment updated';
    }
  }

  // Get single appointment
  async getAppointment(appointmentId) {
    try {
      console.log('📖 Getting appointment:', appointmentId);
      
      if (!appointmentId) {
        throw new Error('Appointment ID is required');
      }
      
      const appointment = await DatabaseService.getDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId
      );
  
      console.log('✅ Got appointment:', appointment);
      return appointment;
  
    } catch (error) {
      console.error('❌ Get appointment error:', error);
      throw error;
    }
  }

  // Enhanced cancellation
  async cancelAppointment(appointmentId, reason = '', cancelledBy = 'patient') {
    try {
      if (!appointmentId) {
        return { success: false, error: 'Appointment ID is required' };
      }

      const currentAppointment = await DatabaseService.getDocument(
        COLLECTIONS.APPOINTMENTS, 
        appointmentId
      );

      if (!currentAppointment) {
        return { success: false, error: 'Appointment not found' };
      }

      if (currentAppointment.status === APPOINTMENT_STATUS.CANCELLED) {
        return { success: false, error: 'Appointment is already cancelled' };
      }

      if (currentAppointment.status === APPOINTMENT_STATUS.COMPLETED) {
        return { success: false, error: 'Cannot cancel a completed appointment' };
      }

      const updateData = {
        status: APPOINTMENT_STATUS.CANCELLED,
        cancellation_reason: reason
      };

      const result = await DatabaseService.updateDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId,
        updateData
      );
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      return { success: false, error: error.message || 'Failed to cancel appointment' };
    }
  }

  // Enhanced cleanup method
  cleanup() {
    console.log('Cleaning up appointment manager...');
    this.isDestroyed = true;
    
    let cleanupCount = 0;
    this.subscriptions.forEach((unsubscribe, key) => {
      try {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
          cleanupCount++;
        }
        console.log('Cleaned up subscription:', key);
      } catch (error) {
        console.error('Error cleaning up subscription:', key, error);
      }
    });
    
    this.subscriptions.clear();
    this.listeners.clear();
    this.activeCallbacks.clear(); // Clear callback tracking
    
    console.log(`Successfully cleaned up ${cleanupCount} subscriptions`);
  }

  // Enhanced unsubscribe method
  unsubscribe(subscriptionKey) {
    const unsubscribe = this.subscriptions.get(subscriptionKey);
    if (unsubscribe) {
      try {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
        this.subscriptions.delete(subscriptionKey);
        console.log('Successfully unsubscribed from:', subscriptionKey);
        return true;
      } catch (error) {
        console.error('Error unsubscribing from:', subscriptionKey, error);
        return false;
      }
    }
    return false;
  }

  // Method to get active subscription count for debugging
  getActiveSubscriptionCount() {
    return this.subscriptions.size;
  }

  // Method to list all active subscriptions for debugging
  listActiveSubscriptions() {
    return Array.from(this.subscriptions.keys());
  }
}

// Create and export singleton instance
export const appointmentManager = new EnhancedAppointmentManager();