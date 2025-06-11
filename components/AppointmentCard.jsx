// components/AppointmentCard.jsx - ENHANCED with family member support
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doctorImages } from '../constants';

export default function AppointmentCard({ appointment, showCancelled = false, currentUserId }) {
  // If no appointment is passed, return null
  if (!appointment) return null;
  
  // Filter out cancelled appointments from upcoming schedule unless explicitly shown
  if (!showCancelled && appointment.status === 'cancelled') {
    return null;
  }
  
  // NEW: Check if this is a family booking
  const isFamilyBooking = appointment.is_family_booking || false;
  const patientName = appointment.patient_name || 'Unknown Patient';
  const isBookedByCurrentUser = appointment.user_id === currentUserId;
  
  // Format time from timeSlot (e.g., "9:00 AM" -> "09:00 - 10:00")
  const formatTimeRange = (timeSlot) => {
    if (!timeSlot) return "";
    
    // Parse the time slot (e.g., "9:00 AM")
    const timeParts = timeSlot.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeParts) return timeSlot;
    
    let hour = parseInt(timeParts[1]);
    const minute = timeParts[2];
    const period = timeParts[3].toUpperCase();
    
    // Convert to 24-hour format
    if (period === "PM" && hour < 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    
    // Format start time
    const startTime = `${hour.toString().padStart(2, '0')}:${minute}`;
    
    // Calculate end time (assuming 1 hour appointments)
    const endHour = (hour + 1) % 24;
    const endTime = `${endHour.toString().padStart(2, '0')}:${minute}`;
    
    return `${startTime} - ${endTime}`;
  };
  
  // Get day and month from appointment date
  const extractDayMonth = (dateString) => {
    if (!dateString) return { day: "", month: "" };
    
    const parts = dateString.match(/(\w+), (\d+) (\w+) (\d+)/);
    if (!parts) return { day: "", month: "" };

    return {
      dayName: parts[1].substring(0, 3), // First 3 letters of day name
      day: parts[2],
      month: parts[3],
    };
  };
  
  const { dayName, day, month } = extractDayMonth(appointment.date);
  
  // Enhanced function to get doctor image based on name
  const getImageSource = () => {
    const doctorName = appointment.doctor_name;
    
    if (!doctorName) {
      return require('../assets/images/doctor1.png'); // Default image
    }
    
    // Complete mapping of doctor names to image keys
    const doctorImageMap = {
      // Original mappings
      "John Green": "doctor1.png",
      "Leila Cameron": "doctor2.png",
      "David Livingston": "doctor3.png",
      // Additional mappings for all doctors
      "Jessica Tan": "doctor-jessica.png",
      "Michael Wong": "doctor-wong.png",
      "Sarah Johnson": "doctor-sarah.png",
      "Robert Chen": "doctor-chen.png", 
      "Emma Lee": "doctor-emma.png",
      "Ahmad Razak": "doctor-ahmad.png"
    };
    
    // Get the image key for this doctor
    const imageKey = doctorImageMap[doctorName];
    
    // If we have a mapping and the image exists in doctorImages
    if (imageKey && doctorImages[imageKey]) {
      return doctorImages[imageKey];
    }
    
    // Fallback approach - try to find a matching image by doctor's first or last name
    const lowerName = doctorName.toLowerCase();
    for (const [key, image] of Object.entries(doctorImages)) {
      // Check if image key contains part of the doctor's name
      if (key.toLowerCase().includes(lowerName.split(' ')[0]) || 
          key.toLowerCase().includes(lowerName.split(' ')[1])) {
        console.log(`Found image by name matching for ${doctorName}: ${key}`);
        return image;
      }
    }
    
    // Final fallback - debug the missing image
    console.log(`No image found for ${doctorName}, using default`);
    return require('../assets/images/doctor1.png');
  };
  
  // Determine background color based on service and status
  const getCardColor = () => {
    // If cancelled, always use grey/red color
    if (appointment.status === 'cancelled') {
      return styles.cardCancelled;
    }
    
    if (!appointment.service_name) return styles.cardDefault;
    
    const service = appointment.service_name.toLowerCase();
    if (service.includes('health check') || service.includes('preventive')) {
      return styles.cardCheckup;
    } else if (service.includes('diagnosis') || service.includes('treatment')) {
      return styles.cardDiagnosis;
    } else if (service.includes('vaccination') || service.includes('immunization')) {
      return styles.cardVaccination;
    }
    
    return styles.cardDefault;
  };

  // Get status display info
  const getStatusInfo = () => {
    const status = appointment.status?.toLowerCase();
    
    switch (status) {
      case 'cancelled':
        return { text: 'Cancelled', color: '#FF3B30' };
      case 'completed':
        return { text: 'Completed', color: '#8E8E93' };
      case 'confirmed':
        return { text: 'Confirmed', color: '#0AD476' };
      case 'pending':
        return { text: 'Pending', color: '#FF9500' };
      default:
        return { text: 'Booked', color: '#0AD476' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={[styles.card, getCardColor()]}>
      {/* Date badge */}
      <View style={styles.dateBadge}>
        <Text style={styles.dateMonth}>{month}</Text>
        <Text style={styles.dateDay}>{day}</Text>
        <Text style={styles.dateDayName}>{dayName}</Text>
      </View>
      
      <View style={styles.cardContent}>
        {/* NEW: Patient Information Header (only show if family booking or patient name differs) */}
        {(isFamilyBooking || (patientName && patientName !== 'Unknown Patient')) && (
          <View style={styles.patientHeader}>
            <View style={styles.patientInfo}>
              <Ionicons 
                name={isFamilyBooking ? "people" : "person"} 
                size={14} 
                color="rgba(255, 255, 255, 0.9)" 
              />
              <Text style={styles.patientName}>
                {isFamilyBooking ? `${patientName} (Family)` : patientName}
              </Text>
            </View>
          </View>
        )}
        
        {/* Doctor info */}
        <View style={styles.doctorRow}>
          <Image 
            source={getImageSource()} 
            style={[
              styles.doctorImage,
              appointment.status === 'cancelled' && styles.doctorImageCancelled
            ]} 
            defaultSource={require('../assets/images/doctor1.png')}
          />
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>
              Dr. {appointment.doctor_name || "Unknown"}
            </Text>
            <Text style={styles.serviceName}>
              {appointment.service_name || "Consultation"}
            </Text>
          </View>
        </View>
        
        {/* Appointment details */}
        <View style={styles.detailsContainer}>
          {/* Branch */}
          {appointment.branch_name && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={18} color="white" />
              <Text style={styles.detailText}>
                {appointment.branch_name} Branch
              </Text>
            </View>
          )}
          
          {/* Date */}
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color="white" />
            <Text style={styles.detailText}>
              {appointment.date || "Not scheduled"}
            </Text>
          </View>
          
          {/* Time */}
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={18} color="white" />
            <Text style={styles.detailText}>
              {formatTimeRange(appointment.time_slot)}
            </Text>
          </View>
          
          {/* Status */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
              <Text style={styles.statusText}>{statusInfo.text}</Text>
            </View>
            
            {/* Only show call button for non-cancelled appointments */}
            {appointment.status !== 'cancelled' && (
              <TouchableOpacity style={styles.callButton}>
                <Ionicons name="call" size={18} color="#0AD476" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  cardDefault: {
    backgroundColor: '#0AD476', // Green color for general appointments
  },
  cardCheckup: {
    backgroundColor: '#3B82F6', // Blue color for health check-ups
  },
  cardDiagnosis: {
    backgroundColor: '#8B5CF6', // Purple color for diagnosis appointments
  },
  cardVaccination: {
    backgroundColor: '#F59E0B', // Orange color for vaccinations
  },
  cardCancelled: {
    backgroundColor: '#FF3B30', // Red color for cancelled appointments
    opacity: 0.8,
  },
  dateBadge: {
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  dateMonth: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  dateDay: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  dateDayName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cardContent: {
    flex: 1,
    padding: 15,
  },
  // NEW: Patient header styles
  patientHeader: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientName: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  doctorImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  doctorImageCancelled: {
    opacity: 0.7,
  },
  doctorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  doctorName: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
  serviceName: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginTop: 2,
  },
  detailsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  callButton: {
    backgroundColor: 'white',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});