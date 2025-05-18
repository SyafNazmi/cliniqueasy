// components/QRScannerModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Modal, 
  TextInput, 
  ActivityIndicator,
  ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { processPrescriptionQR } from '../service/PrescriptionScanner';
import { Camera } from 'expo-camera';

// Start with a simple working version
const QRScannerModal = ({ visible, onClose, onScanSuccess }) => {
  const [qrInput, setQRInput] = useState('');
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(true); // Start with manual entry 

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (error) {
        console.error('Camera permission error:', error);
        setHasPermission(false);
      }
    })();
  }, []);
  
  // Add this handler function:
  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || loading) return;
    setScanned(true);
    
    try {
      console.log('Scanned QR code:', data);
      
      setLoading(true);
      const prescriptionMeds = await processPrescriptionQR(data);
      
      if (prescriptionMeds && prescriptionMeds.length > 0) {
        onScanSuccess(prescriptionMeds[0]);
      } else {
        throw new Error('No medication data found');
      }
    } catch (error) {
      console.error('Error processing scanned QR code:', error);
      Alert.alert('Error', 'Failed to process QR code');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle manually entered QR code
  const handleManualSubmit = async () => {
    if (!qrInput.trim()) {
      Alert.alert('Error', 'Please enter a valid QR code');
      return;
    }
    
    try {
      setLoading(true);
      
      // Process the QR code
      const prescriptionMeds = await processPrescriptionQR(qrInput);
      
      if (prescriptionMeds && prescriptionMeds.length > 0) {
        onScanSuccess(prescriptionMeds[0]);
      } else {
        throw new Error('No medication data found');
      }
    } catch (error) {
      console.error('QR scan error:', error);
      Alert.alert(
        'Error',
        'Unable to process prescription data. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };
  
  // Process demo QR codes
  const handleQuickScan = async (demoType) => {
    try {
      setLoading(true);
      const demoQR = `DEMO:${demoType}:APT12345`;
      
      // Process the QR code
      const prescriptionMeds = await processPrescriptionQR(demoQR);
      
      if (prescriptionMeds && prescriptionMeds.length > 0) {
        onScanSuccess(prescriptionMeds[0]);
      } else {
        throw new Error('No medication data found');
      }
    } catch (error) {
      console.error('Demo scan error:', error);
      Alert.alert(
        'Error',
        'Demo scan failed. Please try manual entry.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Scan Prescription QR</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1a8e2d" />
              <Text style={styles.loadingText}>Processing prescription...</Text>
            </View>
          ) : showManualEntry ? (
            <View style={styles.manualEntryContainer}>
              <Text style={styles.enterManuallyText}>Enter QR Code manually:</Text>
              <TextInput
                style={styles.qrInput}
                placeholder="APPT:12345:APT12345"
                value={qrInput}
                onChangeText={setQRInput}
                placeholderTextColor="#999"
              />
              
              <TouchableOpacity style={styles.scanButton} onPress={handleManualSubmit}>
                <LinearGradient
                  colors={["#1a8e2d", "#146922"]}
                  style={styles.scanButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.scanButtonText}>Submit QR Code</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.toggleButton}
                onPress={() => setShowManualEntry(false)}
              >
                <Ionicons name="camera-outline" size={20} color="#1a8e2d" />
                <Text style={styles.toggleButtonText}>Use Camera Scanner</Text>
              </TouchableOpacity>
              
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <Text style={styles.demoTitle}>Try Demo Prescriptions:</Text>
              <View style={styles.demoButtonsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => handleQuickScan('blood_pressure')}
                  >
                    <Text style={styles.demoButtonText}>Blood Pressure</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => handleQuickScan('diabetes')}
                  >
                    <Text style={styles.demoButtonText}>Diabetes</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => handleQuickScan('infection')}
                  >
                    <Text style={styles.demoButtonText}>Infection</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => handleQuickScan('cholesterol')}
                  >
                    <Text style={styles.demoButtonText}>Cholesterol</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          ) : (
            <>
              {hasPermission === false ? (
                <View style={styles.permissionContainer}>
                  <Text style={styles.permissionText}>
                    Camera permission is required to scan QR codes. Please enable camera access in your device settings.
                  </Text>
                  <TouchableOpacity
                    style={styles.manualEntryButton}
                    onPress={() => setShowManualEntry(true)}
                  >
                    <Text style={styles.manualEntryButtonText}>Use Manual Entry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.cameraContainer}>
                  <View style={styles.cameraPlaceholder}>
                    <Text>Camera view would appear here</Text>
                    <TouchableOpacity
                      style={styles.toggleButton}
                      onPress={() => setShowManualEntry(true)}
                    >
                      <Text style={styles.toggleButtonText}>Switch to Manual Entry</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
  },
  manualEntryContainer: {
    padding: 20,
  },
  enterManuallyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  cameraContainer: {
    height: 300,
    overflow: 'hidden',
    position: 'relative',
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    padding: 20,
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  manualEntryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#1a8e2d',
    borderRadius: 10,
  },
  manualEntryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  toggleButtonText: {
    color: '#1a8e2d',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 5,
  },
  qrInput: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 15,
  },
  scanButton: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  scanButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e5e5',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#999',
    fontWeight: '500',
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  demoButtonsContainer: {
    marginBottom: 10,
  },
  demoButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
  },
  demoButtonText: {
    color: '#333',
    fontWeight: '500',
  },
});

export default QRScannerModal;