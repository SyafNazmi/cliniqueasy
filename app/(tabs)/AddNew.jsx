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
import { RegionsData, searchRegions, COLLECTIONS, BranchesData } from '../../constants/index';

const AddNew = () => {
  const router = useRouter();
  const [regions, setRegions] = useState(RegionsData);
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
          
          // Check and update missing branches automatically
          await checkAndAddMissingBranches();
          
          // Update region hospital counts
          await updateRegionHospitalCounts();
          
          // Reload regions to get updated counts
          const updatedRegions = await DatabaseService.listDocuments(COLLECTIONS.REGIONS, [], 100);
          setRegions(updatedRegions.documents);
        } 
        // If no regions in database, try to create them
        else {
          console.log("No regions found. Creating regions...");
          for (const region of RegionsData) {
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
        // Keep using RegionsData if there's an error
        setRegions(RegionsData);
      } finally {
        setLoading(false);
      }
    }
    
    // Function to check and add missing branches
    async function checkAndAddMissingBranches() {
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
        } else {
          console.log("No missing branches found.");
        }
      } catch (error) {
        console.error("Error checking/adding branches:", error);
      }
    }
    
    // Function to update region hospital counts
    async function updateRegionHospitalCounts() {
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
      } catch (error) {
        console.error("Error updating region counts:", error);
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
  
  // Use enhanced search function from constants
  const filteredRegions = searchRegions(regions, searchQuery);

  // Clear search function
  const clearSearch = () => {
    setSearchQuery('');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0AD476" />
        <Text style={styles.loadingText}>Loading Regions...</Text>
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
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {searchQuery.length > 0 && (
        <Text style={styles.searchResults}>
          {filteredRegions.length} region{filteredRegions.length !== 1 ? 's' : ''} found
        </Text>
      )}

      <Text style={styles.sectionTitle}>Search Hospital by Region</Text>

      {filteredRegions.length === 0 && searchQuery.length > 0 ? (
        <View style={styles.noResultsContainer}>
          <Ionicons name="search" size={48} color="#ccc" />
          <Text style={styles.noResultsTitle}>No regions found</Text>
          <Text style={styles.noResultsSubtitle}>
            Try searching with different keywords
          </Text>
          <TouchableOpacity style={styles.clearSearchButton} onPress={clearSearch}>
            <Text style={styles.clearSearchText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.regionsList} showsVerticalScrollIndicator={false}>
          {filteredRegions.map((region) => (
            <TouchableOpacity
              key={region.region_id}
              style={styles.regionItem}
              onPress={() => handleRegionSelect(region)}
              activeOpacity={0.7}
            >
              <Image 
                source={getRegionImage(region.imagePath)} 
                style={styles.regionImage}
              />
              <View style={styles.regionTextOverlay}>
                <Text style={styles.regionName}>{region.name}</Text>
                <Text style={styles.regionHospitalsCount}>
                  {region.hospitalsCount} clinic{region.hospitalsCount !== 1 ? 's' : ''} available
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
    color: '#333',
  },
  subtitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 20,
    color: '#333',
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
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    marginLeft: 10,
    padding: 2,
  },
  searchResults: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 20,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 16,
    paddingHorizontal: 20,
    color: '#333',
  },
  regionsList: {
    paddingHorizontal: 20,
    flex: 1,
  },
  regionItem: {
    height: 180,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
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
    backgroundColor: 'rgba(0,0,0,0.2)', // More transparent
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
    opacity: 0.9,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  clearSearchButton: {
    backgroundColor: '#0AD476',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearSearchText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default AddNew;