// components/AppointmentCard.jsx - FIXED VERSION with complete doctor image mapping
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doctorImages } from '../constants';

export default function AppointmentCard({ appointment, showCancelled = false, currentUserId }) {
  if (!appointment) return null;
  
  if (!showCancelled && appointment.status === 'cancelled') {
    return null;
  }
  
  const isFamilyBooking = appointment.is_family_booking || false;
  const patientName = appointment.patient_name || 'Unknown Patient';
  const isBookedByCurrentUser = appointment.user_id === currentUserId;
  
  const formatTimeRange = (timeSlot) => {
    if (!timeSlot) return "";
    
    const timeParts = timeSlot.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeParts) return timeSlot;
    
    let hour = parseInt(timeParts[1]);
    const minute = timeParts[2];
    const period = timeParts[3].toUpperCase();
    
    if (period === "PM" && hour < 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    
    const startTime = `${hour.toString().padStart(2, '0')}:${minute}`;
    const endHour = (hour + 1) % 24;
    const endTime = `${endHour.toString().padStart(2, '0')}:${minute}`;
    
    return `${startTime} - ${endTime}`;
  };
  
  const extractDayMonth = (dateString) => {
    if (!dateString) return { day: "", month: "" };
    
    const parts = dateString.match(/(\w+), (\d+) (\w+) (\d+)/);
    if (!parts) return { day: "", month: "" };

    return {
      dayName: parts[1].substring(0, 3),
      day: parts[2],
      month: parts[3],
    };
  };
  
  const { dayName, day, month } = extractDayMonth(appointment.date);
  
  const getImageSource = () => {
    const doctorName = appointment.doctor_name;
    
    if (!doctorName) {
      return require('../assets/images/doctor1.png');
    }
    
    // Clean the doctor name by removing "Dr. " prefixes
    const cleanName = doctorName.replace(/^Dr\.\s*/gi, '').trim();
    
    // COMPLETE doctor image mapping for ALL 36 doctors
    const doctorImageMap = {
      // Branch 1 doctors
      "Leila Cameron": "doctor2.png",
      "Sarah Johnson": "doctor-sarah.png", 
      "Michael Wong": "doctor-wong.png",
      
      // Branch 2 doctors
      "David Livingston": "doctor3.png",
      "Jessica Tan": "doctor-jessica.png",
      "Robert Chen": "doctor-chen.png",
      
      // Branch 3 doctors
      "John Green": "doctor1.png",
      "Emma Lee": "doctor-emma.png",
      "Ahmad Razak": "doctor-ahmad.png",
      
      // Branch 4 doctors
      "Siti Aminah": "doctor-sarah.png",
      "James Lim": "doctor1.png",
      "Hassan Ibrahim": "doctor3.png",
      
      // Branch 5 doctors
      "Fatimah Ali": "doctor2.png",
      "Rajesh Kumar": "doctor-wong.png",
      
      // Branch 6 doctors
      "Catherine Liew": "doctor-emma.png",
      "Muhammad Azlan": "doctor1.png",
      "Linda Chong": "doctor-sarah.png",
      
      // Branch 7 doctors
      "Norliza Hassan": "doctor2.png",
      "Peter Goh": "doctor3.png",
      
      // Branch 8 doctors
      "Rashid Omar": "doctor1.png",
      "Mei Ling Tan": "doctor-jessica.png",
      "Kevin Lau": "doctor-chen.png",
      
      // Branch 9 doctors
      "Zainab Mohd": "doctor-sarah.png",
      "William Chin": "doctor-wong.png",
      
      // Branch 10 doctors
      "Richard Teo": "doctor3.png",
      "Priya Sharma": "doctor-emma.png",
      "Anthony Wong": "doctor1.png",
      "Shalini Krishnan": "doctor-jessica.png",
      
      // Branch 11 doctors
      "Marina Abdullah": "doctor2.png",
      "Daniel Kho": "doctor-wong.png",
      "Sufiah Ismail": "doctor-sarah.png",
      
      // Branch 12 doctors
      "Benjamin Lee": "doctor1.png",
      "Alicia Fernandez": "doctor-emma.png",
      "Hafiz Rahman": "doctor3.png",
      "Grace Lim": "doctor-jessica.png",
      
      // Branch 13 doctors
      "Steven Chew": "doctor1.png",
      "Nadia Ahmad": "doctor-sarah.png",
      "Marcus Tan": "doctor3.png",
      "Farah Zainal": "doctor-chen.png",
      "Jonathan Yap": "doctor-wong.png"
    };
    
    // First try exact match with cleaned name
    const imageKey = doctorImageMap[cleanName];
    
    // if (imageKey && doctorImages[imageKey]) {
    //   console.log(`✅ Found exact match for "${cleanName}": ${imageKey}`);
    //   return doctorImages[imageKey];
    // }
    
    // Try with "Dr." prefix removed from mapping keys
    // for (const [mappedName, image] of Object.entries(doctorImageMap)) {
    //   if (mappedName.toLowerCase() === cleanName.toLowerCase()) {
    //     console.log(`✅ Found case-insensitive match for "${cleanName}": ${image}`);
    //     return doctorImages[image];
    //   }
    // }
    
    // Fallback: try matching by name parts (first or last name)
    const nameParts = cleanName.toLowerCase().split(' ');
    for (const [mappedName, image] of Object.entries(doctorImageMap)) {
      const mappedParts = mappedName.toLowerCase().split(' ');
      
      // Check if first name or last name matches
      if (nameParts.some(part => mappedParts.includes(part))) {
        console.log(`✅ Found partial match for "${cleanName}" -> "${mappedName}": ${image}`);
        return doctorImages[image];
      }
    }
    
    // Final fallback based on gender/name patterns for better assignment
    const firstNameLower = nameParts[0]?.toLowerCase() || '';
    const femaleNames = ['sarah', 'emma', 'jessica', 'leila', 'catherine', 'linda', 
                         'fatimah', 'norliza', 'mei', 'zainab', 'priya', 'shalini', 
                         'marina', 'sufiah', 'alicia', 'grace', 'nadia', 'farah', 'siti'];
    
    if (femaleNames.includes(firstNameLower)) {
      console.log(`🔄 Using female fallback for "${cleanName}"`);
      return doctorImages["doctor-sarah.png"];
    }
    
    console.log(`⚠️ No image found for "${cleanName}", using default`);
    return require('../assets/images/doctor1.png');
  };
  
  const getCardColor = () => {
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

  const getStatusInfo = () => {
    const status = appointment.status?.toLowerCase();
    
    switch (status) {
      case 'cancelled':
        return { 
          text: 'Cancelled', 
          color: '#FF3B30', 
          bgColor: '#FEF2F2',
          icon: 'close-circle'
        };
      case 'completed':
        return { 
          text: 'Completed', 
          color: '#3B82F6', 
          bgColor: '#EFF6FF',
          icon: 'checkmark-done-circle'
        };
      case 'confirmed':
        return { 
          text: 'Confirmed', 
          color: '#0AD476', 
          bgColor: '#F0FDF4',
          icon: 'checkmark-circle'
        };
      case 'pending':
        return { 
          text: 'Pending', 
          color: '#FF9500', 
          bgColor: '#FFFBEB',
          icon: 'time'
        };
      case 'rescheduled':
        return { 
          text: 'Rescheduled', 
          color: '#F59E0B', 
          bgColor: '#FFFBEB',
          icon: 'refresh-circle'
        };
      case 'no show':
        return { 
          text: 'No Show', 
          color: '#8B5CF6', 
          bgColor: '#F5F3FF',
          icon: 'alert-circle'
        };
      default:
        return { 
          text: 'Booked', 
          color: '#0AD476', 
          bgColor: '#F0FDF4',
          icon: 'calendar'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={[styles.card, getCardColor()]}>
      <View style={styles.dateBadge}>
        <Text style={styles.dateMonth}>{month}</Text>
        <Text style={styles.dateDay}>{day}</Text>
        <Text style={styles.dateDayName}>{dayName}</Text>
      </View>
      
      <View style={styles.cardContent}>
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
        
        <View style={styles.detailsContainer}>
          {appointment.branch_name && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={18} color="white" />
              <Text style={styles.detailText}>
                {appointment.branch_name} Branch
              </Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color="white" />
            <Text style={styles.detailText}>
              {appointment.date || "Not scheduled"}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={18} color="white" />
            <Text style={styles.detailText}>
              {formatTimeRange(appointment.time_slot)}
            </Text>
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
              <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.text}
              </Text>
            </View>
            
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
    backgroundColor: '#0AD476',
  },
  cardCheckup: {
    backgroundColor: '#3B82F6',
  },
  cardDiagnosis: {
    backgroundColor: '#8B5CF6',
  },
  cardVaccination: {
    backgroundColor: '#F59E0B',
  },
  cardCancelled: {
    backgroundColor: '#FF3B30',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
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