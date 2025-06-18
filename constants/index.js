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

export const PROFILE_TYPES = {
  OWNER: 'owner',
  FAMILY_MEMBER: 'family_member'
};

// You can also add validation helpers
export const PROFILE_TYPE_OPTIONS = [
  { label: 'Owner', value: PROFILE_TYPES.OWNER },
  { label: 'Family Member', value: PROFILE_TYPES.FAMILY_MEMBER }
];

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

// Updated RegionsData with correct hospital counts
export const RegionsData = [
  {
    region_id: "tawau",
    name: "Tawau",
    hospitalsCount: 4, // Updated count
    imagePath: "tawau-region"
  },
  {
    region_id: "semporna",
    name: "Semporna",
    hospitalsCount: 4, // Updated count
    imagePath: "semporna-region"
  },
  {
    region_id: "kota_kinabalu",
    name: "Kota Kinabalu",
    hospitalsCount: 5, // Updated count
    imagePath: "kk-region"
  }
];

// Enhanced BranchesData with more clinics per region
export const BranchesData = [
  // TAWAU REGION CLINICS
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
    branch_id: "4",
    region_id: "tawau",
    name: "Tawau Medical Centre",
    address: "Jalan Dunlop, 91000 Tawau, Sabah",
    latitude: 4.245,
    longitude: 117.895,
    phone: "+60 89-777888",
    operatingHours: "7:00 AM - 11:00 PM (Daily)",
    openingTime: "07:00 AM",
    closingTime: "11:00 PM",
    imagePath: "tawau-medical"
  },
  {
    branch_id: "5",
    region_id: "tawau",
    name: "Klinik Kesihatan Tawau",
    address: "Jalan Hospital, 91000 Tawau, Sabah",
    latitude: 4.240,
    longitude: 117.888,
    phone: "+60 89-555666",
    operatingHours: "8:00 AM - 4:30 PM (Mon-Fri)",
    openingTime: "08:00 AM",
    closingTime: "04:30 PM",
    imagePath: "klinik-kesihatan-tawau"
  },
  {
    branch_id: "6",
    region_id: "tawau",
    name: "Permai Polyclinics Megah Jaya",
    address: "Lot 45, Jalan Cheras, Taman Kinabutan, 91000 Tawau, Sabah",
    latitude: 4.248,
    longitude: 117.892,
    phone: "+60 89-333444",
    operatingHours: "9:00 AM - 9:00 PM (Mon-Sat), 10:00 AM - 6:00 PM (Sun)",
    openingTime: "09:00 AM",
    closingTime: "09:00 PM",
    imagePath: "polyclinic-megahjaya-tawau"
  },

  // SEMPORNA REGION CLINICS
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
    branch_id: "7",
    region_id: "semporna",
    name: "Klinik Kesihatan Semporna",
    address: "Jalan Hospital, 91300 Semporna, Sabah",
    latitude: 4.483,
    longitude: 118.607,
    phone: "+60 89-781234",
    operatingHours: "8:00 AM - 4:30 PM (Mon-Fri)",
    openingTime: "08:00 AM",
    closingTime: "04:30 PM",
    imagePath: "klinik-kesihatan-semporna"
  },
  {
    branch_id: "8",
    region_id: "semporna",
    name: "Permai Polyclinics Semporna II",
    address: "Block B, Lot 12, Jalan Kastam, 91300 Semporna, Sabah",
    latitude: 4.487,
    longitude: 118.611,
    phone: "+60 89-567890",
    operatingHours: "9:00 AM - 8:00 PM (Mon-Sat), 10:00 AM - 4:00 PM (Sun)",
    openingTime: "09:00 AM",
    closingTime: "08:00 PM",
    imagePath: "semporna-family"
  },
  {
    branch_id: "9",
    region_id: "semporna",
    name: "Klinik Warisan Semporna",
    address: "F1-0，Bandar Mutiara, Jalan Hospital, 91308 Semporna, Sabah",
    latitude: 4.481,
    longitude: 118.605,
    phone: "+60 89-445566",
    operatingHours: "8:30 AM - 5:30 PM (Mon-Fri), 9:00 AM - 1:00 PM (Sat)",
    openingTime: "08:30 AM",
    closingTime: "05:30 PM",
    imagePath: "klinik-warisan-semporna"
  },

  // KOTA KINABALU REGION CLINICS
  {
    branch_id: "3",
    region_id: "kota_kinabalu",
    name: "Permai Cyber City",
    address: "B10-1, Ground Floor Block B, Kepayan Perdana Commercial Centre, Jalan Lintas, 88200 Kota Kinabalu, Sabah",
    latitude: 5.980,
    longitude: 116.073,
    phone: "+60 88-998877",
    operatingHours: "8:00 AM - 6:00 PM (Mon-Fri), 9:00 AM - 3:00 PM (Sat-Sun)",
    openingTime: "08:00 AM",
    closingTime: "06:00 PM",
    imagePath: "polyclinic-cybercity"
  },
  {
    branch_id: "10",
    region_id: "kota_kinabalu",
    name: "Permai Asia City",
    address: "Karung Berkunci 2029, 88586 Kota Kinabalu, Sabah",
    latitude: 5.978,
    longitude: 116.075,
    phone: "+60 88-324600",
    operatingHours: "24 Hours (Emergency), 8:00 AM - 5:00 PM (Outpatient)",
    openingTime: "24 Hours",
    closingTime: "24 Hours",
    imagePath: "permai-asiacity"
  },
  {
    branch_id: "11",
    region_id: "kota_kinabalu",
    name: "Permai Jalan Pantai",
    address: "Jalan Damai Luyang, Likas, 88400 Kota Kinabalu, Sabah",
    latitude: 5.985,
    longitude: 116.080,
    phone: "+60 88-428600",
    operatingHours: "8:00 AM - 4:30 PM (Mon-Fri)",
    openingTime: "08:00 AM",
    closingTime: "04:30 PM",
    imagePath: "permai-jalan-pantai"
  },
  {
    branch_id: "12",
    region_id: "kota_kinabalu",
    name: "Permai Api Api",
    address: "Lorong Bersatu, Off Jalan Damai, Luyang, 88300 Kota Kinabalu, Sabah",
    latitude: 5.982,
    longitude: 116.078,
    phone: "+60 88-211333",
    operatingHours: "24 Hours (Emergency), 8:00 AM - 10:00 PM (Outpatient)",
    openingTime: "08:00 AM",
    closingTime: "10:00 PM",
    imagePath: "permai-api-api"
  },
  {
    branch_id: "13",
    region_id: "kota_kinabalu",
    name: "Permai Putatan",
    address: "Riverson, 1, Jalan Damai Luyang, 88300 Kota Kinabalu, Sabah",
    latitude: 5.983,
    longitude: 116.076,
    phone: "+60 88-518911",
    operatingHours: "24 Hours (Emergency), 8:00 AM - 8:00 PM (Specialist)",
    openingTime: "08:00 AM",
    closingTime: "08:00 PM",
    imagePath: "permai-putatan"
  }
];

// Enhanced clinicsImages with new clinic images
export const clinicsImages = {
  // Region images
  'tawau-region': require('../assets/images/tawau.jpeg'),
  'semporna-region': require('../assets/images/semporna.jpg'),
  'kk-region': require('../assets/images/kota-kinabalu.jpg'),
  
  // Tawau region clinic images
  'polyclinic-fajar': require('../assets/images/polyclinic-fajar.jpg'),
  'tawau-medical': require('../assets/images/polyclinic-KMITawau.png'),
  'klinik-kesihatan-tawau': require('../assets/images/pusatkesihatan-tawau.jpg'),
  'polyclinic-megahjaya-tawau': require('../assets/images/polyclinic-megahjaya.jpg'),

  // Semporna region clinic images
  'polyclinic-semporna': require('../assets/images/polyclinic-semporna.jpeg'),
  'klinik-kesihatan-semporna': require('../assets/images/pusatkesihatan-semporna.jpg'),
  'semporna-family': require('../assets/images/polyclinic-semporna2.jpg'),
  'klinik-warisan-semporna': require('../assets/images/clinic-warisansemporna.jpg'),

  // KK region clinic images
  'polyclinic-cybercity': require('../assets/images/polyclinic-kk.jpg'),
  'permai-asiacity': require('../assets/images/polyclinic-asiacity.jpg'), 
  'permai-jalan-pantai': require('../assets/images/polyclinic-jlnpantai.jpeg'), 
  'permai-api-api': require('../assets/images/polyclinic-apiapi.jpg'), 
  'permai-putatan': require('../assets/images/polyclinic-putatan.jpg'),
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
 * Enhanced search function for regions
 */
export const searchRegions = (regions, searchQuery) => {
  if (!searchQuery.trim()) return regions;
  
  const query = searchQuery.toLowerCase().trim();
  
  return regions.filter(region => 
    region.name.toLowerCase().includes(query) ||
    region.region_id.toLowerCase().includes(query)
  );
};

/**
 * Enhanced search function for clinics
 */
export const searchClinics = (clinics, searchQuery) => {
  if (!searchQuery.trim()) return clinics;
  
  const query = searchQuery.toLowerCase().trim();
  
  return clinics.filter(clinic => 
    clinic.name.toLowerCase().includes(query) ||
    clinic.address.toLowerCase().includes(query) ||
    clinic.phone.includes(query.replace(/\s+/g, '')) || // Remove spaces for phone search
    clinic.operatingHours.toLowerCase().includes(query)
  );
};

/**
 * Function to get clinics by region with enhanced filtering
 */
export const getClinicsByRegion = (regionId, searchQuery = '') => {
  const regionClinics = BranchesData.filter(branch => branch.region_id === regionId);
  
  if (!searchQuery.trim()) return regionClinics;
  
  return searchClinics(regionClinics, searchQuery);
};

/**
 * Doctors Data - Enhanced with more doctors for new clinics
 */
export const DoctorsData = [
  // Branch 1 doctors (Permai Polyclinics Fajar - Tawau)
  {
    name: "Leila Cameron",
    specialty: "Pediatrics",
    branchId: "1",
    contact: "+60 89-123-456",
    qualifications: ["MD", "MBBS", "Pediatrics Specialist"],
    availability: ["Tuesday", "Thursday", "Saturday"],
    image: "doctor2.png"
  },
  {
    name: "Sarah Johnson",
    specialty: "General Medicine",
    branchId: "1",
    contact: "+60 89-123-457",
    qualifications: ["MD", "MBBS", "Family Medicine"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor-sarah.png"
  },
  {
    name: "Michael Wong",
    specialty: "Dermatology",
    branchId: "1",
    contact: "+60 89-123-458",
    qualifications: ["MD", "MBBS", "Dermatology Specialist"],
    availability: ["Monday", "Tuesday", "Thursday"],
    image: "doctor-wong.png"
  },
  
  // Branch 2 doctors (Permai Polyclinics Semporna)
  {
    name: "David Livingston",
    specialty: "Orthopedics",
    branchId: "2",
    contact: "+60 89-654-321",
    qualifications: ["MD", "MBBS", "Orthopedic Surgeon"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor3.png"
  },
  {
    name: "Jessica Tan",
    specialty: "Neurology",
    branchId: "2",
    contact: "+60 89-654-322",
    qualifications: ["MD", "PhD", "Neurology Specialist"],
    availability: ["Tuesday", "Thursday", "Saturday"],
    image: "doctor-jessica.png"
  },
  {
    name: "Robert Chen",
    specialty: "ENT",
    branchId: "2",
    contact: "+60 89-654-323",
    qualifications: ["MD", "MBBS", "Otolaryngologist"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor-chen.png"
  },
  
  // Branch 3 doctors (Permai Cyber City - Kota Kinabalu)
  {
    name: "John Green",
    specialty: "Cardiology",
    branchId: "3", 
    contact: "+60 88-998-877",
    qualifications: ["MD", "MBBS", "Cardiology Specialist"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor1.png"
  },
  {
    name: "Emma Lee",
    specialty: "Gynecology",
    branchId: "3",
    contact: "+60 88-998-878",
    qualifications: ["MD", "MBBS", "Obstetrics & Gynecology"],
    availability: ["Tuesday", "Thursday", "Saturday"],
    image: "doctor-emma.png"
  },
  {
    name: "Ahmad Razak",
    specialty: "Psychiatry",
    branchId: "3",
    contact: "+60 88-998-879",
    qualifications: ["MD", "PhD", "Psychiatry Specialist"],
    availability: ["Wednesday", "Thursday", "Friday"],
    image: "doctor-ahmad.png"
  },

  // Branch 4 doctors (Tawau Medical Centre)
  {
    name: "Siti Aminah",
    specialty: "Internal Medicine",
    branchId: "4",
    contact: "+60 89-777-999",
    qualifications: ["MD", "MBBS", "Internal Medicine"],
    availability: ["Monday", "Tuesday", "Wednesday", "Friday"],
    image: "doctor-sarah.png"
  },
  {
    name: "James Lim",
    specialty: "Emergency Medicine",
    branchId: "4",
    contact: "+60 89-777-888",
    qualifications: ["MD", "Emergency Medicine Specialist"],
    availability: ["Daily"],
    image: "doctor1.png"
  },
  {
    name: "Hassan Ibrahim",
    specialty: "Surgery",
    branchId: "4",
    contact: "+60 89-777-887",
    qualifications: ["MD", "MBBS", "General Surgery"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor3.png"
  },

  // Branch 5 doctors (Klinik Kesihatan Tawau)
  {
    name: "Fatimah Ali",
    specialty: "Family Medicine",
    branchId: "5",
    contact: "+60 89-555-777",
    qualifications: ["MD", "MBBS", "Family Medicine"],
    availability: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    image: "doctor2.png"
  },
  {
    name: "Rajesh Kumar",
    specialty: "General Medicine",
    branchId: "5",
    contact: "+60 89-555-778",
    qualifications: ["MD", "MBBS", "General Practice"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor-wong.png"
  },

  // Branch 6 doctors (Permai Polyclinics Megah Jaya - Tawau)
  {
    name: "Catherine Liew",
    specialty: "Pediatrics",
    branchId: "6",
    contact: "+60 89-333-444",
    qualifications: ["MD", "MBBS", "Pediatrics Specialist"],
    availability: ["Tuesday", "Thursday", "Saturday"],
    image: "doctor-emma.png"
  },
  {
    name: "Muhammad Azlan",
    specialty: "Ophthalmology",
    branchId: "6",
    contact: "+60 89-333-445",
    qualifications: ["MD", "MBBS", "Eye Specialist"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor1.png"
  },
  {
    name: "Linda Chong",
    specialty: "Dermatology",
    branchId: "6",
    contact: "+60 89-333-446",
    qualifications: ["MD", "MBBS", "Dermatology Specialist"],
    availability: ["Tuesday", "Thursday", "Saturday"],
    image: "doctor-sarah.png"
  },

  // Branch 7 doctors (Klinik Kesihatan Semporna)
  {
    name: "Norliza Hassan",
    specialty: "Family Medicine",
    branchId: "7",
    contact: "+60 89-781-234",
    qualifications: ["MD", "MBBS", "Family Medicine"],
    availability: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    image: "doctor2.png"
  },
  {
    name: "Peter Goh",
    specialty: "General Medicine",
    branchId: "7",
    contact: "+60 89-781-235",
    qualifications: ["MD", "MBBS", "General Practice"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor3.png"
  },

  // Branch 8 doctors (Permai Polyclinics Semporna II)
  {
    name: "Rashid Omar",
    specialty: "Orthopedics",
    branchId: "8",
    contact: "+60 89-567-890",
    qualifications: ["MD", "MBBS", "Orthopedic Specialist"],
    availability: ["Tuesday", "Thursday", "Saturday"],
    image: "doctor1.png"
  },
  {
    name: "Mei Ling Tan",
    specialty: "Gynecology",
    branchId: "8",
    contact: "+60 89-567-891",
    qualifications: ["MD", "MBBS", "Obstetrics & Gynecology"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor-jessica.png"
  },
  {
    name: "Kevin Lau",
    specialty: "ENT",
    branchId: "8",
    contact: "+60 89-567-892",
    qualifications: ["MD", "MBBS", "Otolaryngologist"],
    availability: ["Monday", "Tuesday", "Thursday"],
    image: "doctor-chen.png"
  },

  // Branch 9 doctors (Klinik Warisan Semporna)
  {
    name: "Zainab Mohd",
    specialty: "Internal Medicine",
    branchId: "9",
    contact: "+60 89-445-566",
    qualifications: ["MD", "MBBS", "Internal Medicine"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor-sarah.png"
  },
  {
    name: "William Chin",
    specialty: "Cardiology",
    branchId: "9",
    contact: "+60 89-445-567",
    qualifications: ["MD", "MBBS", "Cardiology Specialist"],
    availability: ["Tuesday", "Thursday", "Saturday"],
    image: "doctor-wong.png"
  },

  // Branch 10 doctors (Permai Asia City - Kota Kinabalu)
  {
    name: "Richard Teo",
    specialty: "Surgery",
    branchId: "10",
    contact: "+60 88-324-650",
    qualifications: ["MD", "MBBS", "General Surgery"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor3.png"
  },
  {
    name: "Priya Sharma",
    specialty: "Emergency Medicine",
    branchId: "10",
    contact: "+60 88-324-600",
    qualifications: ["MD", "Emergency Medicine"],
    availability: ["Daily"],
    image: "doctor-emma.png"
  },
  {
    name: "Anthony Wong",
    specialty: "Neurology",
    branchId: "10",
    contact: "+60 88-324-651",
    qualifications: ["MD", "PhD", "Neurology Specialist"],
    availability: ["Tuesday", "Thursday", "Saturday"],
    image: "doctor1.png"
  },
  {
    name: "Shalini Krishnan",
    specialty: "Pediatrics",
    branchId: "10",
    contact: "+60 88-324-652",
    qualifications: ["MD", "MBBS", "Pediatrics Specialist"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor-jessica.png"
  },

  // Branch 11 doctors (Permai Jalan Pantai - Kota Kinabalu)
  {
    name: "Marina Abdullah",
    specialty: "General Medicine",
    branchId: "11",
    contact: "+60 88-428-600",
    qualifications: ["MD", "MBBS", "General Practice"],
    availability: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    image: "doctor2.png"
  },
  {
    name: "Daniel Kho",
    specialty: "Dermatology",
    branchId: "11",
    contact: "+60 88-428-601",
    qualifications: ["MD", "MBBS", "Dermatology Specialist"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor-wong.png"
  },
  {
    name: "Sufiah Ismail",
    specialty: "Family Medicine",
    branchId: "11",
    contact: "+60 88-428-602",
    qualifications: ["MD", "MBBS", "Family Medicine"],
    availability: ["Tuesday", "Thursday", "Saturday"],
    image: "doctor-sarah.png"
  },

  // Branch 12 doctors (Permai Api Api - Kota Kinabalu)
  {
    name: "Benjamin Lee",
    specialty: "Emergency Medicine",
    branchId: "12",
    contact: "+60 88-211-333",
    qualifications: ["MD", "Emergency Medicine Specialist"],
    availability: ["Daily"],
    image: "doctor1.png"
  },
  {
    name: "Alicia Fernandez",
    specialty: "Internal Medicine",
    branchId: "12",
    contact: "+60 88-211-334",
    qualifications: ["MD", "MBBS", "Internal Medicine"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor-emma.png"
  },
  {
    name: "Hafiz Rahman",
    specialty: "Orthopedics",
    branchId: "12",
    contact: "+60 88-211-335",
    qualifications: ["MD", "MBBS", "Orthopedic Specialist"],
    availability: ["Tuesday", "Thursday", "Saturday"],
    image: "doctor3.png"
  },
  {
    name: "Grace Lim",
    specialty: "Gynecology",
    branchId: "12",
    contact: "+60 88-211-336",
    qualifications: ["MD", "MBBS", "Obstetrics & Gynecology"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor-jessica.png"
  },

  // Branch 13 doctors (Permai Putatan - Kota Kinabalu)
  {
    name: "Steven Chew",
    specialty: "Cardiology",
    branchId: "13",
    contact: "+60 88-518-911",
    qualifications: ["MD", "MBBS", "Cardiology Specialist"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor1.png"
  },
  {
    name: "Nadia Ahmad",
    specialty: "Psychiatry",
    branchId: "13",
    contact: "+60 88-518-912",
    qualifications: ["MD", "PhD", "Psychiatry Specialist"],
    availability: ["Tuesday", "Thursday", "Saturday"],
    image: "doctor-sarah.png"
  },
  {
    name: "Marcus Tan",
    specialty: "Surgery",
    branchId: "13",
    contact: "+60 88-518-913",
    qualifications: ["MD", "MBBS", "General Surgery"],
    availability: ["Monday", "Tuesday", "Thursday"],
    image: "doctor3.png"
  },
  {
    name: "Farah Zainal",
    specialty: "ENT",
    branchId: "13",
    contact: "+60 88-518-914",
    qualifications: ["MD", "MBBS", "Otolaryngologist"],
    availability: ["Wednesday", "Friday", "Saturday"],
    image: "doctor-chen.png"
  },
  {
    name: "Jonathan Yap",
    specialty: "Ophthalmology",
    branchId: "13",
    contact: "+60 88-518-915",
    qualifications: ["MD", "MBBS", "Eye Specialist"],
    availability: ["Monday", "Wednesday", "Friday"],
    image: "doctor-wong.png"
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

// Rest of the existing functions remain the same...
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

/**
 * Check and add any missing branches to database
 */
export async function checkAndAddMissingBranches() {
  try {
    console.log("Checking for missing branches...");
    
    // Get existing branches
    const existingBranches = await DatabaseService.listDocuments(COLLECTIONS.BRANCHES, [], 100);
    const existingBranchIds = new Set(existingBranches.documents.map(b => b.branch_id));
    
    // Find missing branches
    const missingBranches = BranchesData.filter(b => !existingBranchIds.has(b.branch_id));
    
    if (missingBranches.length > 0) {
      console.log(`Found ${missingBranches.length} missing branches. Adding them...`);
      
      // Add missing branches
      for (const branch of missingBranches) {
        try {
          const { branch_id, ...branchData } = branch;
          const branchToCreate = {
            ...branchData,
            branch_id: branch.branch_id
          };
          
          await DatabaseService.createDocument(COLLECTIONS.BRANCHES, branchToCreate);
          console.log(`✅ Added branch: ${branch.name}`);
        } catch (error) {
          console.error(`❌ Failed to add branch ${branch.name}:`, error);
        }
      }
      return { success: true, added: missingBranches.length };
    } else {
      console.log("No missing branches found.");
      return { success: true, added: 0 };
    }
  } catch (error) {
    console.error("Error checking/adding branches:", error);
    return { success: false, error };
  }
}

/**
 * Update region hospital counts based on actual branches in database
 */
export async function updateRegionHospitalCounts() {
  try {
    console.log("Updating region hospital counts...");
    
    // Get all branches
    const allBranches = await DatabaseService.listDocuments(COLLECTIONS.BRANCHES, [], 100);
    
    // Count branches per region
    const regionCounts = {};
    allBranches.documents.forEach(branch => {
      regionCounts[branch.region_id] = (regionCounts[branch.region_id] || 0) + 1;
    });
    
    console.log("Branch counts per region:", regionCounts);
    
    // Get all regions
    const regions = await DatabaseService.listDocuments(COLLECTIONS.REGIONS, [], 100);
    
    // Update each region's hospital count if needed
    for (const region of regions.documents) {
      const actualCount = regionCounts[region.region_id] || 0;
      if (region.hospitalsCount !== actualCount) {
        console.log(`Updating ${region.name}: ${region.hospitalsCount} → ${actualCount} clinics`);
        
        await DatabaseService.updateDocument(
          COLLECTIONS.REGIONS,
          region.$id,
          { hospitalsCount: actualCount }
        );
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error updating region counts:", error);
    return { success: false, error };
  }
}