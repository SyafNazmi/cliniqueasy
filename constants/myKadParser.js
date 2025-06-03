// constants/myKadParser.js
export const parseMyKadData = (ocrText) => {
    console.log('Raw OCR Text:', ocrText);
    
    const data = {
      icNumber: null,
      name: null,
      address: null,
      dateOfBirth: null,
      gender: null,
      state: null,
      religion: null
    };
  
    try {
      // Extract IC Number (XXXXXX-XX-XXXX format)
      const icRegex = /\d{6}-\d{2}-\d{4}/g;
      const icMatch = ocrText.match(icRegex);
      if (icMatch) {
        data.icNumber = icMatch[0];
        
        // Extract additional info from IC
        const icData = parseICNumber(data.icNumber);
        data.dateOfBirth = icData.dateOfBirth;
        data.gender = icData.gender;
        data.state = icData.state;
      }
  
      // Extract Name (usually after "Nama" or between IC and address)
      // Try multiple patterns for better accuracy
      const namePatterns = [
        /(?:Nama|Name)\s*:?\s*([A-Z\s]+)/i,
        /WARGANEGARA\s+([A-Z\s]+?)(?=\n|$)/i,
        /\n([A-Z\s]{10,})\n/  // Fallback: Look for uppercase text on its own line
      ];
      
      for (const pattern of namePatterns) {
        const nameMatch = ocrText.match(pattern);
        if (nameMatch) {
          data.name = nameMatch[1].trim();
          break;
        }
      }
  
      // Extract Address (multiple lines, usually after name)
      const addressPatterns = [
        /(?:Alamat|Address)\s*:?\s*([\s\S]*?)(?=\d{5}|\n\n|$)/i,
        /\n([\d\w\s,.-]+(?:\n[\d\w\s,.-]+){1,3})\s*\d{5}/i  // Look for multi-line text before postcode
      ];
      
      for (const pattern of addressPatterns) {
        const addressMatch = ocrText.match(pattern);
        if (addressMatch) {
          data.address = addressMatch[1]
            .trim()
            .replace(/\s+/g, ' ')  // Normalize whitespace
            .replace(/\n/g, ', '); // Replace newlines with commas
          break;
        }
      }
  
      // Extract Religion (if present)
      const religionRegex = /(?:Agama|Religion)\s*:?\s*([A-Z]+)/i;
      const religionMatch = ocrText.match(religionRegex);
      if (religionMatch) {
        data.religion = religionMatch[1].trim();
      }
  
    } catch (error) {
      console.error('Error parsing MyKad data:', error);
    }
  
    return data;
  };
  
  // Parse IC Number for additional information
  export const parseICNumber = (icNumber) => {
    if (!icNumber || !icNumber.match(/\d{6}-\d{2}-\d{4}/)) {
      return { dateOfBirth: null, gender: null, state: null };
    }
  
    const [datePart, statePart, genderPart] = icNumber.split('-');
    
    // Extract Date of Birth
    const year = parseInt(datePart.substring(0, 2));
    const month = parseInt(datePart.substring(2, 4));
    const day = parseInt(datePart.substring(4, 6));
    
    // Century logic: 00-30 = 2000s, 31-99 = 1900s
    const fullYear = year <= 30 ? 2000 + year : 1900 + year;
    
    // Format as DD/MM/YYYY for your form
    const formattedDate = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${fullYear}`;
  
    // Extract Gender (last digit: odd = male, even = female)
    const lastDigit = parseInt(genderPart.slice(-1));
    const gender = lastDigit % 2 === 1 ? 'male' : 'female'; // lowercase to match your schema
  
    // Extract State (state codes)
    const stateCode = parseInt(statePart);
    const state = getStateFromCode(stateCode);
  
    // Calculate age
    const today = new Date();
    const birthDate = new Date(fullYear, month - 1, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  
    return { 
      dateOfBirth: formattedDate, 
      gender, 
      state,
      age: age.toString()
    };
  };
  
  // Malaysian state codes mapping
  const getStateFromCode = (code) => {
    const stateCodes = {
      1: 'Johor', 
      2: 'Kedah', 
      3: 'Kelantan', 
      4: 'Malacca',
      5: 'Negeri Sembilan', 
      6: 'Pahang', 
      7: 'Penang', 
      8: 'Perak',
      9: 'Perlis', 
      10: 'Selangor', 
      11: 'Terengganu', 
      12: 'Sabah',
      13: 'Sarawak', 
      14: 'Kuala Lumpur', 
      15: 'Labuan', 
      16: 'Putrajaya',
      21: 'Johor', 
      22: 'Johor', 
      23: 'Johor', 
      24: 'Johor',
      25: 'Kedah', 
      26: 'Kedah', 
      27: 'Kedah', 
      28: 'Kelantan',
      29: 'Kelantan', 
      30: 'Malacca', 
      31: 'Negeri Sembilan',
      32: 'Pahang', 
      33: 'Pahang', 
      34: 'Penang', 
      35: 'Penang',
      36: 'Perak', 
      37: 'Perak', 
      38: 'Perak', 
      39: 'Perak',
      40: 'Perlis', 
      41: 'Selangor', 
      42: 'Selangor', 
      43: 'Selangor',
      44: 'Selangor', 
      45: 'Terengganu', 
      46: 'Terengganu',
      47: 'Sabah', 
      48: 'Sabah', 
      49: 'Sabah', 
      50: 'Sarawak',
      51: 'Sarawak', 
      52: 'Sarawak', 
      53: 'Sarawak',
      54: 'Kuala Lumpur', 
      55: 'Kuala Lumpur', 
      56: 'Kuala Lumpur',
      57: 'Kuala Lumpur', 
      58: 'Labuan', 
      59: 'Negeri Sembilan',
      60: 'Brunei', 
      61: 'Indonesia', 
      62: 'Cambodia/Myanmar/Vietnam',
      63: 'India', 
      64: 'Pakistan', 
      65: 'Bangladesh',
      66: 'Singapore', 
      67: 'China', 
      68: 'Thailand', 
      69: 'Philippines',
      70: 'Not Specified',
      71: 'Foreign', 
      72: 'Foreign', 
      73: 'Foreign',
      74: 'Foreign', 
      75: 'Foreign', 
      76: 'Foreign',
      77: 'Foreign', 
      78: 'Foreign', 
      79: 'Foreign',
      82: 'Negeri Sembilan', 
      83: 'Negeri Sembilan',
      84: 'Negeri Sembilan', 
      85: 'Philippines', 
      86: 'Philippines',
      87: 'British', 
      88: 'Australian', 
      89: 'New Zealand',
      90: 'United States', 
      91: 'India', 
      92: 'Pakistan',
      93: 'Saudi Arabia', 
      98: 'Not Specified', 
      99: 'Not Specified'
    };
    
    return stateCodes[code] || 'Unknown';
  };