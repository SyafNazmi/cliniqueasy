import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ScrollView, 
  SafeAreaView,
  TextInput,
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService } from '../../configs/AppwriteConfig';

// Hardcoded data for regions
const HARDCODED_REGIONS = [
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

// Collection IDs
const COLLECTIONS = {
  REGIONS: '6807cb05000906569d69',
  BRANCHES: '67f68c760039e7d1a61d',
  SERVICES: '67f68c88002d35ec29fe'
};

const AddNew = () => {
  const router = useRouter();
  const [regions, setRegions] = useState(HARDCODED_REGIONS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    async function initializeAndLoadRegions() {
      setLoading(true);
      try {
        // First try to check if regions exist
        const regionsCheck = await DatabaseService.listDocuments(COLLECTIONS.REGIONS, [], 100);
        console.log("Regions check:", regionsCheck);
        
        // If regions exist, use them
        if (regionsCheck.documents.length > 0) {
          console.log("Using regions from database");
          setRegions(regionsCheck.documents);
        } 
        // If no regions in database, try to create them
        else {
          console.log("No regions found. Creating regions...");
          for (const region of HARDCODED_REGIONS) {
            try {
              await DatabaseService.createDocument(COLLECTIONS.REGIONS, region);
              console.log("Created region:", region.name);
            } catch (err) {
              console.error("Error creating region:", err);
            }
          }
          
          // Try to fetch again after creation
          try {
            const freshRegions = await DatabaseService.listDocuments(COLLECTIONS.REGIONS, [], 100);
            if (freshRegions.documents.length > 0) {
              setRegions(freshRegions.documents);
            }
          } catch (fetchError) {
            console.error("Error fetching new regions:", fetchError);
          }
        }
      } catch (error) {
        console.error("Error initializing regions:", error);
        // Keep using hardcoded regions if there's an error
      } finally {
        setLoading(false);
      }
    }
    
    initializeAndLoadRegions();
  }, []);

  const handleRegionSelect = (region) => {
    router.push({
      pathname: '/appointment/region-clinics',
      params: { 
        regionId: region.region_id, 
        regionName: region.name 
      }
    });
  };
  
  // Filter regions based on search query
  const filteredRegions = regions.filter(region => 
    region.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0AD476" />
        <Text>Loading Regions...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/polyclinic-logo.png')} 
          style={styles.logo} 
        />
        <Text style={styles.title}>PolyClinic</Text>
      </View>
      
      <Text style={styles.subtitle}>Select Your Region</Text>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for regions"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <Text style={styles.sectionTitle}>Search Hospital by Region</Text>

      <ScrollView style={styles.regionsList}>
        {filteredRegions.map((region) => (
          <TouchableOpacity
            key={region.region_id}
            style={styles.regionItem}
            onPress={() => handleRegionSelect(region)}
          >
            <Image 
              source={getRegionImage(region.imagePath)} 
              style={styles.regionImage}
            />
            <View style={styles.regionTextOverlay}>
              <Text style={styles.regionName}>{region.name}</Text>
              <Text style={styles.regionHospitalsCount}>
                {region.hospitalsCount} hospitals available
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

// Helper function to get the correct image
function getRegionImage(imagePath) {
  const images = {
    'tawau-region': require('../../assets/images/tawau.jpeg'),
    'semporna-region': require('../../assets/images/semporna.jpg'),
    'kk-region': require('../../assets/images/kota-kinabalu.jpg')
  };
  
  return images[imagePath] || require('../../assets/images/polyclinic-logo.png');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5cbeff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 15,
    height: 50,
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  regionsList: {
    paddingHorizontal: 20,
  },
  regionItem: {
    height: 180,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  regionImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  regionTextOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  regionName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  regionHospitalsCount: {
    fontSize: 16,
    color: 'white',
    marginTop: 4,
  }
});

export default AddNew;