import { Models } from 'appwrite';

export const COLLECTIONS = {
  DOCTORS: '67e033480011d20e04fb',
  BRANCHES: '67f68c760039e7d1a61d',
  REGIONS: '6807cb05000906569d69',
  SERVICES: '67f68c88002d35ec29fe',
  APPOINTMENTS: '67e0332c0001131d71ec',
  PATIENT_PROFILES: '67e032ec0025cf1956ff'
};

// Database ID
export const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;

export { COLORS } from '../constants/Colors';

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

const RegionsData = [
  {
    region_id: "tawau",
    name: "Tawau",
    hospitalsCount: 1,
    imagePath: "tawau-region"
  },
  {
    region_id: "semporna",
    name: "Semporna",
    hospitalsCount: 1,
    imagePath: "semporna-region"
  },
  {
    region_id: "kota_kinabalu",
    name: "Kota Kinabalu",
    hospitalsCount: 1,
    imagePath: "kk-region"
  }
];

const BranchesData = [
  {
    branch_id: "1",
    region_id: "tawau",
    name: "Tawau Branch",
    address: "123 Jalan Tawau, Tawau, Sabah",
    latitude: 4.244,
    longitude: 117.891,
    phone: "+60 89-123456",
    operatingHours: "8:00 AM - 5:00 PM (Mon-Fri), 9:00 AM - 1:00 PM (Sat)",
    openingTime: "08:00 AM",
    closingTime: "05:00 PM",
    imagePath: "tawau-clinic"
  },
  {
    branch_id: "2",
    region_id: "semporna",
    name: "Semporna Branch",
    address: "45 Jalan Semporna, Semporna, Sabah",
    latitude: 4.485,
    longitude: 118.609,
    phone: "+60 89-654321",
    operatingHours: "8:00 AM - 5:00 PM (Mon-Fri), 9:00 AM - 1:00 PM (Sat)",
    openingTime: "08:00 AM",
    closingTime: "05:00 PM",
    imagePath: "semporna-clinic"
  },
  {
    branch_id: "3",
    region_id: "kota_kinabalu",
    name: "Kota Kinabalu Branch",
    address: "78 Jalan KK Central, Kota Kinabalu, Sabah",
    latitude: 5.980,
    longitude: 116.073,
    phone: "+60 88-998877",
    operatingHours: "8:00 AM - 6:00 PM (Mon-Fri), 9:00 AM - 3:00 PM (Sat-Sun)",
    openingTime: "08:00 AM",
    closingTime: "06:00 PM",
    imagePath: "kk-clinic"
  }
];

export const clinicsImages = {
  // Region images
  'tawau-region': require('../assets/images/tawau.jpeg'),
  'semporna-region': require('../assets/images/semporna.jpg'),
  'kk-region': require('../assets/images/kota-kinabalu.jpg'),
  
  // Clinic images
  'tawau-clinic': require('../assets/images/polyclinic-fajar.jpg'),
  'semporna-clinic': require('../assets/images/polyclinic-semporna.jpeg'),
  'kk-clinic': require('../assets/images/polyclinic-kk.jpg'),
};

/**
 * Branches Data
 */
// export const BranchesData = [
//   {
//     branch_id: "1",
//     name: "Tawau",
//     address: "123 Jalan Tawau, Tawau, Sabah",
//     latitude: 4.244, 
//     longitude: 117.891,
//     phone: "+60 89-123456",
//     operatingHours: "8:00 AM - 5:00 PM (Mon-Fri), 9:00 AM - 1:00 PM (Sat)"
//   },
//   {
//     branch_id: "2",
//     name: "Semporna",
//     address: "45 Jalan Semporna, Semporna, Sabah",
//     latitude: 4.485, 
//     longitude: 118.609,
//     phone: "+60 89-654321",
//     operatingHours: "8:00 AM - 5:00 PM (Mon-Fri), 9:00 AM - 1:00 PM (Sat)"
//   },
//   {
//     branch_id: "3",
//     name: "Kota Kinabalu",
//     address: "78 Jalan KK Central, Kota Kinabalu, Sabah",
//     latitude: 5.980, 
//     longitude: 116.073,
//     phone: "+60 88-998877",
//     operatingHours: "8:00 AM - 6:00 PM (Mon-Fri), 9:00 AM - 3:00 PM (Sat-Sun)"
//   }
// ];

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

export async function initializeRegions() {
  try {
    const regionsExist = await DatabaseService.listDocuments(COLLECTIONS.REGIONS, [], 1);
    
    // If no regions exist in the database, initialize with default data
    if (regionsExist.documents.length === 0) {
      for (const region of RegionsData) {
        await DatabaseService.createDocument(COLLECTIONS.REGIONS, region);
      }
      console.log("Regions initialized successfully");
    }
  } catch (error) {
    console.error("Error initializing regions:", error);
  }
}

/**
 * Helper function to initialize branches
 */
export async function initializeBranches() {
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
    const existingServices = await DatabaseService.listDocuments(COLLECTIONS.SERVICES, [], 1);
    
    if (existingServices.documents.length > 0) {
      console.log("Services already initialized.");
      return; // Stop if services already exist
    }
    
    // If no services exist, create them
    for (const service of ServicesData) {
      const { service_id, ...serviceWithoutId } = service;
      
      const serviceToCreate = {
        ...serviceWithoutId,
        service_id: service.service_id
      };
      
      await DatabaseService.createDocument(COLLECTIONS.SERVICES, serviceToCreate);
    }
    
    console.log("Services initialized successfully.");
  } catch (error) {
    console.error("Error initializing services:", error);
  }
}

export async function fetchRegions() {
  try {
    return await DatabaseService.listDocuments(COLLECTIONS.REGIONS);
  } catch (error) {
    console.error('Error loading regions:', error);
    throw error;
  }
}

export async function fetchBranches() {
  try {
    return await DatabaseService.listDocuments(COLLECTIONS.BRANCHES);
  } catch (error) {
    console.error('Error loading branches:', error);
    throw error;
  }
}

export async function fetchBranchesByRegion(regionId) {
  try {
    return await DatabaseService.listDocuments(
      COLLECTIONS.BRANCHES,
      [DatabaseService.createQuery('equal', 'region_id', regionId)]
    );
  } catch (error) {
    console.error('Error loading branches by region:', error);
    throw error;
  }
}

export async function fetchServices() {
  try {
    return await DatabaseService.listDocuments(COLLECTIONS.SERVICES);
  } catch (error) {
    console.error('Error fetching services:', error);
    throw error;
  }
}

export async function fetchBranchById(branchId) {
  try {
    return await DatabaseService.getDocument(COLLECTIONS.BRANCHES, branchId);
  } catch (error) {
    console.error('Error fetching branch:', error);
    throw error;
  }
}
  