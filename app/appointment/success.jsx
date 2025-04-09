// Create a new file at app/appointment/bookingSuccess.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView } from 'react-native-web';

export default function BookingSuccessScreen() {
  const router = useRouter();
  const { appointmentId, doctorName, date, timeSlot, serviceName, branchName } = useLocalSearchParams();
  
  // Generate appointment reference code
  const referenceCode = appointmentId?.substring(0, 8).toUpperCase() || 'APT12345';

  useEffect(() => {
    return () => {
      // This ensures the booking screen is removed from history
      router.replace('/');
    };
  }, []);
  
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
    <View style={styles.container}>
      {/* Success icon */}
      <View style={styles.successIconContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#0AD476" />
      </View>
      
      <Text style={styles.title}>Booking Confirmed!</Text>
      <Text style={styles.subtitle}>Your appointment has been successfully booked</Text>
      
      {/* Appointment details */}
      <View style={styles.card}>
        <View style={styles.referenceContainer}>
          <Text style={styles.referenceLabel}>Reference Code</Text>
          <Text style={styles.referenceCode}>{referenceCode}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="person" size={20} color="#0AD476" />
          <Text style={styles.detailLabel}>Doctor:</Text>
          <Text style={styles.detailValue}>Dr. {doctorName}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="medkit" size={20} color="#0AD476" />
          <Text style={styles.detailLabel}>Service:</Text>
          <Text style={styles.detailValue}>{serviceName}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="location" size={20} color="#0AD476" />
          <Text style={styles.detailLabel}>Branch:</Text>
          <Text style={styles.detailValue}>{branchName}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={20} color="#0AD476" />
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>{date}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="time" size={20} color="#0AD476" />
          <Text style={styles.detailLabel}>Time:</Text>
          <Text style={styles.detailValue}>{timeSlot}</Text>
        </View>
        
        {/* QR Code placeholder - you can use a QR code library later */}
        <View style={styles.qrContainer}>
          {/* <View style={styles.qrPlaceholder}>
            <Text style={styles.qrPlaceholderText}>QR Code</Text>
          </View> */}
          <QRCode
            value={`APPT:${appointmentId}:${referenceCode}`}
            size={150}
            color="#000000"
            backgroundColor="#FFFFFF"
           />
          <Text style={styles.qrText}>Scan this code at the clinic</Text>
        </View>
      </View>
      
      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="calendar" size={20} color="white" />
          <Text style={styles.actionText}>Add to Calendar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-social" size={20} color="white" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={styles.doneButton}
        onPress={() => router.push('/')}
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
  },
  successIconContainer: {
    marginTop: 50,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 30,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  referenceContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  referenceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  referenceCode: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#0AD476',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4b5563',
    marginLeft: 10,
    width: 70,
  },
  detailValue: {
    fontSize: 15,
    color: '#1f2937',
    flex: 1,
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  qrPlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  qrPlaceholderText: {
    color: '#9ca3af',
    fontWeight: '500',
  },
  qrText: {
    marginTop: 10,
    color: '#6b7280',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 25,
  },
  actionButton: {
    backgroundColor: '#0AD476',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 0.48,
  },
  actionText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  doneButton: {
    marginTop: 20,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  doneButtonText: {
    color: '#4b5563',
    fontWeight: '600',
    fontSize: 16,
  },
});