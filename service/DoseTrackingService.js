// DoseTrackingService.js - Fixed to work without original_dose_id field

import { DatabaseService, Query } from '../configs/AppwriteConfig';
import { COLLECTIONS } from '../constants/index';
import { getLocalStorage } from './Storage';

class DoseTrackingService {
  constructor() {
    this.DOSE_HISTORY_ID = COLLECTIONS.DOSE_HISTORY;
    console.log('🔧 Dose Tracking Service initialized');
  }

  async getCurrentUserId() {
    try {
      const userDetail = await getLocalStorage('userDetail');
      const userId = userDetail?.uid || userDetail?.userId || userDetail?.$id;
      
      if (!userId) {
        throw new Error('User authentication required');
      }
      
      return userId;
    } catch (error) {
      console.error('Error getting user ID:', error);
      throw error;
    }
  }

  // 🚨 UPDATED: Helper function to check if dose is "As Needed" by ID pattern
  isAsNeededDose(doseId) {
    return doseId.includes('as-needed');
  }

  /**
   * Record a dose as taken in Appwrite
   * 🚨 FIXED: Removed original_dose_id field completely to match database schema
   */
  async recordDose(medicationId, doseId, taken = true, timestamp = null) {
    try {
      const userId = await this.getCurrentUserId();
      const now = timestamp || new Date().toISOString();
      const today = now.split('T')[0]; // YYYY-MM-DD format

      console.log('📝 Recording dose:', { medicationId, doseId, taken });

      // 🚨 FIXED: For "As Needed" medications, always create a new record (don't check for existing)
      if (this.isAsNeededDose(doseId)) {
        // For "As Needed" medications, always create a new record with unique timestamp
        const uniqueDoseId = `${doseId}-${Date.now()}`;
        
        const doseRecord = {
          user_id: userId,
          medication_id: medicationId,
          dose_id: uniqueDoseId,
          // 🚨 REMOVED: original_dose_id field - not in database schema
          taken,
          timestamp: now,
          date: today,
          created_at: now,
          updated_at: now
        };

        const created = await DatabaseService.createDocument(
          this.DOSE_HISTORY_ID,
          doseRecord,
          []
        );
        
        console.log('✅ Created new "As Needed" dose record');
        return created;
      } else {
        // For scheduled medications, check if dose already recorded today
        const existing = await this.getDoseRecord(doseId, today);
        
        if (existing) {
          // Update existing record
          const updated = await DatabaseService.updateDocument(
            this.DOSE_HISTORY_ID,
            existing.$id,
            {
              taken,
              timestamp: now,
              updated_at: now
            }
          );
          
          console.log('✅ Updated existing scheduled dose record');
          return updated;
        } else {
          // Create new record
          const doseRecord = {
            user_id: userId,
            medication_id: medicationId,
            dose_id: doseId,
            taken,
            timestamp: now,
            date: today,
            created_at: now,
            updated_at: now
          };

          const created = await DatabaseService.createDocument(
            this.DOSE_HISTORY_ID,
            doseRecord,
            []
          );
          
          console.log('✅ Created new scheduled dose record');
          return created;
        }
      }
    } catch (error) {
      console.error('❌ Error recording dose:', error);
      throw error;
    }
  }

  /**
   * Get dose record for specific dose and date
   * 🚨 FIXED: Handle "As Needed" medications differently
   */
  async getDoseRecord(doseId, date) {
    try {
      const userId = await this.getCurrentUserId();
      
      // For "As Needed" medications, don't look for existing records
      if (this.isAsNeededDose(doseId)) {
        return null; // Always allow new "As Needed" doses
      }
      
      const response = await DatabaseService.listDocuments(
        this.DOSE_HISTORY_ID,
        [
          Query.equal('user_id', userId),
          Query.equal('dose_id', doseId),
          Query.equal('date', date)
        ],
        1
      );
      
      return response.documents.length > 0 ? response.documents[0] : null;
    } catch (error) {
      console.error('Error getting dose record:', error);
      return null;
    }
  }

  /**
   * Get today's dose history
   */
  async getTodaysDoses() {
    try {
      const userId = await this.getCurrentUserId();
      const today = new Date().toISOString().split('T')[0];

      const response = await DatabaseService.listDocuments(
        this.DOSE_HISTORY_ID,
        [
          Query.equal('user_id', userId),
          Query.equal('date', today)
        ],
        100
      );
      
      console.log(`📊 Found ${response.documents.length} dose records for today (including As Needed)`);
      return response.documents;
    } catch (error) {
      console.error('Error getting today\'s doses:', error);
      return [];
    }
  }

  /**
   * 🚨 UPDATED: Get "As Needed" doses taken today for a specific medication (using dose ID pattern)
   */
  async getAsNeededDosesToday(medicationId) {
    try {
      const userId = await this.getCurrentUserId();
      const today = new Date().toISOString().split('T')[0];

      const response = await DatabaseService.listDocuments(
        this.DOSE_HISTORY_ID,
        [
          Query.equal('user_id', userId),
          Query.equal('medication_id', medicationId),
          Query.equal('date', today),
          Query.equal('taken', true)
        ],
        50
      );
      
      // Filter for "As Needed" doses by checking dose ID pattern
      const asNeededDoses = response.documents.filter(dose => 
        this.isAsNeededDose(dose.dose_id)
      );
      
      console.log(`📊 Found ${asNeededDoses.length} "As Needed" doses for medication ${medicationId} today`);
      return asNeededDoses;
    } catch (error) {
      console.error('Error getting "As Needed" doses:', error);
      return [];
    }
  }

  /**
   * Get ALL dose history for the current user
   */
  async getAllDoseHistory() {
    try {
      const userId = await this.getCurrentUserId();

      // Get all dose history for this user, ordered by timestamp (newest first)
      const response = await DatabaseService.listDocuments(
        this.DOSE_HISTORY_ID,
        [
          Query.equal('user_id', userId),
          Query.orderDesc('timestamp')
        ],
        1000, // Increased limit to get more history
        0 // offset
      );
      
      console.log(`📊 Found ${response.documents.length} total dose records`);
      return response.documents;
    } catch (error) {
      console.error('❌ Error getting all dose history:', error);
      return [];
    }
  }

  /**
   * Get dose history for date range
   */
  async getDoseHistory(startDate, endDate = null) {
    try {
      const userId = await this.getCurrentUserId();
      const end = endDate || new Date().toISOString().split('T')[0];

      const queries = [
        Query.equal('user_id', userId),
        Query.greaterThanEqual('date', startDate),
        Query.lessThanEqual('date', end),
        Query.orderDesc('timestamp')
      ];

      const response = await DatabaseService.listDocuments(
        this.DOSE_HISTORY_ID,
        queries,
        500
      );
      
      console.log(`📊 Found ${response.documents.length} dose records for date range ${startDate} to ${end}`);
      return response.documents;
    } catch (error) {
      console.error('Error getting dose history:', error);
      return [];
    }
  }

  /**
   * Get dose history for the last N days (useful for reports)
   */
  async getRecentDoseHistory(days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      return await this.getDoseHistory(startDateStr, endDateStr);
    } catch (error) {
      console.error(`Error getting recent dose history for ${days} days:`, error);
      return [];
    }
  }

  /**
   * Check if a specific dose is taken today
   * 🚨 FIXED: Handle "As Needed" medications (always return false to allow multiple doses)
   */
  async isDoseTaken(doseId) {
    try {
      // For "As Needed" medications, always return false (allow multiple doses per day)
      if (this.isAsNeededDose(doseId)) {
        return false;
      }

      const today = new Date().toISOString().split('T')[0];
      const record = await this.getDoseRecord(doseId, today);
      return record ? record.taken : false;
    } catch (error) {
      console.error('Error checking dose status:', error);
      return false;
    }
  }

  /**
   * Check if a specific dose is taken on a specific date
   */
  async isDoseTakenOnDate(doseId, date) {
    try {
      const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
      
      // For "As Needed" medications, check if any doses were taken that day
      if (this.isAsNeededDose(doseId)) {
        const medicationId = doseId.split('-')[0]; // Extract medication ID
        const asNeededDoses = await this.getAsNeededDosesToday(medicationId);
        return asNeededDoses.length > 0;
      }

      const record = await this.getDoseRecord(doseId, dateStr);
      return record ? record.taken : false;
    } catch (error) {
      console.error('Error checking dose status for date:', error);
      return false;
    }
  }

  /**
   * Get dose statistics for a user (handle "As Needed" separately using dose ID pattern)
   */
  async getDoseStatistics(days = 30) {
    try {
      const doseHistory = await this.getRecentDoseHistory(days);
      
      // Separate scheduled and "As Needed" doses using dose ID pattern
      const scheduledDoses = doseHistory.filter(dose => !this.isAsNeededDose(dose.dose_id));
      const asNeededDoses = doseHistory.filter(dose => this.isAsNeededDose(dose.dose_id));

      const totalScheduledDoses = scheduledDoses.length;
      const takenScheduledDoses = scheduledDoses.filter(dose => dose.taken).length;
      const totalAsNeededDoses = asNeededDoses.filter(dose => dose.taken).length;

      const adherenceRate = totalScheduledDoses > 0 
        ? Math.round((takenScheduledDoses / totalScheduledDoses) * 100) 
        : 0;

      // Get unique medication IDs
      const uniqueMedications = new Set(doseHistory.map(dose => dose.medication_id));
      
      return {
        totalScheduledDoses,
        takenScheduledDoses,
        missedScheduledDoses: totalScheduledDoses - takenScheduledDoses,
        totalAsNeededDoses,
        adherenceRate,
        activeMedications: uniqueMedications.size,
        period: `${days} days`
      };
    } catch (error) {
      console.error('Error calculating dose statistics:', error);
      return {
        totalScheduledDoses: 0,
        takenScheduledDoses: 0,
        missedScheduledDoses: 0,
        totalAsNeededDoses: 0,
        adherenceRate: 0,
        activeMedications: 0,
        period: `${days} days`
      };
    }
  }

  /**
   * Delete dose record (for undoing)
   */
  async deleteDoseRecord(doseId, date = null) {
    try {
      const dateToCheck = date || new Date().toISOString().split('T')[0];
      
      // For "As Needed" medications, delete the most recent dose
      if (this.isAsNeededDose(doseId)) {
        const userId = await this.getCurrentUserId();
        const medicationId = doseId.split('-')[0];
        
        const response = await DatabaseService.listDocuments(
          this.DOSE_HISTORY_ID,
          [
            Query.equal('user_id', userId),
            Query.equal('medication_id', medicationId),
            Query.equal('date', dateToCheck),
            Query.orderDesc('timestamp')
          ],
          10
        );
        
        // Filter for "As Needed" doses
        const asNeededDoses = response.documents.filter(dose => 
          this.isAsNeededDose(dose.dose_id)
        );
        
        if (asNeededDoses.length > 0) {
          await DatabaseService.deleteDocument(this.DOSE_HISTORY_ID, asNeededDoses[0].$id);
          console.log('✅ Deleted most recent "As Needed" dose record:', doseId);
          return true;
        }
        return false;
      } else {
        // For scheduled medications, delete the specific dose
        const record = await this.getDoseRecord(doseId, dateToCheck);
        
        if (record) {
          await DatabaseService.deleteDocument(this.DOSE_HISTORY_ID, record.$id);
          console.log('✅ Deleted scheduled dose record:', doseId);
          return true;
        }
        
        return false;
      }
    } catch (error) {
      console.error('❌ Error deleting dose record:', error);
      throw error;
    }
  }

  /**
   * 🚨 UPDATED: Bulk record doses (handle "As Needed" medications without original_dose_id field)
   */
  async bulkRecordDoses(doseRecords) {
    try {
      const userId = await this.getCurrentUserId();
      const results = [];

      for (const record of doseRecords) {
        try {
          const isAsNeeded = this.isAsNeededDose(record.doseId);
          const doseId = isAsNeeded ? `${record.doseId}-${Date.now()}` : record.doseId;

          const doseRecord = {
            user_id: userId,
            medication_id: record.medicationId,
            dose_id: doseId,
            // 🚨 REMOVED: original_dose_id field - not in database schema
            taken: record.taken || false,
            timestamp: record.timestamp || new Date().toISOString(),
            date: record.date || new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const created = await DatabaseService.createDocument(
            this.DOSE_HISTORY_ID,
            doseRecord,
            []
          );

          results.push({ success: true, doseId: record.doseId, document: created });
        } catch (error) {
          console.error(`Failed to bulk record dose ${record.doseId}:`, error);
          results.push({ success: false, doseId: record.doseId, error: error.message });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(`📊 Bulk operation complete: ${successful} successful, ${failed} failed`);
      return { successful, failed, results };
    } catch (error) {
      console.error('❌ Bulk record operation failed:', error);
      throw error;
    }
  }

  /**
   * 🚨 UPDATED: Migrate local dose history to Appwrite (handle "As Needed" without original_dose_id field)
   */
  async migrateDoseHistory() {
    try {
      console.log('🔄 Starting dose history migration...');
      
      // Import local storage functions
      const { getDoseHistory: getLocalDoseHistory } = require('./Storage');
      const localHistory = await getLocalDoseHistory();
      
      if (!Array.isArray(localHistory) || localHistory.length === 0) {
        console.log('✅ No local history to migrate');
        return { migrated: 0, errors: 0 };
      }

      const userId = await this.getCurrentUserId();
      let migrated = 0;
      let errors = 0;

      for (const dose of localHistory) {
        try {
          const timestamp = dose.timestamp || dose.date || new Date().toISOString();
          const date = timestamp.split('T')[0];
          const isAsNeeded = this.isAsNeededDose(dose.doseId);

          // Check if already migrated (skip for "As Needed" since they can have multiple)
          if (!isAsNeeded) {
            const existing = await this.getDoseRecord(dose.doseId, date);
            if (existing) {
              console.log('⏭️ Skipping already migrated dose:', dose.doseId);
              continue;
            }
          }

          // Migrate dose record
          await DatabaseService.createDocument(
            this.DOSE_HISTORY_ID,
            {
              user_id: userId,
              medication_id: dose.medicationId || dose.doseId.split('-')[0],
              dose_id: isAsNeeded ? `${dose.doseId}-migrated-${Date.now()}` : dose.doseId,
              // 🚨 REMOVED: original_dose_id field - not in database schema
              taken: dose.taken || false,
              timestamp,
              date,
              created_at: timestamp,
              updated_at: new Date().toISOString(),
              migrated: true
            },
            []
          );

          migrated++;
          console.log(`✅ Migrated dose: ${dose.doseId}`);
        } catch (error) {
          console.error(`❌ Failed to migrate dose ${dose.doseId}:`, error);
          errors++;
        }
      }

      console.log(`🎉 Migration complete: ${migrated} migrated, ${errors} errors`);
      return { migrated, errors };
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Clean up old dose records
   */
  async cleanupOldRecords(daysToKeep = 365) {
    try {
      const userId = await this.getCurrentUserId();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      const response = await DatabaseService.listDocuments(
        this.DOSE_HISTORY_ID,
        [
          Query.equal('user_id', userId),
          Query.lessThan('date', cutoffDateStr)
        ],
        100
      );

      let deleted = 0;
      for (const record of response.documents) {
        try {
          await DatabaseService.deleteDocument(this.DOSE_HISTORY_ID, record.$id);
          deleted++;
        } catch (error) {
          console.error('Error deleting old record:', error);
        }
      }

      console.log(`🧹 Cleanup complete: deleted ${deleted} old records`);
      return { deleted };
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }
}

export const doseTrackingService = new DoseTrackingService();
export default doseTrackingService;