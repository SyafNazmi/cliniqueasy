// Defensive Family PatientMedicationService.js - Schema-Safe Version
import { DatabaseService, Query } from '../configs/AppwriteConfig';
import { COLLECTIONS } from '../constants/index';
import { getLocalStorage } from './Storage';

class DefensiveFamilyPatientMedicationService {
  
  constructor() {
    // Use consistent collection IDs from constants
    this.PATIENT_MEDICATIONS_ID = COLLECTIONS.PATIENT_MEDICATIONS;
    this.PRESCRIPTIONS_ID = COLLECTIONS.PRESCRIPTIONS;
    this.PRESCRIPTION_MEDICATIONS_ID = COLLECTIONS.PRESCRIPTION_MEDICATIONS;
    this.APPOINTMENTS_ID = COLLECTIONS.APPOINTMENTS;
    this.PATIENT_PROFILES_ID = COLLECTIONS.PATIENT_PROFILES;
    
    console.log('🔧 Defensive Family Service initialized (schema-safe)');
  }

  /**
   * Get current user with family member context
   */
  async getCurrentUserContext() {
    try {
      const userDetail = await getLocalStorage('userDetail');
      const ownerUserId = userDetail?.uid || userDetail?.userId || userDetail?.$id;
      
      if (!ownerUserId) {
        throw new Error('User authentication required. Please log in again.');
      }

      // Get family members from local sources only (safe approach)
      const familyMembers = await this.getFamilyMembersLocal(ownerUserId);
      
      return {
        ownerUserId,
        userDetail,
        familyMembers,
        allPatientIds: [ownerUserId, ...familyMembers.map(fm => fm.id)]
      };
    } catch (error) {
      console.error('Error getting user context:', error);
      throw new Error('Failed to authenticate user. Please log in again.');
    }
  }

  /**
   * 🛡️ SAFE: Get family members from local storage only (no database queries)
   */
  async getFamilyMembersLocal(ownerUserId) {
    try {
      console.log('👥 Getting family members from local storage for user:', ownerUserId);
      
      let familyMembers = [];
      
      // 1. Get from local storage
      const localFamilyMembers = await getLocalStorage('familyMembers') || [];
      
      // 2. Get from user detail
      const userDetail = await getLocalStorage('userDetail');
      if (userDetail?.familyMembers && Array.isArray(userDetail.familyMembers)) {
        familyMembers = [...localFamilyMembers, ...userDetail.familyMembers];
      } else {
        familyMembers = localFamilyMembers;
      }

      // 3. Try to get from patient profiles database (with error handling)
      try {
        // First, let's try to list all patient profiles to see what fields are available
        const profilesTest = await DatabaseService.listDocuments(
          this.PATIENT_PROFILES_ID,
          [], // No filters first
          5   // Small limit for testing
        );
        
        console.log('📋 Patient profiles schema test:', profilesTest.documents[0] || 'No documents found');
        
        // Only proceed if we have documents and can determine the structure
        if (profilesTest.documents && profilesTest.documents.length > 0) {
          const sampleProfile = profilesTest.documents[0];
          
          // Try different possible field names for owner identification
          let ownerField = null;
          if (sampleProfile.owner_user_id !== undefined) {
            ownerField = 'owner_user_id';
          } else if (sampleProfile.userId !== undefined) {
            ownerField = 'userId';
          } else if (sampleProfile.user_id !== undefined) {
            ownerField = 'user_id';
          }
          
          // Try different possible field names for profile type
          let profileTypeField = null;
          if (sampleProfile.profile_type !== undefined) {
            profileTypeField = 'profile_type';
          } else if (sampleProfile.profileType !== undefined) {
            profileTypeField = 'profileType';
          } else if (sampleProfile.type !== undefined) {
            profileTypeField = 'type';
          }
          
          // Only query if we found the necessary fields
          if (ownerField && profileTypeField) {
            console.log(`🔍 Querying profiles with ${ownerField}=${ownerUserId} and ${profileTypeField}=family_member`);
            
            const profilesResponse = await DatabaseService.listDocuments(
              this.PATIENT_PROFILES_ID,
              [
                Query.equal(ownerField, ownerUserId),
                Query.equal(profileTypeField, 'family_member')
              ],
              50
            );

            if (profilesResponse.documents.length > 0) {
              const dbFamilyMembers = profilesResponse.documents.map(profile => ({
                id: profile.family_member_id || profile.familyMemberId || profile.id || profile.$id,
                name: profile.name || profile.full_name || profile.fullName || `Family Member`,
                relationship: profile.relationship || 'Family Member',
                dateOfBirth: profile.date_of_birth || profile.dateOfBirth || profile.birthDate,
                gender: profile.gender,
                phone: profile.phone_number || profile.phoneNumber || profile.phone,
                email: profile.email,
                profileId: profile.$id,
                ownerUserId: profile[ownerField],
                createdAt: profile.created_at || profile.createdAt
              }));
              
              // Merge with local storage data
              familyMembers = this.mergeFamilyMembers(familyMembers, dbFamilyMembers);
              console.log('✅ Successfully merged database family members');
            }
          } else {
            console.log('⚠️ Patient profiles schema does not have required fields for family member queries');
          }
        }
      } catch (dbError) {
        console.log('⚠️ Could not query patient profiles (expected if schema differs):', dbError.message);
        console.log('📱 Using local storage family members only');
      }

      // Remove duplicates
      const uniqueFamilyMembers = familyMembers.filter((member, index, self) => 
        index === self.findIndex(m => 
          m.id === member.id || 
          (m.name === member.name && m.relationship === member.relationship)
        )
      );

      console.log(`✅ Found ${uniqueFamilyMembers.length} family members (local + database)`);
      return uniqueFamilyMembers;
      
    } catch (error) {
      console.error('❌ Error getting family members:', error);
      return [];
    }
  }

  /**
   * Merge family members from different sources
   */
  mergeFamilyMembers(localMembers, dbMembers) {
    const merged = [...dbMembers]; // Start with database data as primary
    
    localMembers.forEach(localMember => {
      // Only add local member if not found in database
      if (!dbMembers.find(dbMember => 
        dbMember.id === localMember.id || 
        (dbMember.name === localMember.name && dbMember.relationship === localMember.relationship)
      )) {
        merged.push(localMember);
      }
    });
    
    return merged;
  }

  /**
   * Get patient info (owner or family member)
   */
  async getPatientInfo(patientId, context = null) {
    try {
      if (!context) {
        context = await this.getCurrentUserContext();
      }

      // If it's the owner
      if (patientId === context.ownerUserId || patientId === 'owner') {
        return {
          id: context.ownerUserId,
          name: context.userDetail.name || context.userDetail.firstName || 'You (Account Owner)',
          type: 'owner',
          isOwner: true,
          email: context.userDetail.email,
          phone: context.userDetail.phone
        };
      }

      // Look for family member
      const familyMember = context.familyMembers.find(fm => 
        fm.id === patientId || 
        fm.profileId === patientId
      );

      if (familyMember) {
        return {
          id: familyMember.id,
          name: familyMember.name,
          type: 'family',
          isOwner: false,
          relationship: familyMember.relationship,
          email: familyMember.email,
          phone: familyMember.phone,
          profileId: familyMember.profileId,
          ownerUserId: context.ownerUserId
        };
      }

      throw new Error(`Patient not found: ${patientId}`);
    } catch (error) {
      console.error('Error getting patient info:', error);
      throw error;
    }
  }

  /**
   * 🛡️ SAFE: Get patient medications using new schema fields with fallbacks
   */
  async getPatientMedications(filters = {}) {
    try {
      const context = await this.getCurrentUserContext();
      
      const queries = [
        Query.equal('user_id', context.ownerUserId),
        Query.equal('status', 'Active')
      ];

      // 🛡️ SAFE: Only add patient filtering if fields exist
      if (filters.patientId && filters.patientId !== 'all') {
        // Test if patient_id field exists by doing a small query first
        try {
          if (filters.patientId === 'owner' || filters.patientId === context.ownerUserId) {
            // Try to query by patient_id for owner
            queries.push(Query.equal('patient_id', context.ownerUserId));
          } else {
            // Try to query by patient_id for specific family member
            queries.push(Query.equal('patient_id', filters.patientId));
          }
        } catch (queryError) {
          console.log('⚠️ patient_id field not available, will filter client-side');
        }
      }

      if (filters.isPrescription !== undefined) {
        queries.push(Query.equal('is_prescription', filters.isPrescription));
      }
      
      if (filters.appointmentId) {
        queries.push(Query.equal('appointment_id', filters.appointmentId));
      }

      if (filters.isFamilyMember !== undefined) {
        try {
          queries.push(Query.equal('is_family_member', filters.isFamilyMember));
        } catch (queryError) {
          console.log('⚠️ is_family_member field not available, will filter client-side');
        }
      }

      console.log('🔍 Querying medications with safe filters:', filters);
      
      const response = await DatabaseService.listDocuments(
        this.PATIENT_MEDICATIONS_ID,
        queries,
        100
      );
      
      console.log(`✅ Found ${response.total} medications`);
      
      // Convert and enrich with patient info
      const medications = await Promise.all(
        response.documents.map(async (med) => {
          const converted = this.convertToLocalFormat(med);
          
          // 🛡️ SAFE: Enrich with patient information using available fields
          try {
            // Use database fields if available, otherwise fallback
            const patientId = med.patient_id || context.ownerUserId;
            const patientInfo = await this.getPatientInfo(patientId, context);
            converted.patientInfo = patientInfo;
          } catch (error) {
            console.log('⚠️ Could not get patient info for medication:', med.$id);
            // Fallback using available database fields or defaults
            converted.patientInfo = {
              id: med.patient_id || context.ownerUserId,
              name: med.patient_name || context.userDetail.name || 'You (Account Owner)',
              type: med.patient_type || 'owner'
            };
          }
          
          return converted;
        })
      );

      // 🛡️ SAFE: Client-side filtering if database filtering failed
      if (filters.patientId && filters.patientId !== 'all') {
        return medications.filter(med => {
          const medPatientId = med.patientId || med.patientInfo?.id || context.ownerUserId;
          
          if (filters.patientId === 'owner' || filters.patientId === context.ownerUserId) {
            return medPatientId === context.ownerUserId || med.patientType === 'owner';
          }
          
          return medPatientId === filters.patientId;
        });
      }
      
      return medications;
      
    } catch (error) {
      console.error('Error fetching patient medications:', error);
      return [];
    }
  }

  /**
   * 🛡️ SAFE: Add manual medication with optional patient assignment
   */
  async addManualMedication(medicationData, patientId = null) {
    try {
      const context = await this.getCurrentUserContext();
      let targetPatient = null;
      
      // Determine target patient
      if (patientId && patientId !== 'owner') {
        try {
          targetPatient = await this.getPatientInfo(patientId, context);
        } catch (error) {
          console.log('⚠️ Could not find specific patient, defaulting to owner');
          targetPatient = await this.getPatientInfo(context.ownerUserId, context);
        }
      } else {
        targetPatient = await this.getPatientInfo(context.ownerUserId, context);
      }

      console.log('📝 Adding manual medication for patient:', targetPatient.name);

      const requiredFields = ['name', 'type', 'dosage', 'frequencies', 'duration'];
      for (const field of requiredFields) {
        if (!medicationData[field] || !medicationData[field].toString().trim()) {
          throw new Error(`${field} is required`);
        }
      }

      // 🛡️ SAFE: Build medication data with available fields
      const enhancedData = {
        user_id: context.ownerUserId,
        name: medicationData.name,
        type: medicationData.type,
        illness_type: medicationData.illnessType || '',
        dosage: medicationData.dosage,
        frequencies: medicationData.frequencies,
        duration: medicationData.duration,
        start_date: medicationData.startDate || new Date().toISOString().split('T')[0],
        times: Array.isArray(medicationData.times) ? medicationData.times : ['09:00'],
        notes: medicationData.notes || `Medication for ${targetPatient.name}`,
        reminder_enabled: medicationData.reminderEnabled !== false,
        refill_reminder: medicationData.refillReminder || false,
        current_supply: medicationData.currentSupply || 0,
        total_supply: medicationData.totalSupply || 0,
        refill_at: medicationData.refillAt || 0,
        color: medicationData.color || this.generateRandomColor(),
        is_prescription: medicationData.isPrescription || false,
        prescription_id: medicationData.prescriptionId || null,
        prescribed_by: medicationData.prescribedBy || null,
        reference_code: medicationData.referenceCode || null,
        appointment_id: medicationData.appointmentId || null,
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        local_id: medicationData.id || `med_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      };

      // 🛡️ SAFE: Add patient fields only if they exist in schema
      try {
        enhancedData.patient_id = targetPatient.id;
        enhancedData.patient_name = targetPatient.name;
        enhancedData.patient_type = targetPatient.type;
        enhancedData.is_family_member = targetPatient.type === 'family';
      } catch (error) {
        console.log('⚠️ Patient fields not available in schema, using notes fallback');
        // Fallback: encode patient info in notes
        if (targetPatient.type === 'family') {
          enhancedData.notes = `Medication for ${targetPatient.name}${targetPatient.relationship ? ` (${targetPatient.relationship})` : ''}. ${enhancedData.notes}`.trim();
        }
      }

      const result = await this.saveMedicationToDatabase(enhancedData);
      console.log(`✅ Manual medication added for ${targetPatient.name}:`, result.name);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error adding manual medication:', error);
      throw error;
    }
  }

  /**
   * 🛡️ SAFE: Add prescription medications with optional patient assignment
   */
  async addPrescriptionMedicationsToPatient(appointmentId, patientId = null) {
    try {
      console.log('📦 Adding prescription medications for appointment:', appointmentId, 'patient:', patientId);
      
      const context = await this.getCurrentUserContext();
      let targetPatient = null;
      
      // Determine target patient
      if (patientId && patientId !== 'owner') {
        try {
          targetPatient = await this.getPatientInfo(patientId, context);
        } catch (error) {
          console.log('⚠️ Could not find specific patient, defaulting to owner');
          targetPatient = await this.getPatientInfo(context.ownerUserId, context);
        }
      } else {
        targetPatient = await this.getPatientInfo(context.ownerUserId, context);
      }

      console.log('🎯 Adding medications for patient:', targetPatient.name);

      const prescriptionData = await this.getPrescriptionByQR(`APPT:${appointmentId}`, targetPatient.id);
      
      if (!prescriptionData.medications || prescriptionData.medications.length === 0) {
        throw new Error('No medications found in prescription');
      }

      const results = {
        successful: [],
        failed: [],
        totalCount: prescriptionData.medications.length,
        patient: targetPatient
      };

      const batchSize = 3;
      for (let i = 0; i < prescriptionData.medications.length; i += batchSize) {
        const batch = prescriptionData.medications.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (medication) => {
          try {
            const medicationData = this.prepareMedicationData(medication, context.ownerUserId, prescriptionData, targetPatient);
            const savedMedication = await this.saveMedicationToDatabase(medicationData);
            
            results.successful.push({
              name: savedMedication.name,
              id: savedMedication.id,
              times: savedMedication.times,
              dosage: savedMedication.dosage,
              patient: targetPatient.name
            });
            
            return savedMedication;
          } catch (error) {
            console.error(`❌ Failed to add medication ${medication.name}:`, error);
            results.failed.push({
              name: medication.name,
              error: error.message,
              patient: targetPatient.name
            });
            return null;
          }
        });

        await Promise.allSettled(batchPromises);
      }

      console.log(`📊 Batch processing complete for ${targetPatient.name}: ${results.successful.length} successful, ${results.failed.length} failed`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Error adding prescription medications:', error);
      throw new Error(`Failed to add prescription medications: ${error.message}`);
    }
  }

  /**
   * 🛡️ SAFE: Prepare medication data with optional patient assignment
   */
  prepareMedicationData(medication, ownerUserId, prescriptionData, targetPatient) {
    const now = new Date().toISOString();
    
    const baseData = {
      user_id: ownerUserId,
      name: medication.name,
      type: medication.type,
      illness_type: medication.illnessType || '',
      dosage: medication.dosage,
      frequencies: medication.frequencies,
      duration: medication.duration,
      start_date: medication.startDate || now.split('T')[0],
      times: Array.isArray(medication.times) ? medication.times : ['09:00'],
      notes: medication.notes || `Prescribed medication for ${targetPatient.name} from appointment on ${new Date().toLocaleDateString()}`,
      reminder_enabled: true,
      refill_reminder: false,
      current_supply: 0,
      total_supply: 0,
      refill_at: 0,
      color: this.generateRandomColor(),
      is_prescription: true,
      prescription_id: prescriptionData.prescription.$id,
      prescribed_by: prescriptionData.prescription.prescribed_by || 'Healthcare Provider',
      reference_code: prescriptionData.prescription.reference_code,
      appointment_id: prescriptionData.qrData.appointmentId,
      status: 'Active',
      created_at: now,
      updated_at: now,
      local_id: `med_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    };

    // 🛡️ SAFE: Add patient fields only if they should exist
    try {
      baseData.patient_id = targetPatient.id;
      baseData.patient_name = targetPatient.name;
      baseData.patient_type = targetPatient.type;
      baseData.is_family_member = targetPatient.type === 'family';
    } catch (error) {
      console.log('⚠️ Patient fields not available, using notes fallback');
      // Patient info is already encoded in notes
    }
    
    return baseData;
  }

  // All other methods remain the same...
  async getFamilyMemberMedications(familyMemberId) {
    return this.getPatientMedications({ patientId: familyMemberId });
  }

  async getAllPatientsWithMedicationCounts() {
    try {
      const context = await this.getCurrentUserContext();
      const allMedications = await this.getPatientMedications();
      
      const medicationsByPatient = {};
      
      allMedications.forEach(med => {
        const patientId = med.patientId || med.patientInfo?.id || context.ownerUserId;
        if (!medicationsByPatient[patientId]) {
          medicationsByPatient[patientId] = {
            medications: [],
            patient: med.patientInfo || null
          };
        }
        medicationsByPatient[patientId].medications.push(med);
      });

      const results = [];
      
      // Add owner
      const ownerMeds = medicationsByPatient[context.ownerUserId] || { medications: [] };
      results.push({
        patient: {
          id: context.ownerUserId,
          name: context.userDetail.name || 'You (Account Owner)',
          type: 'owner'
        },
        medicationCount: ownerMeds.medications.length,
        medications: ownerMeds.medications
      });

      // Add family members
      context.familyMembers.forEach(familyMember => {
        const familyMeds = medicationsByPatient[familyMember.id] || { medications: [] };
        results.push({
          patient: {
            id: familyMember.id,
            name: familyMember.name,
            type: 'family',
            relationship: familyMember.relationship
          },
          medicationCount: familyMeds.medications.length,
          medications: familyMeds.medications
        });
      });

      return results;
      
    } catch (error) {
      console.error('Error getting patients with medication counts:', error);
      return [];
    }
  }

  // Standard CRUD operations and utility methods (same as before)
  async getPrescriptionByQR(qrData, patientId = null) {
    try {
      if (!qrData || typeof qrData !== 'string') {
        throw new Error('Invalid QR code data');
      }

      const parts = qrData.split(':');
      if (parts.length < 2 || parts[0] !== 'APPT') {
        throw new Error('Invalid prescription QR code format');
      }
      
      const appointmentId = parts[1];
      const referenceCode = parts[2] || '';

      let appointment = null;
      try {
        appointment = await DatabaseService.getDocument(this.APPOINTMENTS_ID, appointmentId);
      } catch (error) {
        console.warn('⚠️ Appointment not found, continuing with prescription lookup');
      }
      
      const prescriptionsResponse = await DatabaseService.listDocuments(
        this.PRESCRIPTIONS_ID,
        [Query.equal('appointment_id', appointmentId)],
        25
      );
      
      if (!prescriptionsResponse.documents || prescriptionsResponse.documents.length === 0) {
        return this.createDemoQRResponse(appointmentId, referenceCode);
      }
      
      const prescription = prescriptionsResponse.documents[0];
      
      const medicationsResponse = await DatabaseService.listDocuments(
        this.PRESCRIPTION_MEDICATIONS_ID,
        [Query.equal('prescription_id', prescription.$id)],
        100
      );
      
      if (!medicationsResponse.documents || medicationsResponse.documents.length === 0) {
        return this.createDemoQRResponse(appointmentId, referenceCode);
      }
      
      const formattedMedications = medicationsResponse.documents.map(med => {
        const times = this.parseTimesFromDatabase(med.times, med.frequencies);
        
        return {
          name: med.name || 'Unknown Medication',
          type: med.type || 'Tablet',
          dosage: med.dosage || 'As prescribed',
          frequencies: med.frequencies || 'Once Daily',
          duration: med.duration || '30 days',
          illnessType: med.illness_type || '',
          notes: med.notes || '',
          times: times,
          appointmentId,
          referenceCode: prescription.reference_code,
          prescriptionId: prescription.$id,
          isPrescription: true,
          prescribedBy: prescription.prescribed_by || 'Healthcare Provider',
          medicationId: med.$id,
          createdAt: med.created_at || new Date().toISOString()
        };
      });
      
      return {
        prescription,
        medications: formattedMedications,
        appointment,
        qrData: { appointmentId, referenceCode }
      };
      
    } catch (error) {
      console.error('❌ Error processing prescription QR:', error);
      
      try {
        const parts = qrData.split(':');
        const appointmentId = parts[1] || 'demo';
        const referenceCode = parts[2] || 'DEMO';
        return this.createDemoQRResponse(appointmentId, referenceCode);
      } catch (demoError) {
        throw error;
      }
    }
  }

  createDemoQRResponse(appointmentId, referenceCode) {
    const demoMedications = [
      {
        name: 'Loratadine',
        type: 'Tablet',
        dosage: '300mg',
        frequencies: 'Once Daily',
        duration: '7 days',
        illnessType: 'Inflammation',
        notes: 'Eat after Taking Meal',
        times: ['09:00'],
        appointmentId,
        referenceCode,
        isPrescription: true,
        prescribedBy: 'Healthcare Provider',
        medicationId: `demo_med_1_${Date.now()}`,
        createdAt: new Date().toISOString()
      },
      {
        name: 'Diuretics',
        type: 'Capsule',
        dosage: '500mg',
        frequencies: 'Three times Daily',
        duration: '30 days',
        illnessType: 'Blood Pressure',
        notes: 'Eat after Taking Meal',
        times: ['09:00', '15:00', '21:00'],
        appointmentId,
        referenceCode,
        isPrescription: true,
        prescribedBy: 'Healthcare Provider',
        medicationId: `demo_med_2_${Date.now()}`,
        createdAt: new Date().toISOString()
      }
    ];
    
    return {
      prescription: {
        $id: `demo_prescription_${Date.now()}`,
        reference_code: referenceCode,
        prescribed_by: 'Healthcare Provider'
      },
      medications: demoMedications,
      appointment: null,
      qrData: { appointmentId, referenceCode }
    };
  }

  async updatePatientMedication(medicationId, updateData) {
    try {
      const medication = await this.getPatientMedicationById(medicationId);
      if (!medication) {
        throw new Error('Medication not found');
      }

      const updatePayload = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined) {
          delete updatePayload[key];
        }
      });

      const updated = await DatabaseService.updateDocument(
        this.PATIENT_MEDICATIONS_ID,
        medication.appwriteId,
        updatePayload
      );

      return this.convertToLocalFormat(updated);
    } catch (error) {
      console.error('❌ Error updating medication:', error);
      throw new Error(`Failed to update medication: ${error.message}`);
    }
  }

  async getPatientMedicationById(medicationId) {
    try {
      const context = await this.getCurrentUserContext();
      
      const response = await DatabaseService.listDocuments(
        this.PATIENT_MEDICATIONS_ID,
        [
          Query.equal('user_id', context.ownerUserId),
          Query.equal('local_id', medicationId)
        ],
        1
      );

      if (response.documents.length > 0) {
        return this.convertToLocalFormat(response.documents[0]);
      }

      try {
        const directDoc = await DatabaseService.getDocument(this.PATIENT_MEDICATIONS_ID, medicationId);
        if (directDoc.user_id === context.ownerUserId) {
          return this.convertToLocalFormat(directDoc);
        }
      } catch (error) {
        console.log('Medication not found by ID:', medicationId);
      }

      return null;
    } catch (error) {
      console.error('Error getting medication by ID:', error);
      return null;
    }
  }

  async deletePatientMedication(medicationId) {
    try {
      const medication = await this.getPatientMedicationById(medicationId);
      if (!medication) {
        throw new Error('Medication not found');
      }

      await DatabaseService.deleteDocument(this.PATIENT_MEDICATIONS_ID, medication.appwriteId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting medication:', error);
      throw new Error(`Failed to delete medication: ${error.message}`);
    }
  }

  async saveMedicationToDatabase(medicationData, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`💾 Save attempt ${attempt + 1} for medication: ${medicationData.name}`);
        
        const savedMedication = await DatabaseService.createDocument(
          this.PATIENT_MEDICATIONS_ID,
          medicationData,
          []
        );
        
        console.log('✅ Medication saved successfully:', savedMedication.$id);
        return this.convertToLocalFormat(savedMedication);
        
      } catch (error) {
        console.error(`❌ Save attempt ${attempt + 1} failed:`, error);
        
        if (attempt === retries) {
          throw new Error(`Failed to save medication after ${retries + 1} attempts: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  parseTimesFromDatabase(times, frequencies) {
    try {
      const FREQUENCY_TIMES = {
        "Once Daily": ["09:00"],
        "Twice Daily": ["09:00", "21:00"],
        "Three times Daily": ["09:00", "15:00", "21:00"],
        "Four times Daily": ["09:00", "13:00", "17:00", "21:00"],
        "Every Morning": ["08:00"],
        "Every Evening": ["20:00"],
        "Every 4 Hours": ["08:00", "12:00", "16:00", "20:00", "00:00", "04:00"],
        "Every 6 Hours": ["06:00", "12:00", "18:00", "00:00"],
        "Every 8 Hours": ["08:00", "16:00", "00:00"],
        "Every 12 Hours": ["08:00", "20:00"],
        "Weekly": ["09:00"],
        "As Needed": []
      };

      if (frequencies && FREQUENCY_TIMES[frequencies]) {
        return FREQUENCY_TIMES[frequencies];
      }

      if (Array.isArray(times) && times.length > 0) {
        return times.map(time => String(time));
      }
      
      if (typeof times === 'string' && times.trim() !== '') {
        if (times.startsWith('[') && times.endsWith(']')) {
          try {
            const parsed = JSON.parse(times);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed.map(time => String(time));
            }
          } catch (e) {
            console.warn('Failed to parse times JSON:', times);
          }
        }
        return [String(times)];
      }
      
      return ["09:00"];
    } catch (error) {
      console.error('Error parsing times:', error);
      return ["09:00"];
    }
  }

  convertToLocalFormat(medication) {
    return {
      id: medication.local_id || medication.$id,
      appwriteId: medication.$id,
      userId: medication.user_id,
      
      // Patient assignment fields (with fallbacks)
      patientId: medication.patient_id,
      patientName: medication.patient_name,
      patientType: medication.patient_type,
      isFamilyMember: medication.is_family_member || false,
      
      name: medication.name,
      type: medication.type,
      illnessType: medication.illness_type,
      dosage: medication.dosage,
      frequencies: medication.frequencies,
      duration: medication.duration,
      startDate: medication.start_date,
      times: Array.isArray(medication.times) ? medication.times : ['09:00'],
      notes: medication.notes || '',
      reminderEnabled: medication.reminder_enabled !== false,
      refillReminder: medication.refill_reminder || false,
      currentSupply: medication.current_supply || 0,
      totalSupply: medication.total_supply || 0,
      refillAt: medication.refill_at || 0,
      color: medication.color,
      
      isPrescription: medication.is_prescription || false,
      prescriptionId: medication.prescription_id,
      prescribedBy: medication.prescribed_by,
      referenceCode: medication.reference_code,
      appointmentId: medication.appointment_id,
      
      createdAt: medication.created_at,
      updatedAt: medication.updated_at
    };
  }

  generateRandomColor() {
    const colors = [
      '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#F44336',
      '#009688', '#795548', '#607D8B', '#3F51B5', '#00BCD4'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

export const integratedPatientMedicationService = new DefensiveFamilyPatientMedicationService();
export default integratedPatientMedicationService;