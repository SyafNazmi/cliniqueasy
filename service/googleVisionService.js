// services/googleVisionService.js
/**
 * Google Cloud Vision API Service for OCR Processing
 * This service handles text detection from images using Google Cloud Vision API
 */

export class GoogleVisionService {
    constructor() {
      this.apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;
      this.apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`;
      
      if (!this.apiKey) {
        console.warn('Google Vision API key not found in environment variables');
      }
    }
  
    /**
     * Perform OCR on base64 image using Google Cloud Vision API
     * @param {string} base64Image - Base64 encoded image string
     * @param {Object} options - Additional options for OCR processing
     * @returns {Promise<Object>} OCR result with text, success status, and confidence
     */
    async performOCR(base64Image, options = {}) {
      try {
        if (!this.apiKey) {
          throw new Error('Google Vision API key is not configured');
        }
  
        if (!base64Image) {
          throw new Error('No image data provided');
        }
  
        console.log('Starting Google Vision OCR processing...');
  
        const requestData = {
          requests: [
            {
              image: {
                content: base64Image
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: options.maxResults || 1
                }
              ],
              imageContext: options.imageContext || {}
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
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        const data = await response.json();
        console.log('Google Vision API response received');
  
        // Check for API errors
        if (data.responses && data.responses[0] && data.responses[0].error) {
          throw new Error(data.responses[0].error.message);
        }
  
        if (data.responses && data.responses[0]) {
          const result = data.responses[0];
          
          if (result.fullTextAnnotation) {
            const extractedText = result.fullTextAnnotation.text;
            const confidence = result.textAnnotations?.[0]?.confidence || 0;
            
            console.log('OCR processing successful');
            console.log(`Extracted text length: ${extractedText.length} characters`);
            console.log(`Confidence: ${(confidence * 100).toFixed(1)}%`);
            
            return {
              text: extractedText,
              success: true,
              confidence: confidence,
              textAnnotations: result.textAnnotations || [],
              pages: result.fullTextAnnotation.pages || []
            };
          }
        }
  
        // No text detected
        return {
          text: '',
          success: false,
          error: 'No text detected in the image',
          confidence: 0
        };
  
      } catch (error) {
        console.error('Google Vision OCR Error:', error);
        return {
          text: '',
          success: false,
          error: error.message,
          confidence: 0
        };
      }
    }
  
    /**
     * Perform OCR specifically optimized for MyKad documents
     * @param {string} base64Image - Base64 encoded image string
     * @returns {Promise<Object>} OCR result optimized for MyKad text extraction
     */
    async performMyKadOCR(base64Image) {
      const options = {
        maxResults: 1,
        imageContext: {
          languageHints: ['en', 'ms'] // English and Malay for MyKad
        }
      };
  
      return await this.performOCR(base64Image, options);
    }
  
    /**
     * Validate API key configuration
     * @returns {boolean} True if API key is configured
     */
    isConfigured() {
      return !!this.apiKey;
    }
  
    /**
     * Get API usage info (for debugging)
     * @returns {Object} Configuration status
     */
    getStatus() {
      return {
        configured: this.isConfigured(),
        apiUrl: this.apiUrl.replace(this.apiKey, '***HIDDEN***')
      };
    }
  }
  
  // Export a default instance
  export const googleVisionService = new GoogleVisionService();
  
  // Export convenience function for direct use
  export const performOCR = async (base64Image) => {
    return await googleVisionService.performMyKadOCR(base64Image);
  };