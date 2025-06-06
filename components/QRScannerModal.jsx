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
  const [showManualEntry, setShowManualEntry] = useState(true); // Start with manual entry
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [facing, setFacing] = useState('back');
  
  // Initialize the camera permissions
  useEffect(() => {
    (async () => {
      try {
        // Request camera permission
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
    
    // Set scanned immediately to prevent multiple scans
    setScanned(true);
    setLoading(true);
    
    try {
      console.log('Processing QR code:', data);
      
      processPrescriptionQR(data)
        .then(prescriptionMeds => {
          if (prescriptionMeds && prescriptionMeds.length > 0) {
            onScanSuccess(prescriptionMeds[0]);
          } else {
            throw new Error('No medication data found');
          }
        })
        .catch(error => {
          console.error('Error processing scanned QR code:', error);
          Alert.alert('Error', 'Failed to process QR code', [
            { text: 'OK', onPress: () => setScanned(false) }
          ]);
        })
        .finally(() => {
          setLoading(false);
        });
    } catch (error) {
      console.error('Error handling QR scan:', error);
      Alert.alert('Error', 'Failed to process QR code', [
        { text: 'OK', onPress: () => setScanned(false) }
      ]);
      setScanned(false);
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
        {/* Overlay content moved outside CameraView */}
        <View style={styles.scanOverlay}>
          <View style={styles.scannerFrame}>
            <View style={styles.scanLine} />
          </View>
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
              
              {/* Only show camera option if Camera is available */}
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
  },
  scanLine: {
    height: 2,
    width: '100%',
    backgroundColor: '#1a8e2d',
    position: 'absolute',
    top: '50%',
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