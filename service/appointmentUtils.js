// service/appointmentUtils.js - ENHANCED VERSION for Expo SDK 53
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

export class EnhancedAppointmentManager {
  constructor() {
    this.subscriptions = new Map();
    this.listeners = new Map();
    this.isDestroyed = false;
  }

  // NEW: Get booked slots for a specific doctor and date (with exclusion option)
  async getBookedSlots(doctorId, date, excludeAppointmentId = null) {
    try {
      if (!doctorId || !date) {
        console.log('Missing doctorId or date for getBookedSlots');
        return [];
      }

      // Format the date to match the format stored in database
      const formattedDate = this.formatDateForQuery(date);
      console.log('Fetching booked slots for doctor:', doctorId, 'on date:', formattedDate);

      // Build queries
      const queries = [
        Query.equal('doctor_id', doctorId),
        Query.equal('date', formattedDate),
        Query.notEqual('status', APPOINTMENT_STATUS.CANCELLED) // Exclude cancelled appointments
      ];

      // Exclude a specific appointment if provided (useful for rescheduling)
      if (excludeAppointmentId) {
        queries.push(Query.notEqual('$id', excludeAppointmentId));
      }

      const response = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS,
        queries
      );

      console.log('Found appointments:', response.documents);

      // Extract time slots from the appointments
      const bookedSlots = response.documents.map(appointment => appointment.time_slot);
      
      console.log('Booked time slots:', bookedSlots);
      return bookedSlots;

    } catch (error) {
      console.error('Error fetching booked slots:', error);
      throw error;
    }
  }

  // NEW: Check if a specific slot is available (with exclusion option)
  async checkSlotAvailability(doctorId, date, timeSlot, excludeAppointmentId = null) {
    try {
      if (!doctorId || !date || !timeSlot) {
        console.log('Missing parameters for checkSlotAvailability');
        return false;
      }

      const formattedDate = this.formatDateForQuery(date);
      console.log('Checking availability for:', { doctorId, formattedDate, timeSlot });

      // Build queries
      const queries = [
        Query.equal('doctor_id', doctorId),
        Query.equal('date', formattedDate),
        Query.equal('time_slot', timeSlot),
        Query.notEqual('status', APPOINTMENT_STATUS.CANCELLED)
      ];

      // Exclude a specific appointment if provided (useful for rescheduling)
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
      return false; // Assume not available on error for safety
    }
  }

  // NEW: Helper method to format date consistently for database queries
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

  // NEW: Helper method to format date for display (same as query format)
  formatDateForDisplay(date) {
    return this.formatDateForQuery(date);
  }

  // NEW: Enhanced reschedule method
  async rescheduleAppointment(appointmentId, newDate, newTimeSlot, reason = '') {
    try {
      if (!appointmentId || !newDate || !newTimeSlot) {
        return { success: false, error: 'Missing required parameters' };
      }

      // Get current appointment
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

      // Check if new slot is available (excluding current appointment)
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

      // Prepare update data
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

  // ROBUST: Subscribe to real-time appointment updates
  subscribeToAppointments(callback, options = {}) {
    if (this.isDestroyed) {
      console.warn('AppointmentManager is destroyed, cannot create new subscriptions');
      return null;
    }

    try {
      const subscriptionKey = `appointments_${JSON.stringify(options)}_${Date.now()}`;
      
      // Clean up existing subscription if it exists
      if (this.subscriptions.has(subscriptionKey)) {
        this.unsubscribe(subscriptionKey);
      }

      console.log('Creating appointment subscription with key:', subscriptionKey);

      const unsubscribe = RealtimeService.subscribeToCollection(
        COLLECTIONS.APPOINTMENTS,
        (response) => {
          if (this.isDestroyed) {
            console.log('Manager destroyed, ignoring realtime event');
            return;
          }

          try {
            console.log('Processing appointment realtime event:', response);
            
            const { events, payload } = response;
            
            if (!events || !Array.isArray(events) || events.length === 0) {
              console.log('No valid events in appointment response');
              return;
            }

            const eventString = events.join(' ').toLowerCase();
            console.log('Event string:', eventString);
            
            // More robust event detection
            let eventType = 'unknown';
            let message = 'Appointment updated';
            
            if (eventString.includes('create') || eventString.includes('.create')) {
              eventType = 'created';
              message = `New appointment created: ${payload?.status || 'Unknown status'}`;
            } else if (eventString.includes('update') || eventString.includes('.update')) {
              eventType = 'updated';
              const updateType = this.detectUpdateType(payload);
              message = this.getUpdateMessage(updateType, payload);
            } else if (eventString.includes('delete') || eventString.includes('.delete')) {
              eventType = 'deleted';
              message = 'Appointment deleted';
            }
            
            // Call the callback with processed data
            const processedEvent = {
              type: eventType,
              appointment: payload,
              updateType: eventType === 'updated' ? this.detectUpdateType(payload) : null,
              message: message,
              timestamp: response.timestamp || Date.now()
            };
            
            console.log('Calling callback with processed event:', processedEvent);
            callback(processedEvent);
            
          } catch (eventError) {
            console.error('Error processing appointment realtime event:', eventError);
            console.error('Event data that caused error:', { events, payload });
            
            // Call callback with error info but don't crash
            try {
              callback({
                type: 'error',
                appointment: null,
                message: 'Error processing realtime update',
                error: eventError.message
              });
            } catch (callbackError) {
              console.error('Error calling error callback:', callbackError);
            }
          }
        }
      );

      if (unsubscribe) {
        this.subscriptions.set(subscriptionKey, unsubscribe);
        console.log('Successfully subscribed to appointments');
        return subscriptionKey;
      } else {
        console.warn('Failed to create appointment subscription');
        return null;
      }
      
    } catch (error) {
      console.error('Error setting up appointment subscription:', error);
      return null;
    }
  }

  // ROBUST: Subscribe to specific appointment changes
  subscribeToAppointment(appointmentId, callback) {
    if (this.isDestroyed) {
      console.warn('AppointmentManager is destroyed, cannot create new subscriptions');
      return null;
    }

    try {
      const subscriptionKey = `appointment_${appointmentId}_${Date.now()}`;
      
      if (this.subscriptions.has(subscriptionKey)) {
        this.unsubscribe(subscriptionKey);
      }

      console.log('Creating specific appointment subscription:', appointmentId);

      const unsubscribe = RealtimeService.subscribeToDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId,
        (response) => {
          if (this.isDestroyed) {
            return;
          }

          try {
            console.log('Specific appointment update:', response);
            
            const { events, payload } = response;
            
            if (events && Array.isArray(events) && events.length > 0) {
              const eventString = events.join(' ').toLowerCase();
              const updateType = this.detectUpdateType(payload);
              
              callback({
                type: eventString.includes('update') ? 'updated' : 'general',
                appointment: payload,
                updateType: updateType,
                message: this.getUpdateMessage(updateType, payload),
                timestamp: response.timestamp || Date.now()
              });
            }
          } catch (eventError) {
            console.error('Error processing specific appointment event:', eventError);
            
            try {
              callback({
                type: 'error',
                appointment: null,
                message: 'Error processing appointment update',
                error: eventError.message
              });
            } catch (callbackError) {
              console.error('Error calling appointment error callback:', callbackError);
            }
          }
        }
      );

      if (unsubscribe) {
        this.subscriptions.set(subscriptionKey, unsubscribe);
        console.log('Successfully subscribed to appointment:', appointmentId);
        return subscriptionKey;
      }
      
      return null;
    } catch (error) {
      console.error('Error subscribing to specific appointment:', error);
      return null;
    }
  }

  // Detect what type of update occurred
  detectUpdateType(appointment) {
    if (!appointment) return 'general_update';
    
    try {
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

  // Get user-friendly message for updates
  getUpdateMessage(updateType, appointment) {
    try {
      if (!appointment) return 'Appointment updated';
      
      const dateStr = appointment.date || 'Unknown date';
      const timeStr = appointment.time_slot || 'Unknown time';
      
      switch (updateType) {
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

  // Enhanced cancellation with detailed status tracking
  async cancelAppointment(appointmentId, reason = '', cancelledBy = 'patient') {
    try {
      if (!appointmentId) {
        return { success: false, error: 'Appointment ID is required' };
      }

      // First check if appointment can be cancelled
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

      // Only include fields that exist in your database schema
      const updateData = {
        status: APPOINTMENT_STATUS.CANCELLED,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        cancelled_by: cancelledBy
        // Removed original_status since it doesn't exist in your database
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

  // Cleanup method
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
    
    console.log(`Successfully cleaned up ${cleanupCount} subscriptions`);
  }

  // Unsubscribe method
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
}

// Create and export singleton instance
export const appointmentManager = new EnhancedAppointmentManager();