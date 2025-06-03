// services/secureOcrService.js - Full-Featured Version (With Collections)
import * as SecureStore from 'expo-secure-store';
import { DatabaseService } from '../configs/AppwriteConfig';
import { COLLECTIONS } from '../constants';

/**
 * Full-Featured Secure OCR Service with Appwrite Collections
 * This version includes full audit logging and consent management
 */

// Privacy and Security Guidelines for MyKad Processing
export const privacyGuidelines = {
  deleteImageAfterProcessing: true,
  allowedFields: ['icNumber', 'name', 'address', 'dateOfBirth', 'gender'],
  encryptSensitiveData: true,
  requireAuthentication: true,
  logAccess: true, // Full audit logging enabled
  dataRetentionDays: 365,
  requireExplicitConsent: true // Full consent management enabled
};

class SecureOcrService {
  constructor() {
    this.initialized = false;
    this.useBackendProxy = false;
  }

  /**
   * Initialize the service with security checks
   */
  async initialize() {
    try {
      console.log('Initializing Full-Featured Secure OCR Service...');
      
      // Check if we should use backend proxy
      this.useBackendProxy = process.env.EXPO_PUBLIC_USE_BACKEND_PROXY === 'true';
      console.log('Use backend proxy:', this.useBackendProxy);
      
      if (!this.useBackendProxy) {
        await this.initializeDirectApi();
      }
      
      this.initialized = true;
      console.log('Full-Featured Secure OCR Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Secure OCR Service:', error);
      throw error;
    }
  }

  /**
   * Initialize direct API access with secure key management
   */
  async initializeDirectApi() {
    try {
      console.log('Initializing direct API access...');
      
      // Get API key from environment
      let apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;
      
      if (!apiKey) {
        // Try to get from SecureStore as fallback
        apiKey = await this.getSecureApiKey('GOOGLE_VISION_API_KEY');
      }
      
      if (!apiKey) {
        throw new Error('Google Vision API key not found in environment variables or secure storage');
      }
      
      // Store in SecureStore for future use
      if (process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY && !await this.getSecureApiKey('GOOGLE_VISION_API_KEY')) {
        await this.setSecureApiKey('GOOGLE_VISION_API_KEY', apiKey);
      }
      
      this.apiKey = apiKey;
      this.apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`;
      
      console.log('Direct API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize direct API:', error);
      throw error;
    }
  }

  /**
   * Securely store API keys using Expo SecureStore
   */
  async setSecureApiKey(keyName, value) {
    try {
      await SecureStore.setItemAsync(keyName, value);
      console.log('API key stored securely');
    } catch (error) {
      console.error('Error storing API key securely:', error);
      throw error;
    }
  }

  /**
   * Securely retrieve API keys from Expo SecureStore
   */
  async getSecureApiKey(keyName) {
    try {
      const key = await SecureStore.getItemAsync(keyName);
      return key;
    } catch (error) {
      console.error('Error retrieving secure API key:', error);
      return null;
    }
  }

  /**
   * Log access for audit purposes (PDPA compliance)
   */
  async logAccess(userId, action, metadata = {}) {
    try {
      if (!privacyGuidelines.logAccess) return;
  
      const auditLog = {
        userId,
        action,
        timestamp: new Date().toISOString(),
        metadata: JSON.stringify(metadata),
        ip: metadata.ip || 'unknown',
        userAgent: metadata.userAgent || 'mobile-app'
      };
  
      console.log('Creating audit log:', action);
      
      // Use the constant instead of hardcoded string
      await DatabaseService.createDocument(COLLECTIONS.AUDIT_LOGS, auditLog);
      console.log('Access logged for audit:', action);
    } catch (error) {
      console.error('Failed to log access:', error);
    }
  }

  /**
   * Main OCR processing with security and privacy protection
   */
  async performSecureOCR(base64Image, userId, userConsent = false) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Security checks
      if (privacyGuidelines.requireAuthentication && !userId) {
        throw new Error('Authentication required for OCR processing');
      }

      if (privacyGuidelines.requireExplicitConsent && !userConsent) {
        throw new Error('User consent required for document processing');
      }

      // Log access for audit
      await this.logAccess(userId, 'mykad_ocr_start', {
        imageSize: base64Image.length,
        timestamp: Date.now()
      });

      let ocrResult;

      if (this.useBackendProxy) {
        ocrResult = await this.performBackendOCR(base64Image, userId);
      } else {
        ocrResult = await this.performDirectOCR(base64Image);
      }

      // Log successful processing
      await this.logAccess(userId, 'mykad_ocr_success', {
        confidence: ocrResult.confidence,
        textLength: ocrResult.text?.length || 0
      });

      // Clear image data for privacy
      if (privacyGuidelines.deleteImageAfterProcessing) {
        base64Image = null;
        console.log('Image data cleared from memory for privacy');
      }

      return ocrResult;

    } catch (error) {
      // Log failed processing
      await this.logAccess(userId, 'mykad_ocr_error', {
        error: error.message
      });
      
      console.error('Secure OCR Error:', error);
      throw error;
    }
  }

  /**
   * Direct API method (for development)
   */
  async performDirectOCR(base64Image) {
    try {
      if (!this.apiKey) {
        throw new Error('API key not available for direct OCR');
      }

      console.log('Performing direct OCR with Google Vision API...');
      
      const requestData = {
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1
              }
            ],
            imageContext: {
              languageHints: ['en', 'ms'] // English and Malay for MyKad
            }
          }
        ]
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Vision API error:', response.status, errorText);
        throw new Error(`Google Vision API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data.responses && data.responses[0]) {
        const result = data.responses[0];
        
        if (result.error) {
          throw new Error(result.error.message);
        }

        if (result.fullTextAnnotation) {
          console.log('OCR successful, text extracted:', result.fullTextAnnotation.text.length, 'characters');
          return {
            text: result.fullTextAnnotation.text,
            success: true,
            confidence: result.textAnnotations?.[0]?.confidence || 0,
            method: 'direct_api'
          };
        }
      }

      return {
        text: '',
        success: false,
        error: 'No text detected',
        confidence: 0
      };

    } catch (error) {
      console.error('Direct OCR Error:', error);
      throw error;
    }
  }

  /**
   * Backend proxy method (for production)
   */
  async performBackendOCR(base64Image, userId) {
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://your-backend.com';
      
      const authToken = await this.getUserAuthToken(userId);
      
      const response = await fetch(`${backendUrl}/api/ocr/mykad`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          image: base64Image,
          privacy_consent: true,
          allowed_fields: privacyGuidelines.allowedFields
        })
      });

      if (!response.ok) {
        throw new Error(`Backend OCR failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Backend OCR Error:', error);
      throw error;
    }
  }

  /**
   * Get user authentication token
   */
  async getUserAuthToken(userId) {
    try {
      const token = await SecureStore.getItemAsync(`auth_token_${userId}`);
      return token || 'mock_token';
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return 'mock_token';
    }
  }

  /**
   * Filter extracted data to only allowed fields
   */
  filterSensitiveData(extractedData) {
    const filtered = {};
    
    privacyGuidelines.allowedFields.forEach(field => {
      if (extractedData[field]) {
        filtered[field] = extractedData[field];
      }
    });

    console.log('Data filtered according to privacy guidelines');
    return filtered;
  }

  /**
   * Check user consent for data processing
   */
  async checkUserConsent(userId) {
    try {
      console.log('Checking user consent for:', userId);
      
      // Query the user_consents collection
      const response = await DatabaseService.listDocuments(
        'user_consents',
        [DatabaseService.createQuery('equal', 'userId', userId)]
      );

      const hasConsent = response.documents.length > 0 && 
                        response.documents[0].consentGiven === true;
      
      console.log('User consent status:', hasConsent);
      return hasConsent;
      
    } catch (error) {
      console.error('Failed to check user consent:', error);
      return false;
    }
  }

  /**
   * Record user consent
   */
 /**
 * Record user consent
 */
async recordUserConsent(userId, consentData) {
    try {
      console.log('Recording user consent for:', userId);
      
      // Only include fields that exist in the collection schema
      const consentRecord = {
        userId,
        consentGiven: true,
        consentDate: new Date().toISOString(),
        consentVersion: '1.0',
        dataProcessingPurpose: consentData.purpose || 'MyKad information extraction',
        dataRetentionPeriod: consentData.retentionPeriod || privacyGuidelines.dataRetentionDays
      };
  
      // Save to user_consents collection using the correct collection ID
      const result = await DatabaseService.createDocument(COLLECTIONS.USER_CONSENTS, consentRecord);
      console.log('User consent recorded successfully:', result.$id);
      
      // Log the consent recording for audit
      await this.logAccess(userId, 'consent_recorded', {
        consentId: result.$id,
        purpose: consentRecord.dataProcessingPurpose
      });
      
      return result;
    } catch (error) {
      console.error('Failed to record user consent:', error);
      throw error;
    }
  }

  /**
   * Get service status (for debugging)
   */
  getStatus() {
    return {
      initialized: this.initialized,
      useBackendProxy: this.useBackendProxy,
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey ? this.apiKey.length : 0,
      fullFeatured: true,
      collectionsEnabled: true,
      auditLogging: privacyGuidelines.logAccess,
      consentRequired: privacyGuidelines.requireExplicitConsent,
      environment: {
        hasGoogleApiKey: !!process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY,
        hasAppwriteDb: !!process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
        useBackendProxy: process.env.EXPO_PUBLIC_USE_BACKEND_PROXY
      }
    };
  }
}

// Export singleton instance
export const secureOcrService = new SecureOcrService();

// Export convenience function
export const performSecureMyKadOCR = async (base64Image, userId, userConsent = false) => {
  return await secureOcrService.performSecureOCR(base64Image, userId, userConsent);
};