// components/QRScannerModal.jsx - Fixed Version with Debouncing

import React, { useState, useEffect, useRef } from 'react';
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
  
  // Add refs for debouncing and preventing multiple scans
  const lastScannedData = useRef(null);
  const lastScannedTime = useRef(0);
  const processingRef = useRef(false);
  const scanTimeoutRef = useRef(null);
  
  // Constants for debouncing
  const SCAN_DEBOUNCE_TIME = 2000; // 2 seconds
  const SAME_QR_COOLDOWN = 5000; // 5 seconds for same QR code
  
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

  // Reset scanning state when modal visibility changes
  useEffect(() => {
    if (visible) {
      resetScanningState();
    } else {
      // Clear any pending timeouts when modal is closed
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    }
  }, [visible]);

  // Reset all scanning related state
  const resetScanningState = () => {
    setScanned(false);
    setLoading(false);
    processingRef.current = false;
    lastScannedData.current = null;
    lastScannedTime.current = 0;
    
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  };

    // Enhanced barcode scanning with debouncing and duplicate prevention
    const handleBarCodeScanned = ({ type, data }) => {
    const currentTime = Date.now();
    
    // Prevent multiple processing
    if (processingRef.current || loading || scanned) {
      console.log("Scan ignored: already processing");
      return;
    }
    
    // Check if it's the same QR code scanned recently
    if (lastScannedData.current === data) {
      const timeSinceLastScan = currentTime - lastScannedTime.current;
      if (timeSinceLastScan < SAME_QR_COOLDOWN) {
        console.log(`Same QR code scanned too recently (${timeSinceLastScan}ms ago). Ignoring.`);
        return;
      }
    }
    
    // Check general debounce timing
    if (currentTime - lastScannedTime.current < SCAN_DEBOUNCE_TIME) {
      console.log("Scan ignored: debounce period active");
      return;
    }
    
    console.log("Barcode scanned:", type, data);
    
    // Set processing flags immediately
    processingRef.current = true;
    lastScannedData.current = data;
    lastScannedTime.current = currentTime;
    
    // Update UI state
    setScanned(true);
    setLoading(true);
    
    // Add a small delay to ensure state updates take effect
    scanTimeoutRef.current = setTimeout(() => {
      processQRCode(data);
    }, 100);
  };

  // Handle manually entered QR code
  const handleManualSubmit = async () => {
    if (!qrInput.trim()) {
      Alert.alert('Error', 'Please enter a valid QR code');
      return;
    }
    
    if (processingRef.current || loading) {
      console.log("Manual submit ignored: already processing");
      return;
    }
    
    processingRef.current = true;
    setLoading(true);
    
    // Small delay to ensure state updates
    setTimeout(() => {
      processQRCode(qrInput);
    }, 100);
  };
  
  // Process QR code and handle multiple medications with user confirmation
  const processQRCode = async (qrData) => {
  try {
    console.log('QRScannerModal: Processing QR code:', qrData);
    
    // Double-check we're not already processing
    if (!processingRef.current) {
      console.log("Process QR code called but processing flag is false. Aborting.");
      return;
    }
    
    // 🔒 Use secure scanner (this will handle all security checks)
    const prescriptionMeds = await processPrescriptionQR(qrData);
    
    if (prescriptionMeds && prescriptionMeds.length > 0) {
      console.log(`QRScannerModal: Found ${prescriptionMeds.length} medications`);
      showMedicationConfirmation(prescriptionMeds, qrData);
    } else {
      throw new Error('No medication data found');
    }
  } catch (error) {
    console.error('QRScannerModal: QR scan error:', error);
    
    // 🔒 Enhanced error handling for security issues
    let errorTitle = 'Scan Failed';
    let errorMessage = error.message;
    let errorIcon = 'alert-circle-outline';
    
    // Categorize errors for better user experience
    if (error.message.includes('Access denied') || error.message.includes('another patient')) {
      errorTitle = '🚫 Access Denied';
      errorIcon = 'shield-outline';
      errorMessage = 'This prescription belongs to another patient. You can only scan your own prescriptions.';
    } else if (error.message.includes('Invalid prescription code') || error.message.includes('Invalid QR code format')) {
      errorTitle = '❌ Invalid Code';
      errorIcon = 'scan-outline';
      errorMessage = 'The QR code appears to be invalid or damaged. Please ask your doctor for a new prescription QR code.';
    } else if (error.message.includes('log in') || error.message.includes('not authenticated')) {
      errorTitle = '🔐 Login Required';
      errorIcon = 'log-in-outline';
      errorMessage = 'Please log in to scan prescriptions.';
    } else if (error.message.includes('Appointment not found')) {
      errorTitle = '📅 Appointment Not Found';
      errorIcon = 'calendar-outline';
      errorMessage = 'The appointment associated with this prescription could not be found.';
    } else if (error.message.includes('No prescription found')) {
      errorTitle = '💊 No Prescription';
      errorIcon = 'medical-outline';
      errorMessage = 'No prescription was found for this appointment.';
    }
    
    Alert.alert(
      errorTitle,
      errorMessage,
      [
        { 
          text: 'Try Again', 
          onPress: () => resetScanningState()
        },
        {
          text: 'Use Manual Entry',
          onPress: () => {
            resetScanningState();
            setShowManualEntry(true);
            }
          }
        ]
      );
    }
  };

  // Also add this helper function to show security status in the modal:
  const renderSecurityBadge = () => (
    <View style={styles.securityBadge}>
      <Ionicons name="shield-checkmark" size={16} color="#1a8e2d" />
      <Text style={styles.securityText}>Secure Prescription Scanner</Text>
    </View>
  );

  // 🚨 FIX: Enhanced medication confirmation with proper data passing
  const showMedicationConfirmation = (medications, originalQrData) => {
  setLoading(false);
  
  // 🆕 NEW: Extract and display patient assignment clearly
  const patientInfo = medications[0] ? {
    patientId: medications[0].patientId,
    patientName: medications[0].patientName,
    isFamilyMember: medications[0].isFamilyMember
  } : null;
  
  console.log('🔍 QRScannerModal: Patient assignment preserved:', patientInfo);
  
  const medicationList = medications.map((med, index) => 
    `${index + 1}. ${med.name} - ${med.dosage} (${med.frequencies})`
  ).join('\n');

  // 🆕 ENHANCED: Show clear patient assignment with reassignment option
  const patientMessage = patientInfo 
    ? `📋 Assigned to: ${patientInfo.patientName}${patientInfo.isFamilyMember ? ' (Family Member)' : ' (You)'}\n\n`
    : '';

  const message = medications.length > 1 
    ? `Found ${medications.length} medications:\n\n${patientMessage}${medicationList}\n\nPatient assignment was automatically determined from your appointment.`
    : `Found medication:\n\n${patientMessage}${medicationList}\n\nPatient assignment was automatically determined from your appointment.`;

  const handleUserChoice = (action) => {
    processingRef.current = false;
    
    const scanResult = {
      type: 'prescription_scan',
      action: action,
      medications: medications,
      totalCount: medications.length,
      patientInfo: patientInfo,
      originalQrData: originalQrData,
      timestamp: new Date().toISOString()
    };
    
    console.log('🔍 QRScannerModal: Final scan result:', scanResult);
    onScanSuccess(scanResult);
    onClose();
  };

  // 🆕 NEW: Add reassignment option
  const showReassignmentOptions = () => {
    // This will trigger the parent component to show patient selector
    const scanResult = {
      type: 'prescription_scan',
      action: 'show_patient_selector',
      medications: medications,
      totalCount: medications.length,
      patientInfo: patientInfo,
      originalQrData: originalQrData,
      timestamp: new Date().toISOString()
    };
    
    processingRef.current = false;
    onScanSuccess(scanResult);
    onClose();
  };

  const handleCancel = () => {
    resetScanningState();
  };

  if (medications.length > 1) {
    // Multiple medications - enhanced options
    Alert.alert(
      "✅ Prescription Scanned Successfully",
      message,
      [
        {
          text: "✅ Correct - Add All Medications",
          onPress: () => handleUserChoice('add_all')
        },
        {
          text: "👤 Reassign to Different Patient",
          onPress: showReassignmentOptions
        },
        {
          text: "📝 Review & Edit Individual",
          onPress: () => handleUserChoice('review_edit')
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: handleCancel
        }
      ]
    );
  } else {
    // Single medication - enhanced options
    Alert.alert(
      "✅ Medication Found",
      message,
      [
        {
          text: "✅ Correct - Add Medication",
          onPress: () => handleUserChoice('add_single')
        },
        {
          text: "👤 Reassign to Different Patient", 
          onPress: showReassignmentOptions
        },
        {
          text: "📝 Review & Edit",
          onPress: () => handleUserChoice('review_edit')
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: handleCancel
        }
      ]
    );
  }
};


  // Process demo QR codes with confirmation
  const handleQuickScan = async (demoType) => {
    if (processingRef.current || loading) {
      console.log("Demo scan ignored: already processing");
      return;
    }
    
    try {
      processingRef.current = true;
      setLoading(true);
      const demoQR = `DEMO:${demoType}:APT12345`;
      
      console.log('QRScannerModal: Processing demo QR:', demoQR);
      
      // Small delay to ensure state updates
      setTimeout(() => {
        processQRCode(demoQR);
      }, 100);
    } catch (error) {
      console.error('QRScannerModal: Demo scan error:', error);
      Alert.alert(
        'Error',
        'Demo scan failed. Please try manual entry.',
        [{ 
          text: 'OK',
          onPress: () => resetScanningState()
        }]
      );
    }
  };

  // Reset scanning state when exiting camera mode
  const handleToggleManualEntry = (showManual) => {
    resetScanningState();
    setShowManualEntry(showManual);
  };

  // Toggle camera facing between front and back
  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  // Enhanced scan again functionality
  const handleScanAgain = () => {
    console.log("Scan again pressed");
    resetScanningState();
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
          {scanned && !loading && (
            <TouchableOpacity
              style={styles.scanAgainButton}
              onPress={handleScanAgain}
            >
              <Text style={styles.scanAgainButtonText}>Tap to Scan Again</Text>
            </TouchableOpacity>
          )}
          {loading && (
            <View style={styles.processingIndicator}>
              <ActivityIndicator size="small" color="white" />
              <Text style={styles.processingText}>Processing...</Text>
            </View>
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
            <View>
               <Text style={styles.modalTitle}>Scan Prescription QR</Text>
               {renderSecurityBadge()}
            </View>
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
              
              <TouchableOpacity 
                style={[styles.scanButton, (loading || processingRef.current) && styles.disabledButton]} 
                onPress={handleManualSubmit}
                disabled={loading || processingRef.current}
              >
                <LinearGradient
                  colors={["#1a8e2d", "#146922"]}
                  style={styles.scanButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.scanButtonText}>
                    {loading || processingRef.current ? "Processing..." : "Submit QR Code"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              
              {cameraAvailable && !loading && !processingRef.current && (
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
                    style={[styles.demoButton, (loading || processingRef.current) && styles.disabledButton]}
                    onPress={() => handleQuickScan('blood_pressure')}
                    disabled={loading || processingRef.current}
                  >
                    <Text style={styles.demoButtonText}>Blood Pressure (2 meds)</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.demoButton, (loading || processingRef.current) && styles.disabledButton]}
                    onPress={() => handleQuickScan('diabetes')}
                    disabled={loading || processingRef.current}
                  >
                    <Text style={styles.demoButtonText}>Diabetes (2 meds)</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.demoButton, (loading || processingRef.current) && styles.disabledButton]}
                    onPress={() => handleQuickScan('infection')}
                    disabled={loading || processingRef.current}
                  >
                    <Text style={styles.demoButtonText}>Infection (2 meds)</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.demoButton, (loading || processingRef.current) && styles.disabledButton]}
                    onPress={() => handleQuickScan('cholesterol')}
                    disabled={loading || processingRef.current}
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
    alignItems: 'flex-start',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
   // Security badge styles
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  securityText: {
    fontSize: 12,
    color: '#1a8e2d',
    fontWeight: '500',
    marginLeft: 4,
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
  disabledButton: {
    opacity: 0.6,
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
  processingIndicator: {
    marginTop: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  processingText: {
    color: 'white',
    marginTop: 8,
    fontWeight: '500',
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