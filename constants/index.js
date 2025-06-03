import { DatabaseService } from '../configs/AppwriteConfig';

export const COLLECTIONS = {
  DOCTORS: '67e033480011d20e04fb',
  BRANCHES: '67f68c760039e7d1a61d',
  REGIONS: '6807cb05000906569d69',
  SERVICES: '67f68c88002d35ec29fe',
  APPOINTMENTS: '67e0332c0001131d71ec',
  PATIENT_PROFILES: '67e032ec0025cf1956ff',
  USER_CONSENTS: '683d6b4300039e895000',
  AUDIT_LOGS: '683d6a87000e08073d43',
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

export const RegionsData = [
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


export const BranchesData = [
  {
    branch_id: "1",
    region_id: "tawau",
    name: "Permai Polyclinics Fajar",
    address: "TB 562, Lot 21, Ground Floor, TB 563, Lot 22, Ground & First Floor, Block C, Tacoln Commercial Complex, Jalan Haji Karim, 91000 Tawau, Sabah.",
    latitude: 4.244,
    longitude: 117.891,
    phone: "+60 89-123456",
    operatingHours: "8:00 AM - 5:00 PM (Mon-Fri), 9:00 AM - 1:00 PM (Sat)",
    openingTime: "08:00 AM",
    closingTime: "05:00 PM",
    imagePath: "polyclinic-fajar"
  },
  {
    branch_id: "2",
    region_id: "semporna",
    name: "Permai Polyclinics Semporna",
    address: "Lot 1 & 2, Wisma Datuk Haji Donald, Jalan Hospital, 91300 Bandar Semporna, Sabah.",
    latitude: 4.485,
    longitude: 118.609,
    phone: "+60 89-654321",
    operatingHours: "8:00 AM - 5:00 PM (Mon-Fri), 9:00 AM - 1:00 PM (Sat)",
    openingTime: "08:00 AM",
    closingTime: "05:00 PM",
    imagePath: "polyclinic-semporna"
  },
  {
    branch_id: "3",
    region_id: "kota_kinabalu",
    name: "Cyber City",
    address: "B10-1, Ground Floor Block B, Kepayan Perdana Commercial Centre, Jalan Lintas, 88200 Kota Kinabalu, Sabah",
    latitude: 5.980,
    longitude: 116.073,
    phone: "+60 88-998877",
    operatingHours: "8:00 AM - 6:00 PM (Mon-Fri), 9:00 AM - 3:00 PM (Sat-Sun)",
    openingTime: "08:00 AM",
    closingTime: "06:00 PM",
    imagePath: "polyclinic-cybercity"
  }
];

export const clinicsImages = {
  // Region images
  'tawau-region': require('../assets/images/tawau.jpeg'),
  'semporna-region': require('../assets/images/semporna.jpg'),
  'kk-region': require('../assets/images/kota-kinabalu.jpg'),
  
  // Clinic images
  'polyclinic-fajar': require('../assets/images/polyclinic-fajar.jpg'),
  'polyclinic-semporna': require('../assets/images/polyclinic-semporna.jpeg'),
  'polyclinic-cybercity': require('../assets/images/polyclinic-kk.jpg'),
};

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
  // Branch 1 doctors
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
    name: "Sarah Johnson",
    specialty: "General Medicine",
    branchId: "1",
    contact: "+60 112-233-4455",
    qualifications: ["MD", "MBBS", "Family Medicine"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor-sarah.png"
  },
  {
    name: "Michael Wong",
    specialty: "Dermatology",
    branchId: "1",
    contact: "+60 334-455-6677",
    qualifications: ["MD", "MBBS", "Dermatology Specialist"],
    availability: ["Monday", "Tuesday", "Thursday"],
    image: "doctor-wong.png"
  },
  
  // Branch 2 doctors
  {
    name: "David Livingston",
    specialty: "Orthopedics",
    branchId: "2",
    contact: "+60 555-123-4567",
    qualifications: ["MD", "MBBS", "Orthopedic Surgeon"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor3.png"
  },
  {
    name: "Jessica Tan",
    specialty: "Neurology",
    branchId: "2",
    contact: "+60 666-777-8899",
    qualifications: ["MD", "PhD", "Neurology Specialist"],
    availability: ["Tuesday", "Thursday", "Saturday"],
    image: "doctor-jessica.png"
  },
  {
    name: "Robert Chen",
    specialty: "ENT",
    branchId: "2",
    contact: "+60 111-222-3344",
    qualifications: ["MD", "MBBS", "Otolaryngologist"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor-chen.png"
  },
  
  // Branch 3 doctors
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
    name: "Emma Lee",
    specialty: "Gynecology",
    branchId: "3",
    contact: "+60 222-333-4455",
    qualifications: ["MD", "MBBS", "Obstetrics & Gynecology"],
    availability: ["Tuesday", "Thursday", "Saturday"],
    image: "doctor-emma.png"
  },
  {
    name: "Ahmad Razak",
    specialty: "Psychiatry",
    branchId: "3",
    contact: "+60 999-888-7766",
    qualifications: ["MD", "PhD", "Psychiatry Specialist"],
    availability: ["Wednesday", "Thursday", "Friday"],
    image: "doctor-ahmad.png"
  }
];

export const doctorImages = {
  "doctor1.png": require("../assets/images/doctor1.png"),
  "doctor2.png": require("../assets/images/doctor2.png"),
  "doctor3.png": require("../assets/images/doctor3.png"),
  "doctor-ahmad.png": require("../assets/images/doctor-ahmad.png"),
  "doctor-chen.png": require("../assets/images/doctor-chen.png"),
  "doctor-emma.png": require("../assets/images/doctor-emma.png"),
  "doctor-jessica.png": require("../assets/images/doctor-jessica.png"),
  "doctor-sarah.png": require("../assets/images/doctor-sarah.png"),
  "doctor-wong.png": require("../assets/images/doctor-wong.png"),
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
    // Check if doctors exist already
    const existingDoctors = await DatabaseService.listDocuments(COLLECTIONS.DOCTORS, [], 100);
    
    // Create a map of existing doctors by name for quick lookup
    const existingDoctorsMap = {};
    existingDoctors.documents.forEach(doc => {
      existingDoctorsMap[doc.name] = doc;
    });
    
    for (const doctor of DoctorsData) {
      if (existingDoctorsMap[doctor.name]) {
        // Doctor exists - check if image needs updating
        const existingDoctor = existingDoctorsMap[doctor.name];
        if (existingDoctor.image !== doctor.image) {
          console.log(`Updating image for doctor: ${doctor.name} from ${existingDoctor.image} to ${doctor.image}`);
          await updateDoctorDocument(existingDoctor.$id, { image: doctor.image });
        }
      } else {
        // Doctor doesn't exist, create new
        console.log(`Creating new doctor: ${doctor.name}`);
        await createDoctorDocument(doctor);
      }
    }

    console.log("Doctors initialization and updates completed successfully.");
  } catch (error) {
    console.error("Error initializing/updating doctors:", error);
  }
}

export async function updateDoctorDocument(doctorId, updateData) {
  const { DatabaseService } = await import('../configs/AppwriteConfig');
  try {
    return await DatabaseService.updateDocument(
      COLLECTIONS.DOCTORS,
      doctorId,
      updateData
    );
  } catch (error) {
    console.error('Error updating doctor document:', error);
    throw error;
  }
}

// Helper function for debugging - Call this in AppointmentBooking.jsx to see what's happening
export async function getDoctorsForBranch(branchId) {
  const { DatabaseService } = await import('../configs/AppwriteConfig');
  try {
    console.log(`Fetching doctors for branch ID: ${branchId}`);
    
    // First check all doctors to debug
    const allDoctors = await DatabaseService.listDocuments(COLLECTIONS.DOCTORS, [], 100);
    console.log(`Total doctors in database: ${allDoctors.documents.length}`);
    
    // Now get branch-specific doctors
    const branchDoctors = await DatabaseService.listDocuments(
      COLLECTIONS.DOCTORS, 
      [DatabaseService.createQuery('equal', 'branchId', String(branchId))],
      100
    );
    
    console.log(`Found ${branchDoctors.documents.length} doctors for branch ${branchId}`);
    return branchDoctors.documents;
  } catch (error) {
    console.error(`Error fetching doctors for branch ${branchId}:`, error);
    throw error;
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

/**
 * Helper function for debugging services - call this in AppointmentBooking.jsx 
 * to check what's happening with services
 */
export async function getServiceDetails(serviceId) {
  const { DatabaseService } = await import('../configs/AppwriteConfig');
  try {
    // Always convert serviceId to string for consistency
    const safeServiceId = String(serviceId);
    console.log(`Fetching service with ID: ${safeServiceId}`);
    
    // First check all services to debug
    const allServices = await DatabaseService.listDocuments(COLLECTIONS.SERVICES, [], 100);
    console.log(`Total services in database: ${allServices.documents.length}`);
    
    if (allServices.documents.length > 0) {
      console.log('Available service_ids in database:');
      allServices.documents.forEach(service => {
        console.log(`- ${service.service_id} (${typeof service.service_id}): ${service.name}`);
      });
    }
    
    // Now get specific service
    const serviceQuery = [
      Query.equal('service_id', safeServiceId)
    ];
    
    console.log(`Executing query: Query.equal('service_id', '${safeServiceId}')`);
    
    const serviceDetails = await DatabaseService.listDocuments(
      COLLECTIONS.SERVICES, 
      serviceQuery,
      1
    );
    
    if (serviceDetails.documents.length > 0) {
      console.log(`Found service: ${serviceDetails.documents[0].name}`);
      return serviceDetails.documents[0];
    } else {
      console.log(`No service found with ID: ${safeServiceId}`);
      
      // Try with local data as fallback
      const { ServicesData } = await import('../constants');
      const localService = ServicesData.find(s => String(s.service_id) === safeServiceId);
      
      if (localService) {
        console.log(`Found service in local data: ${localService.name}`);
        return localService;
      } else {
        console.log(`No service found in local data either.`);
        return null;
      }
    }
  } catch (error) {
    console.error(`Error fetching service details for ${serviceId}:`, error);
    throw error;
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

export async function resetBranches() {
  console.log("Starting branch reset process...");
  try {
    // First, get all existing branches
    console.log("Fetching existing branches...");
    const existingBranches = await DatabaseService.listDocuments(COLLECTIONS.BRANCHES, [], 100);
    console.log(`Found ${existingBranches.documents.length} branches to delete`);
    
    // Delete each branch
    for (const branch of existingBranches.documents) {
      console.log(`Deleting branch: ${branch.name} (ID: ${branch.$id})`);
      try {
        await DatabaseService.deleteDocument(COLLECTIONS.BRANCHES, branch.$id);
        console.log(`Successfully deleted branch: ${branch.name}`);
      } catch (deleteError) {
        console.error(`Failed to delete branch ${branch.name}:`, deleteError);
      }
    }
    
    console.log("All branches deleted. Now re-initializing...");
    
    // Re-initialize branches with current data
    await initializeBranches();
    
    console.log("Branch reset complete!");
    return true;
  } catch (error) {
    console.error("Error during branch reset process:", error);
    return false;
  }
}