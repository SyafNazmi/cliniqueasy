import { Models } from 'appwrite';

export const COLLECTIONS = {
  DOCTORS: '67e033480011d20e04fb',
  BRANCHES: '67f68c760039e7d1a61d',
  SERVICES: '67f68c88002d35ec29fe',
  APPOINTMENTS: '67e0332c0001131d71ec'
};

// Database ID
export const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;

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
 * Branches Data
 */
export const BranchesData = [
  {
    branch_id: "1",
    name: "Tawau",
    address: "123 Jalan Tawau, Tawau, Sabah",
    latitude: 4.244, 
    longitude: 117.891,
    phone: "+60 89-123456",
    operatingHours: "8:00 AM - 5:00 PM (Mon-Fri), 9:00 AM - 1:00 PM (Sat)"
  },
  {
    branch_id: "2",
    name: "Semporna",
    address: "45 Jalan Semporna, Semporna, Sabah",
    latitude: 4.485, 
    longitude: 118.609,
    phone: "+60 89-654321",
    operatingHours: "8:00 AM - 5:00 PM (Mon-Fri), 9:00 AM - 1:00 PM (Sat)"
  },
  {
    branch_id: "3",
    name: "Kota Kinabalu",
    address: "78 Jalan KK Central, Kota Kinabalu, Sabah",
    latitude: 5.980, 
    longitude: 116.073,
    phone: "+60 88-998877",
    operatingHours: "8:00 AM - 6:00 PM (Mon-Fri), 9:00 AM - 3:00 PM (Sat-Sun)"
  }
];

/**
 * Services Data
 */
export const ServicesData = [
  { 
    service_id: "1", 
    name: "Health Check-ups and Preventive Care",
    description: "Comprehensive health screening and preventive services",
    duration: "Approximately 45 minutes",
    fee: "RM 120, Non-refundable"
  },
  { 
    service_id: "2", 
    name: "Diagnosis and Treatment of Common Illnesses",
    description: "Consultation and treatment for common health issues",
    duration: "Approximately 30 minutes",
    fee: "RM 80, Non-refundable"
  },
  { 
    service_id: "3", 
    name: "Vaccinations and Immunizations",
    description: "Various vaccines and immunization services",
    duration: "Approximately 20 minutes",
    fee: "RM 60, Non-refundable"
  }
];

/**
 * Doctors Data
 */
export const DoctorsData = [
  {
    name: "John Green",
    specialty: "Cardiology",
    branchId: "3", 
    contact: "+60 123-456-7890",
    qualifications: ["MD", "MBBS", "Cardiology Specialist"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor1.png"
  },
  {
    name: "Leila Cameron",
    specialty: "Pediatrics",
    branchId: "1",
    contact: "+60 987-654-3210",
    qualifications: ["MD", "MBBS", "Pediatrics Specialist"],
    availability: ["Tuesday", "Thursday", "Saturday"],
    image: "doctor2.png"
  },
  {
    name: "David Livingston",
    specialty: "Orthopedics",
    branchId: "2",
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

export async function createDoctorDocument(doctor) {
  const { DatabaseService } = await import('../configs/AppwriteConfig');
  try {
    return await DatabaseService.createDocument(
      COLLECTIONS.DOCTORS, 
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
    const existingDoctors = await DatabaseService.listDocuments(COLLECTIONS.DOCTORS, [], 100);

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

/**
 * Helper function to initialize branches
 */
export async function initializeBranches() {
  const { DatabaseService } = await import('../configs/AppwriteConfig');
  
  try {
    // Check if the branches collection exists and has data
    const existingBranches = await DatabaseService.listDocuments(COLLECTIONS.BRANCHES, [], 100);
    
    if (existingBranches.documents.length > 0) {
      console.log("Branches already initialized.");
      return; // Stop if branches already exist
    }
    
    // If no branches exist, create them
    for (const branch of BranchesData) {
      // Create a modified branch object without the branch_id field
      const { branch_id, ...branchWithoutId } = branch;
      
      // Add the branch_id as a custom attribute
      const branchToCreate = {
        ...branchWithoutId,
        branch_id: branch.branch_id
      };
      
      await DatabaseService.createDocument(COLLECTIONS.BRANCHES, branchToCreate);
    }
    
    console.log("Branches initialized successfully.");
  } catch (error) {
    console.error("Error initializing branches:", error);
  }
}

/**
 * Helper function to initialize services
 */
export async function initializeServices() {
  const { DatabaseService } = await import('../configs/AppwriteConfig');
  
  try {
    // Check if the services collection exists and has data
    const existingServices = await DatabaseService.listDocuments(COLLECTIONS.SERVICES, [], 100);
    
    if (existingServices.documents.length > 0) {
      console.log("Services already initialized.");
      return; // Stop if services already exist
    }
    
    // If no services exist, create them
    for (const service of ServicesData) {
      await DatabaseService.createDocument(COLLECTIONS.SERVICES, service);
    }
    
    console.log("Services initialized successfully.");
  } catch (error) {
    console.error("Error initializing services:", error);
  }
}

export async function fetchBranches() {
  const { DatabaseService } = await import('../configs/AppwriteConfig');
  try {
    return await DatabaseService.listDocuments(COLLECTIONS.BRANCHES);
  } catch (error) {
    console.error('Error loading branches:', error);
    throw error;
  }
}

export async function fetchServices() {
  const { DatabaseService } = await import('../configs/AppwriteConfig');
  try {
    return await DatabaseService.listDocuments(COLLECTIONS.SERVICES);
  } catch (error) {
    console.error('Error fetching services:', error);
    throw error;
  }
}

export async function fetchBranchById(branchId) {
  const { DatabaseService } = await import('../configs/AppwriteConfig');
  try {
    return await DatabaseService.getDocument(COLLECTIONS.BRANCHES, branchId);
  } catch (error) {
    console.error('Error fetching branch:', error);
    throw error;
  }
}
  