import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ScrollView, 
  SafeAreaView,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { DatabaseService } from '../../configs/AppwriteConfig';
import PageHeader from '../../components/PageHeader';
import { Ionicons } from '@expo/vector-icons';
import { COLLECTIONS, BranchesData, clinicsImages, fetchBranchesByRegion } from '../../constants/index';

const RegionClinics = () => {
  const router = useRouter();
  const { regionId, regionName } = useLocalSearchParams();
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    async function loadClinics() {
      try {
        console.log("Loading clinics for region:", regionId);
        
        // First set the filtered data from constants to ensure we have something to display
        const filteredBranchesFromConstants = BranchesData.filter(
          branch => branch.region_id === regionId
        );
        console.log("Filtered clinics from constants:", filteredBranchesFromConstants);
        setClinics(filteredBranchesFromConstants);
        
        // Try to fetch branches from the database, filtered by region_id
        try {
          // Use the fetchBranchesByRegion function from constants
          const response = await fetchBranchesByRegion(regionId);
          
          console.log("Database response:", response);
          
          if (response.documents && response.documents.length > 0) {
            console.log("Using clinics from database");
            setClinics(response.documents);
          } else {
            console.log("No clinics in database for this region");
            // We're already using the data from constants, so no need to set it again
            
            // Optionally, initialize branches in the database
            try {
              console.log("Attempting to initialize branches in database...");
              for (const branch of filteredBranchesFromConstants) {
                await DatabaseService.createDocument(COLLECTIONS.BRANCHES, branch);
                console.log(`Created branch ${branch.name} in database`);
              }
            } catch (initError) {
              console.error("Failed to initialize branches:", initError);
            }
          }
        } catch (dbError) {
          console.error("Database error:", dbError);
        }
      } catch (error) {
        console.error("Error loading clinics for region:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadClinics();
  }, [regionId]);

  const handleClinicSelect = (clinic) => {
    router.push({
      pathname: '/appointment/branch-details',
      params: { 
        branchId: clinic.branch_id, 
        branchName: clinic.name 
      }
    });
  };

  const filteredClinics = clinics.filter(clinic => 
    clinic.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0AD476" />
        <Text>Loading Clinics...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <PageHeader onPress={() => router.back()} />
      
      <Text style={styles.title}>Clinics in {regionName}</Text>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for clinics"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {filteredClinics.length === 0 ? (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No clinics found in this region</Text>
        </View>
      ) : (
        <ScrollView style={styles.clinicsList}>
          {filteredClinics.map((clinic) => (
            <TouchableOpacity
              key={clinic.branch_id}
              style={styles.clinicItem}
              onPress={() => handleClinicSelect(clinic)}
            >
              <Image 
                source={getClinicImage(clinic.imagePath)}
                style={styles.clinicImage}
              />
              <View style={styles.clinicInfo}>
                <Text style={styles.clinicName}>{clinic.name}</Text>
                <Text style={styles.clinicAddress} numberOfLines={2}>{clinic.address}</Text>
                <Text style={styles.clinicHours}>{clinic.openingTime} - {clinic.closingTime}</Text>
              </View>
              <View style={styles.directionContainer}>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// Helper function to get clinic images
function getClinicImage(imagePath) {
  return clinicsImages[imagePath] || require('../../assets/images/polyclinic-logo.png');
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
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
  clinicsList: {
    paddingHorizontal: 20,
  },
  clinicItem: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  clinicImage: {
    width: 100,
    height: 100,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  clinicInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  clinicName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clinicAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  clinicHours: {
    fontSize: 13,
    color: '#0AD476',
    fontWeight: '500',
  },
  directionContainer: {
    justifyContent: 'center',
    paddingRight: 15,
  },
  chevron: {
    fontSize: 24,
    color: '#999',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
  },
});

export default RegionClinics;