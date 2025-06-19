// constants/MedicationConstants.js - Shared constants for both patient and doctor sides

export const MEDICATION_TYPES = [
  { id: '1', label: 'Tablet', icon: 'tablet-portrait-outline' },
  { id: '2', label: 'Capsule', icon: 'ellipse-outline' },
  { id: '3', label: 'Liquid', icon: 'water-outline' },
  { id: '4', label: 'Injection', icon: 'medical-outline' },
  { id: '5', label: 'Topical', icon: 'hand-left-outline' },
  { id: '6', label: 'Inhaler', icon: 'cloud-outline' },
  { id: '7', label: 'Patch', icon: 'bandage-outline' },
  { id: '8', label: 'Drops', icon: 'eyedrop-outline' },
];

// 🚨 SYNCHRONIZED: Same illness types for both patient and doctor apps
export const ILLNESS_TYPES = [
  { id: '1', label: 'Flu' },
  { id: '2', label: 'Fever' },
  { id: '3', label: 'Cough' },
  { id: '4', label: 'Headache' },
  { id: '5', label: 'Allergies' },
  { id: '6', label: 'Pain' },
  { id: '7', label: 'Infection' },
  { id: '8', label: 'Blood Pressure' },
  { id: '9', label: 'Diabetes' },
  { id: '10', label: 'Hypertension' },
  { id: '11', label: 'Asthma' },
  { id: '12', label: 'Cholesterol' },
  { id: '13', label: 'Anxiety' },
  { id: '14', label: 'Depression' },
  { id: '15', label: 'Thyroid' },
  { id: '16', label: 'Pain Relief' },
  { id: '17', label: 'Inflammation' },
  { id: '18', label: 'Prenatal Care' },
  { id: '19', label: 'Vitamin Deficiency' },
  { id: '20', label: 'Heart Condition' },
  { id: '21', label: 'Gastric/Stomach Issues' },
  { id: '22', label: 'Respiratory Issues' },
  { id: '23', label: 'Skin Conditions' },
  { id: '24', label: 'Mental Health' },
  { id: '25', label: 'Neurological' },
  { id: '26', label: 'Autoimmune' },
  { id: '27', label: 'Hormonal Imbalance' },
  { id: '28', label: 'Digestive Issues' },
  { id: '29', label: 'Eye/Vision' },
  { id: '30', label: 'Ear/Hearing' },
  { id: '31', label: 'Kidney Issues' },
  { id: '32', label: 'Liver Issues' },
  { id: '33', label: 'Bone/Joint Health' },
  { id: '34', label: 'Cancer Treatment' },
  { id: '35', label: 'Post-Surgery Recovery' },
  { id: '36', label: 'Immune System Support' },
  { id: '37', label: 'Other' }
];

export const FREQUENCIES = [
  { id: '1', label: 'Once Daily', icon: 'sunny-outline', times: ['09:00'] },
  { id: '2', label: 'Twice Daily', icon: 'sync-outline', times: ['09:00', '21:00'] },
  { id: '3', label: 'Three times Daily', icon: 'time-outline', times: ['09:00', '15:00', '21:00'] },
  { id: '4', label: 'Four times Daily', icon: 'repeat-outline', times: ['09:00', '13:00', '17:00', '21:00'] },
  { id: '5', label: 'Every Morning', icon: 'partly-sunny-outline', times: ['08:00'] },
  { id: '6', label: 'Every Evening', icon: 'moon-outline', times: ['20:00'] },
  { id: '7', label: 'Every 4 Hours', icon: 'timer-outline', times: ['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'] },
  { id: '8', label: 'Every 6 Hours', icon: 'timer-outline', times: ['06:00', '12:00', '18:00', '00:00'] },
  { id: '9', label: 'Every 8 Hours', icon: 'timer-outline', times: ['08:00', '16:00', '00:00'] },
  { id: '10', label: 'Every 12 Hours', icon: 'hourglass-outline', times: ['08:00', '20:00'] },
  { id: '11', label: 'Weekly', icon: 'calendar-outline', times: ['09:00'] },
  { id: '12', label: 'As Needed', icon: 'calendar-outline', times: [] },
];

export const DURATIONS = [
  { id: 1, label: '7 days', value: 7 },
  { id: 2, label: '14 days', value: 14 },
  { id: 3, label: '30 days', value: 30 },
  { id: 4, label: '90 days', value: 90 },
  { id: 5, label: 'On going', value: -1 },
];

// Color palette for medications
export const MEDICATION_COLORS = [
  '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#F44336',
  '#009688', '#795548', '#607D8B', '#3F51B5', '#00BCD4'
];

// Utility function
export const generateRandomColor = () => 
  MEDICATION_COLORS[Math.floor(Math.random() * MEDICATION_COLORS.length)];

// Helper functions for converting between formats
export const convertIllnessTypesToArray = () => ILLNESS_TYPES.map(item => item.label);
export const convertFrequenciesToArray = () => FREQUENCIES.map(item => item.label);
export const convertMedicationTypesToArray = () => MEDICATION_TYPES.map(item => item.label);
export const convertDurationsToArray = () => DURATIONS.map(item => item.label);