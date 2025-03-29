import { Models } from 'appwrite';

/**
 * Gender Options
 */
export const GenderOptions = ["Male", "Female", "Other"];

/**
 * Default Patient Form Values
 */
export const PatientFormDefaultValues = {
  firstName: "",
  lastName: "",
  phone: "",
  birthDate: new Date(),
  gender: "Male",
  address: "",
  occupation: "",
  emergencyContactName: "",
  emergencyContactNumber: "",
  primaryPhysician: "",
  insuranceProvider: "",
  insurancePolicyNumber: "",
  allergies: "",
  currentMedication: "",
  familyMedicalHistory: "",
  pastMedicalHistory: "",
  identificationType: "Birth Certificate",
  identificationNumber: "",
  identificationDocument: [],
  treatmentConsent: false,
  disclosureConsent: false,
  privacyConsent: false,
};

/**
 * Identification Types
 */
export const IdentificationTypes = [
  "Birth Certificate",
  "Driver's License",
  "Medical Insurance Card/Policy",
  "Military ID Card",
  "National Identity Card",
  "Passport",
  "Resident Alien Card (Green Card)",
  "Social Security Card",
  "State ID Card",
  "Student ID Card",
  "Voter ID Card",
];

/**
 * Doctors Data
 */
export const DoctorsData = [
  {
    name: "John Green",
    specialty: "Cardiology",
    polyclinic: "Cyber City",
    contact: "+60 123-456-7890",
    qualifications: ["MD", "MBBS", "Cardiology Specialist"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor1.png"
  },
  {
    name: "Leila Cameron",
    specialty: "Pediatrics",
    polyclinic: "KK Jalan Pantai",
    contact: "+60 987-654-3210",
    qualifications: ["MD", "MBBS", "Pediatrics Specialist"],
    availability: ["Tuesday", "Thursday", "Saturday"],
    image: "doctor2.png"
  },
  {
    name: "David Livingston",
    specialty: "Orthopedics",
    polyclinic: "Asia City",
    contact: "+60 555-123-4567",
    qualifications: ["MD", "MBBS", "Orthopedic Surgeon"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor3.png"
  }
];

export const doctorImages = {
    "doctor1.png": require("../assets/images/doctor1.png"),
    "doctor2.png": require("../assets/images/doctor2.png"),
    "doctor3.png": require("../assets/images/doctor3.png"),
};

/**
 * Status Icons
 */
export const StatusIcon = {
  scheduled: "/assets/icons/checked.png",
  pending: "/assets/icons/pending.png",
  cancelled: "/assets/icons/cancelled.png",
};

/**
 * Helper function to create a doctor document in Appwrite
 */
export async function createDoctorDocument(doctor) {
    const { DatabaseService } = await import('../configs/AppwriteConfig');
    try {
      // No need to stringify, pass the qualifications array directly
      return await DatabaseService.createDocument(
        '67e033480011d20e04fb', // Your doctors collection ID
        doctor
      );
    } catch (error) {
      console.error('Error creating doctor document:', error);
      throw error;
    }
  }

/**
 * Helper function to batch create doctors
 */
export async function initializeDoctors() {
    const { DatabaseService } = await import('../configs/AppwriteConfig');
  
    try {
      // Fetch existing doctors
      const existingDoctors = await DatabaseService.listDocuments('67e033480011d20e04fb', [], 100);
  
      if (existingDoctors.documents.length > 0) {
        console.log("Doctors already initialized.");
        return; // Stop if doctors exist
      }
  
      // If no doctors exist, insert new ones
      for (const doctor of DoctorsData) {
        await createDoctorDocument(doctor);
      }
  
      console.log("Doctors initialized successfully.");
    } catch (error) {
      console.error("Error initializing doctors:", error);
    }
  }