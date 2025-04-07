import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doctorImages } from '../constants';

export default function AppointmentCard({ appointment }) {
  
  // Debug the appointment data
  console.log("Appointment data:", appointment);
  
  // If no appointment is passed, return null or a placeholder
  if (!appointment) return null;

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

  const getImageSource = () => {
    
    if (appointment.doctor_name) {
      if (appointment.doctor_name === "John Green") {
        return doctorImages["doctor1.png"];
      } else if (appointment.doctor_name === "Leila Cameron") {
        return doctorImages["doctor2.png"];
      } else if (appointment.doctor_name === "David Livingston") {
        return doctorImages["doctor3.png"];
      }
    }
    // Fallback to default image
    return require('../assets/images/doctor1.png');
  };

  return (
    <View style={{ 
      backgroundColor: '#2563eb', 
      borderRadius: 15, 
      padding: 15,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image 
            // Use doctor image from your constants if available, otherwise use placeholder
            source={getImageSource()} 
            style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'white' }} 
          />

          <View style={{ marginLeft: 15 }}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
              Dr. {appointment.doctor_name || "Unknown"}
            </Text>
            <Text style={{ color: 'white', opacity: 0.8 }}>
              {appointment.service_name || "Consultation"}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={{ 
          backgroundColor: 'white', 
          width: 40, 
          height: 40, 
          borderRadius: 20, 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <Ionicons name="call" size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>
      
      <View style={{ 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        borderRadius: 10, 
        padding: 12, 
        marginTop: 15, 
        flexDirection: 'row', 
        justifyContent: 'space-between' 
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="calendar-outline" size={20} color="white" />
          <Text style={{ color: 'white', marginLeft: 10 }}>
            {appointment.date || "Not scheduled"}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="time-outline" size={20} color="white" />
          <Text style={{ color: 'white', marginLeft: 10 }}>
            {formatTimeRange(appointment.time_slot)}
          </Text>
        </View>
      </View>
    </View>
  );
}