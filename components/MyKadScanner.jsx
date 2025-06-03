// components/MyKadScanner.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ActivityIndicator,
  Modal,
  Dimensions
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { performOCR } from '../service/googleVisionService';
import { parseMyKadData } from '../constants/myKadParser';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MyKadScanner = ({ visible, onDataExtracted, onClose }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [facing, setFacing] = useState('back');
  const cameraRef = useRef(null);

  useEffect(() => {
    if (visible) {
      getCameraPermissions();
    }
  }, [visible]);

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      setProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          base64: true,
        });
        
        await processImage(photo.base64);
      } catch (error) {
        console.error('Take picture error:', error);
        Alert.alert('Error', 'Failed to take picture. Please try again.');
        setProcessing(false);
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.9,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setProcessing(true);
      await processImage(result.assets[0].base64);
    }
  };

  const processImage = async (base64Image) => {
    try {
      console.log('Processing image with Google Vision...');
      setProcessing(true);
      
      // Use Google Vision API instead of simulated OCR
      const ocrResult = await performOCR(base64Image);
      
      if (ocrResult.success && ocrResult.text) {
        console.log('OCR Result:', ocrResult.text);
        const extractedData = parseMyKadData(ocrResult.text);
        console.log('Extracted Data:', extractedData);
        
        if (extractedData.icNumber) {
          const confidenceText = ocrResult.confidence > 0 
            ? ` (${(ocrResult.confidence * 100).toFixed(1)}% confidence)` 
            : '';
            
          Alert.alert(
            'Success!', 
            `MyKad information extracted successfully${confidenceText}. Please verify the details.`,
            [{ text: 'OK', onPress: () => {
              onDataExtracted(extractedData);
              onClose();
            }}]
          );
        } else {
          Alert.alert(
            'No IC Found', 
            'Could not detect IC number. Please ensure the MyKad is clearly visible and try again.',
            [
              { text: 'Try Again', style: 'default' },
              { text: 'Enter Manually', onPress: onClose }
            ]
          );
        }
      } else {
        throw new Error(ocrResult.error || 'OCR processing failed');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      Alert.alert(
        'Processing Error', 
        `Failed to extract information: ${error.message}. Please try again.`
      );
    } finally {
      setProcessing(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (!visible) return null;

  if (hasPermission === null) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#0AD476" />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <View style={styles.noPermissionContainer}>
            <Ionicons name="camera-off" size={60} color="#666" />
            <Text style={styles.noPermissionText}>No access to camera</Text>
            <Text style={styles.noPermissionSubtext}>
              Please enable camera permissions in your device settings
            </Text>
            <TouchableOpacity style={styles.button} onPress={pickImage}>
              <Ionicons name="images" size={20} color="white" />
              <Text style={styles.buttonText}>Pick from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing={facing}
          ref={cameraRef}
        >
          <View style={styles.overlay}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={30} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Scan MyKad</Text>
              <View style={{ width: 30 }} />
            </View>

            {/* Card Frame */}
            <View style={styles.frameContainer}>
              <View style={styles.cardFrame}>
                <View style={styles.cornerTL} />
                <View style={styles.cornerTR} />
                <View style={styles.cornerBL} />
                <View style={styles.cornerBR} />
              </View>
              <Text style={styles.instruction}>
                Position your MyKad within the frame
              </Text>
              <Text style={styles.subInstruction}>
                Make sure the text is clear and readable
              </Text>
            </View>

            {/* Processing Overlay */}
            {processing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="white" />
                <Text style={styles.processingText}>Processing image...</Text>
              </View>
            )}
          </View>
        </CameraView>
        
        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={pickImage}
            disabled={processing}
          >
            <Ionicons name="images" size={24} color="white" />
            <Text style={styles.controlButtonText}>Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.captureButton, processing && styles.disabled]} 
            onPress={takePicture}
            disabled={processing}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={toggleCameraFacing}
            disabled={processing}
          >
            <Ionicons name="camera-reverse" size={24} color="white" />
            <Text style={styles.controlButtonText}>Flip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  frameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFrame: {
    width: screenWidth * 0.85,
    height: screenWidth * 0.54, // 16:10 aspect ratio
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#0AD476',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#0AD476',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#0AD476',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#0AD476',
  },
  instruction: {
    color: 'white',
    marginTop: 20,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  subInstruction: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 5,
    textAlign: 'center',
    fontSize: 14,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 40,
    backgroundColor: 'black',
  },
  controlButton: {
    alignItems: 'center',
  },
  controlButtonText: {
    color: 'white',
    marginTop: 5,
    fontSize: 12,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    padding: 3,
  },
  captureButtonInner: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'black',
  },
  disabled: {
    opacity: 0.5,
  },
  button: {
    backgroundColor: '#0AD476',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 10,
  },
  cancelButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  noPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noPermissionText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    color: '#333',
  },
  noPermissionSubtext: {
    fontSize: 14,
    marginTop: 10,
    color: '#666',
    textAlign: 'center',
  },
});

export default MyKadScanner;