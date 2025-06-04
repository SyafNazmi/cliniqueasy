// service/appointmentUtils.js with comprehensive status management
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
  }

  // Subscribe to real-time appointment updates with enhanced filtering
  subscribeToAppointments(callback, options = {}) {
    try {
      const subscriptionKey = JSON.stringify(options);
      
      if (this.subscriptions.has(subscriptionKey)) {
        this.unsubscribe(subscriptionKey);
      }

      const subscription = RealtimeService.subscribeToCollection(
        COLLECTIONS.APPOINTMENTS,
        (response) => {
          console.log('Real-time appointment update:', response);
          
          const { events, payload } = response;
          
          // Enhanced event handling with status tracking
          if (events.includes('databases.*.collections.*.documents.*.create')) {
            callback({ 
              type: 'created', 
              appointment: payload,
              message: `New appointment created: ${payload.status}`
            });
          } else if (events.includes('databases.*.collections.*.documents.*.update')) {
            // Detect what was updated
            const updateType = this.detectUpdateType(payload);
            callback({ 
              type: 'updated', 
              appointment: payload,
              updateType: updateType,
              message: this.getUpdateMessage(updateType, payload)
            });
          } else if (events.includes('databases.*.collections.*.documents.*.delete')) {
            callback({ 
              type: 'deleted', 
              appointment: payload,
              message: 'Appointment deleted'
            });
          }
        }
      );

      this.subscriptions.set(subscriptionKey, subscription);
      return subscriptionKey;
    } catch (error) {
      console.error('Error subscribing to appointments:', error);
      throw error;
    }
  }

  // Detect what type of update occurred
  detectUpdateType(appointment) {
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
  }

  // Get user-friendly message for updates
  getUpdateMessage(updateType, appointment) {
    switch (updateType) {
      case 'cancelled':
        return `Appointment cancelled: ${appointment.date} at ${appointment.time_slot}`;
      case 'rescheduled':
        return `Appointment rescheduled to: ${appointment.date} at ${appointment.time_slot}`;
      case 'confirmed':
        return `Appointment confirmed: ${appointment.date} at ${appointment.time_slot}`;
      case 'completed':
        return `Appointment completed: ${appointment.date} at ${appointment.time_slot}`;
      default:
        return 'Appointment updated';
    }
  }

  async getAppointment(appointmentId) {
    try {
      console.log('📖 Getting appointment:', appointmentId);
      
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
      // First check if appointment can be cancelled
      const currentAppointment = await DatabaseService.getDocument(
        COLLECTIONS.APPOINTMENTS, 
        appointmentId
      );

      if (currentAppointment.status === APPOINTMENT_STATUS.CANCELLED) {
        return { success: false, error: 'Appointment is already cancelled' };
      }

      if (currentAppointment.status === APPOINTMENT_STATUS.COMPLETED) {
        return { success: false, error: 'Cannot cancel a completed appointment' };
      }

      // Check if it's too late to cancel (optional business rule)
      const appointmentDate = this.parseAppointmentDate(currentAppointment.date, currentAppointment.time_slot);
      const now = new Date();
      const timeDiff = appointmentDate.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 3600);

      // Example: Cannot cancel within 2 hours of appointment (adjust as needed)
      if (hoursDiff < 2 && hoursDiff > 0) {
        return { 
          success: false, 
          error: 'Cannot cancel appointment within 2 hours of scheduled time' 
        };
      }

      const updateData = {
        status: APPOINTMENT_STATUS.CANCELLED,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        cancelled_by: cancelledBy,
        // Keep original appointment data for reference
        original_status: currentAppointment.status
      };

      const result = await DatabaseService.updateDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId,
        updateData
      );
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      return { success: false, error: error.message };
    }
  }

  // Enhanced rescheduling with status management
  async rescheduleAppointment(appointmentId, newDate, newTimeSlot, reason = '') {
    try {
      // Get current appointment
      const currentAppointment = await DatabaseService.getDocument(
        COLLECTIONS.APPOINTMENTS, 
        appointmentId
      );
      
      // Validate appointment can be rescheduled
      if (currentAppointment.status === APPOINTMENT_STATUS.CANCELLED) {
        return { success: false, error: 'Cannot reschedule a cancelled appointment' };
      }

      if (currentAppointment.status === APPOINTMENT_STATUS.COMPLETED) {
        return { success: false, error: 'Cannot reschedule a completed appointment' };
      }
      
      // Check new slot availability
      const isAvailable = await this.checkSlotAvailability(
        currentAppointment.doctor_id, 
        newDate, 
        newTimeSlot, 
        appointmentId
      );
      
      if (!isAvailable) {
        return { 
          success: false, 
          error: 'The selected time slot is not available' 
        };
      }

      // Prepare update data
      const formattedNewDate = this.formatDateForDisplay(newDate);
      const updateData = {
        // Update to new date/time
        date: formattedNewDate,
        time_slot: newTimeSlot,
        
        // Track rescheduling history
        status: APPOINTMENT_STATUS.RESCHEDULED,
        rescheduled_at: new Date().toISOString(),
        reschedule_reason: reason,
        
        // Keep original appointment data
        original_date: currentAppointment.original_date || currentAppointment.date,
        original_time_slot: currentAppointment.original_time_slot || currentAppointment.time_slot,
        original_status: currentAppointment.original_status || currentAppointment.status,
        
        // Track reschedule count
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
      return { success: false, error: error.message };
    }
  }

  // Confirm appointment (useful for clinics)
  async confirmAppointment(appointmentId, confirmedBy = 'clinic') {
    try {
      const result = await DatabaseService.updateDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId,
        {
          status: APPOINTMENT_STATUS.CONFIRMED,
          confirmed_at: new Date().toISOString(),
          confirmed_by: confirmedBy
        }
      );
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Error confirming appointment:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark appointment as completed
  async completeAppointment(appointmentId, notes = '', hasPrescription = false) {
    try {
      const result = await DatabaseService.updateDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId,
        {
          status: APPOINTMENT_STATUS.COMPLETED,
          completed_at: new Date().toISOString(),
          completion_notes: notes,
          has_prescription: hasPrescription
        }
      );
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Error completing appointment:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark as no-show
  async markNoShow(appointmentId, reason = '') {
    try {
      const result = await DatabaseService.updateDocument(
        COLLECTIONS.APPOINTMENTS,
        appointmentId,
        {
          status: APPOINTMENT_STATUS.NO_SHOW,
          no_show_at: new Date().toISOString(),
          no_show_reason: reason
        }
      );
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Error marking no-show:', error);
      return { success: false, error: error.message };
    }
  }

  // Enhanced slot availability check with real-time updates
  async checkSlotAvailability(doctorId, date, timeSlot, excludeAppointmentId = null) {
    try {
      const formattedDate = this.formatDateForDisplay(date);
      
      const queries = [
        Query.equal('doctor_id', doctorId),
        Query.equal('date', formattedDate),
        Query.equal('time_slot', timeSlot),
        Query.notEqual('status', APPOINTMENT_STATUS.CANCELLED) // Only exclude cancelled appointments
      ];

      if (excludeAppointmentId) {
        queries.push(Query.notEqual('$id', excludeAppointmentId));
      }
      
      const response = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS,
        queries,
        1
      );
      
      return response.documents.length === 0;
    } catch (error) {
      console.error('Error checking slot availability:', error);
      return false;
    }
  }

  // Get real-time booked slots for a doctor on a specific date
  async getBookedSlots(doctorId, date, excludeAppointmentId = null) {
    try {
      const formattedDate = this.formatDateForDisplay(date);
      
      const queries = [
        Query.equal('doctor_id', doctorId),
        Query.equal('date', formattedDate),
        Query.notEqual('status', APPOINTMENT_STATUS.CANCELLED)
      ];

      // Exclude current appointment when rescheduling
      if (excludeAppointmentId) {
        queries.push(Query.notEqual('$id', excludeAppointmentId));
      }
      
      const response = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS,
        queries,
        100
      );
      
      return response.documents.map(doc => doc.time_slot).filter(Boolean);
    } catch (error) {
      console.error('Error fetching booked slots:', error);
      return [];
    }
  }

  // Get appointments by status with real-time capability
  async getAppointmentsByStatus(userId, status, limit = 50) {
    try {
      const queries = [
        Query.equal('user_id', userId),
        Query.equal('status', status),
        Query.orderDesc('date')
      ];
      
      const response = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS,
        queries,
        limit
      );
      
      return response.documents;
    } catch (error) {
      console.error('Error fetching appointments by status:', error);
      return [];
    }
  }

  // Get appointment statistics
  async getAppointmentStats(userId) {
    try {
      const allAppointments = await this.getUserAppointments(userId);
      
      const stats = {
        total: allAppointments.length,
        booked: 0,
        confirmed: 0,
        rescheduled: 0,
        cancelled: 0,
        completed: 0,
        noShow: 0
      };

      allAppointments.forEach(appointment => {
        switch (appointment.status) {
          case APPOINTMENT_STATUS.BOOKED:
            stats.booked++;
            break;
          case APPOINTMENT_STATUS.CONFIRMED:
            stats.confirmed++;
            break;
          case APPOINTMENT_STATUS.RESCHEDULED:
            stats.rescheduled++;
            break;
          case APPOINTMENT_STATUS.CANCELLED:
            stats.cancelled++;
            break;
          case APPOINTMENT_STATUS.COMPLETED:
            stats.completed++;
            break;
          case APPOINTMENT_STATUS.NO_SHOW:
            stats.noShow++;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting appointment stats:', error);
      return null;
    }
  }

  // Utility method to parse appointment date and time
  parseAppointmentDate(dateString, timeSlot) {
    try {
      // Parse date like "Monday, 15 Jan 2025"
      const parts = dateString.match(/(\w+), (\d+) (\w+) (\d+)/);
      if (!parts) throw new Error('Invalid date format');
      
      const months = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const date = new Date(
        parseInt(parts[4]), // year
        months[parts[3]], // month
        parseInt(parts[2]) // day
      );

      // Parse time slot like "9:30 AM"
      const timeMatch = timeSlot.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const ampm = timeMatch[3].toUpperCase();

        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;

        date.setHours(hours, minutes, 0, 0);
      }

      return date;
    } catch (error) {
      console.error('Error parsing appointment date:', error);
      return new Date();
    }
  }

  // Format date for display
  formatDateForDisplay(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  // Get user appointments with enhanced filtering
  async getUserAppointments(userId, options = {}) {
    try {
      const queries = [Query.equal('user_id', userId)];
      
      // Add optional filters
      if (options.status) {
        queries.push(Query.equal('status', options.status));
      }
      
      if (options.doctorId) {
        queries.push(Query.equal('doctor_id', options.doctorId));
      }
      
      if (options.fromDate) {
        queries.push(Query.greaterThanEqual('date', options.fromDate));
      }
      
      if (options.toDate) {
        queries.push(Query.lessThanEqual('date', options.toDate));
      }
      
      // Default ordering
      queries.push(Query.orderDesc('created_at'));
      
      const response = await DatabaseService.listDocuments(
        COLLECTIONS.APPOINTMENTS,
        queries,
        options.limit || 100
      );
      
      return response.documents;
    } catch (error) {
      console.error('Error fetching user appointments:', error);
      return [];
    }
  }

  // Cleanup method
  cleanup() {
    this.subscriptions.forEach((subscription) => subscription());
    this.subscriptions.clear();
    this.listeners.clear();
  }

  // Unsubscribe method
  unsubscribe(subscriptionKey) {
    const subscription = this.subscriptions.get(subscriptionKey);
    if (subscription) {
      subscription();
      this.subscriptions.delete(subscriptionKey);
    }
  }
}

// Create and export singleton instance
export const appointmentManager = new EnhancedAppointmentManager();
