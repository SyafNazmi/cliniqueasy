// components/QRScannerModal.jsx - Fixed Version with User Confirmation
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
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { processPrescriptionQR } from '../service/PrescriptionScanner';
import { CameraView, Camera } from 'expo-camera';

const QRScannerModal = ({ visible, onClose, onScanSuccess }) => {
  const [qrInput, setQRInput] = useState('');
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(true);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [facing, setFacing] = useState('back');
  
  // Initialize the camera permissions
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        console.log("Camera permission status:", status);
        setHasPermission(status === 'granted');
        setCameraAvailable(true);
        
        if (status !== 'granted') {
          setErrorMsg("Camera permission was denied. Please enable it in settings.");
        }
      } catch (error) {
        console.error("Error initializing camera:", error);
        setErrorMsg(`Error accessing camera: ${error.message}`);
        setCameraAvailable(false);
      }
    })();
  }, []);

  // Handle barcode scanning
  const handleBarCodeScanned = ({ type, data }) => {
    console.log("Barcode scanned:", type, data);
    
    if (scanned || loading) return;
    
    setScanned(true);
    setLoading(true);
    
    processQRCode(data);
  };

  // Handle manually entered QR code
  const handleManualSubmit = async () => {
    if (!qrInput.trim()) {
      Alert.alert('Error', 'Please enter a valid QR code');
      return;
    }
    
    setLoading(true);
    processQRCode(qrInput);
  };
  
  // Process QR code and handle multiple medications with user confirmation
  const processQRCode = async (qrData) => {
    try {
      console.log('Processing QR code:', qrData);
      
      const prescriptionMeds = await processPrescriptionQR(qrData);
      
      if (prescriptionMeds && prescriptionMeds.length > 0) {
        console.log(`Found ${prescriptionMeds.length} medications`);
        
        // Close the modal first
        setLoading(false);
        
        // Show confirmation dialog with medication details
        showMedicationConfirmation(prescriptionMeds);
        
      } else {
        throw new Error('No medication data found');
      }
    } catch (error) {
      console.error('QR scan error:', error);
      Alert.alert(
        'Error',
        'Unable to process prescription data. Please try again.',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
      setLoading(false);
    }
  };

  // Show detailed medication confirmation dialog
  const showMedicationConfirmation = (medications) => {
    const medicationList = medications.map((med, index) => 
      `${index + 1}. ${med.name} - ${med.dosage} (${med.frequencies})`
    ).join('\n');

    const message = medications.length > 1 
      ? `Found ${medications.length} medications:\n\n${medicationList}\n\nWhat would you like to do?`
      : `Found medication:\n\n${medicationList}\n\nAdd this medication?`;

    if (medications.length > 1) {
      // Multiple medications - show streamlined options
      Alert.alert(
        "Multiple Medications Found",
        message,
        [
          {
            text: "Add All",
            onPress: () => {
              onScanSuccess({
                medications: medications,
                totalCount: medications.length,
                action: 'add_all'
              });
              onClose();
            }
          },
          {
            text: "Review & Edit",
            onPress: () => {
              onScanSuccess({
                medications: medications,
                totalCount: medications.length,
                action: 'review_edit'
              });
              onClose();
            }
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              // Don't close the modal, let user try again
              setLoading(false);
              setScanned(false);
            }
          }
        ]
      );
    } else {
      // Single medication - show simple confirmation
      Alert.alert(
        "Medication Found",
        message,
        [
          {
            text: "Add Medication",
            onPress: () => {
              onScanSuccess({
                medications: medications,
                totalCount: 1,
                action: 'add_single'
              });
              onClose();
            }
          },
          {
            text: "Review & Edit",
            onPress: () => {
              onScanSuccess({
                medications: medications,
                totalCount: 1,
                action: 'review_edit'
              });
              onClose();
            }
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              setLoading(false);
              setScanned(false);
            }
          }
        ]
      );
    }
  };

  // Process demo QR codes with confirmation
  const handleQuickScan = async (demoType) => {
    try {
      setLoading(true);
      const demoQR = `DEMO:${demoType}:APT12345`;
      
      await processQRCode(demoQR);
    } catch (error) {
      console.error('Demo scan error:', error);
      Alert.alert(
        'Error',
        'Demo scan failed. Please try manual entry.',
        [{ text: 'OK' }]
      );
      setLoading(false);
    }
  };

  // Reset scanning state when exiting camera mode
  const handleToggleManualEntry = (showManual) => {
    setScanned(false);
    setLoading(false);
    setShowManualEntry(showManual);
  };

  // Toggle camera facing between front and back
  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  // Conditionally render the camera
  const renderCamera = () => {
    if (!cameraAvailable) {
      return (
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.placeholderText}>
            Camera is not available. Please use manual entry instead.
          </Text>
          <TouchableOpacity 
            style={styles.toggleButton}
            onPress={() => handleToggleManualEntry(true)}
          >
            <Text style={styles.toggleButtonText}>Switch to Manual Entry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
        <View style={styles.scanOverlay}>
          <View style={styles.scannerFrame}>
            <View style={styles.scanLine} />
          </View>
          <Text style={styles.scanInstructions}>
            Position QR code within the frame
          </Text>
          {scanned && (
            <TouchableOpacity
              style={styles.scanAgainButton}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.scanAgainButtonText}>Tap to Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.cameraControls}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => handleToggleManualEntry(true)}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.flipButton}
            onPress={toggleCameraFacing}
          >
            <Ionicons name="camera-reverse" size={24} color="white" />
            <Text style={styles.flipButtonText}>Flip</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
              <Text style={styles.loadingSubText}>Analyzing medications...</Text>
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
              
              {cameraAvailable && (
                <TouchableOpacity 
                  style={styles.toggleButton}
                  onPress={() => handleToggleManualEntry(false)}
                >
                  <Ionicons name="camera-outline" size={20} color="#1a8e2d" />
                  <Text style={styles.toggleButtonText}>Use Camera Scanner</Text>
                </TouchableOpacity>
              )}
              
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR TRY DEMO</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <Text style={styles.demoTitle}>Demo Prescriptions:</Text>
              <View style={styles.demoButtonsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => handleQuickScan('blood_pressure')}
                  >
                    <Text style={styles.demoButtonText}>Blood Pressure (2 meds)</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => handleQuickScan('diabetes')}
                  >
                    <Text style={styles.demoButtonText}>Diabetes (2 meds)</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => handleQuickScan('infection')}
                  >
                    <Text style={styles.demoButtonText}>Infection (2 meds)</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => handleQuickScan('cholesterol')}
                  >
                    <Text style={styles.demoButtonText}>Cholesterol (2 meds)</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
              
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#1a8e2d" />
                <Text style={styles.infoText}>
                  You'll be able to review and edit medication times before adding
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={onClose}
              >
                <Text style={styles.skipButtonText}>Skip and add manually</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {hasPermission === null ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#1a8e2d" />
                  <Text style={styles.loadingText}>Requesting camera permission...</Text>
                </View>
              ) : hasPermission === false ? (
                <View style={styles.permissionContainer}>
                  <Ionicons name="alert-circle-outline" size={48} color="#e74c3c" style={styles.permissionIcon} />
                  <Text style={styles.permissionText}>
                    {errorMsg || "Camera permission is required to scan QR codes. Please enable camera access in your device settings."}
                  </Text>
                  <TouchableOpacity
                    style={styles.manualEntryButton}
                    onPress={() => handleToggleManualEntry(true)}
                  >
                    <Text style={styles.manualEntryButtonText}>Use Manual Entry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                renderCamera()
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '90%',
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
    textAlign: 'center',
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 15,
  },
  toggleButtonText: {
    color: '#1a8e2d',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 5,
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
    marginBottom: 15,
  },
  demoButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  demoButtonText: {
    color: '#333',
    fontWeight: '500',
    fontSize: 14,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7e9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#1a8e2d20',
  },
  infoText: {
    fontSize: 12,
    color: '#1a8e2d',
    marginLeft: 8,
    flex: 1,
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  // Camera Related Styles
  cameraContainer: {
    height: height * 0.6,
    maxHeight: 500,
    width: '100%',
    position: 'relative',
  },
  cameraPlaceholder: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scannerFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'transparent',
    position: 'relative',
    borderRadius: 10,
  },
  scanLine: {
    height: 2,
    width: '100%',
    backgroundColor: '#1a8e2d',
    position: 'absolute',
    top: '50%',
    opacity: 0.8,
  },
  scanInstructions: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  scanAgainButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: 'rgba(26, 142, 45, 0.8)',
    borderRadius: 20,
  },
  scanAgainButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
  },
  backButton: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 10,
  },
  backButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  flipButton: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 10,
  },
  flipButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  permissionContainer: {
    padding: 20,
    alignItems: 'center',
  },
  permissionIcon: {
    marginBottom: 15,
  },
  permissionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
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
});

export default QRScannerModal;