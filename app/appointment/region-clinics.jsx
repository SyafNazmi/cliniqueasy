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
import { 
  COLLECTIONS, 
  BranchesData, 
  clinicsImages, 
  fetchBranchesByRegion, 
  searchClinics, 
  getClinicsByRegion 
} from '../../constants/index';

const RegionClinics = () => {
  const router = useRouter();
  const { regionId, regionName } = useLocalSearchParams();
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    loadClinics();
  }, [regionId]);

  const loadClinics = async () => {
    try {
      console.log("Loading clinics for region:", regionId);
      
      // First set the filtered data from constants to ensure we have something to display
      const filteredBranchesFromConstants = getClinicsByRegion(regionId);
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
            
            // After creating, fetch again
            const freshResponse = await fetchBranchesByRegion(regionId);
            if (freshResponse.documents && freshResponse.documents.length > 0) {
              setClinics(freshResponse.documents);
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
      setRefreshing(false);
    }
  };

  const handleClinicSelect = (clinic) => {
    router.push({
      pathname: '/appointment/branch-details',
      params: { 
        branchId: clinic.branch_id || clinic.$id, 
        branchName: clinic.name 
      }
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadClinics();
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Use enhanced search function from constants
  const filteredClinics = searchClinics(clinics, searchQuery);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0AD476" />
        <Text style={styles.loadingText}>Loading Clinics...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <PageHeader onPress={() => router.back()} />
      
      <View style={styles.headerSection}>
        <Text style={styles.title}>Clinics in {regionName}</Text>
        <Text style={styles.subtitle}>
          {clinics.length} clinic{clinics.length !== 1 ? 's' : ''} available
        </Text>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, address, or phone"
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
        <View style={styles.searchResultsContainer}>
          <Text style={styles.searchResults}>
            {filteredClinics.length} clinic{filteredClinics.length !== 1 ? 's' : ''} found
          </Text>
          {filteredClinics.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Text style={styles.showAllText}>Show all</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {filteredClinics.length === 0 && searchQuery.length > 0 ? (
        <View style={styles.noResultsContainer}>
          <Ionicons name="search" size={48} color="#ccc" />
          <Text style={styles.noResultsTitle}>No clinics found</Text>
          <Text style={styles.noResultsSubtitle}>
            Try searching with different keywords like clinic name, address, or phone number
          </Text>
          <TouchableOpacity style={styles.clearSearchButton} onPress={clearSearch}>
            <Text style={styles.clearSearchText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      ) : filteredClinics.length === 0 ? (
        <View style={styles.noResultsContainer}>
          <Ionicons name="medical" size={48} color="#ccc" />
          <Text style={styles.noResultsTitle}>No clinics available</Text>
          <Text style={styles.noResultsSubtitle}>
            There are currently no clinics in this region
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          style={styles.clinicsList}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        >
          {filteredClinics.map((clinic, index) => (
            <TouchableOpacity
              key={clinic.branch_id || clinic.$id || index}
              style={[
                styles.clinicItem,
                index === filteredClinics.length - 1 && styles.lastClinicItem
              ]}
              onPress={() => handleClinicSelect(clinic)}
              activeOpacity={0.7}
            >
              <Image 
                source={getClinicImage(clinic.imagePath)}
                style={styles.clinicImage}
              />
              <View style={styles.clinicInfo}>
                <Text style={styles.clinicName} numberOfLines={2}>{clinic.name}</Text>
                <View style={styles.clinicAddressContainer}>
                  <Ionicons name="location-outline" size={14} color="#666" />
                  <Text style={styles.clinicAddress} numberOfLines={2}>
                    {clinic.address}
                  </Text>
                </View>
                <View style={styles.clinicDetailsRow}>
                  <View style={styles.clinicHoursContainer}>
                    <Ionicons name="time-outline" size={14} color="#0AD476" />
                    <Text style={styles.clinicHours}>
                      {clinic.openingTime} - {clinic.closingTime}
                    </Text>
                  </View>
                  <View style={styles.clinicPhoneContainer}>
                    <Ionicons name="call-outline" size={14} color="#666" />
                    <Text style={styles.clinicPhone} numberOfLines={1}>
                      {clinic.phone}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.directionContainer}>
                <Ionicons name="chevron-forward" size={20} color="#0AD476" />
              </View>
            </TouchableOpacity>
          ))}
          {/* Add some bottom padding */}
          <View style={styles.bottomPadding} />
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
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  headerSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
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
  searchResultsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  searchResults: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  showAllText: {
    fontSize: 14,
    color: '#0AD476',
    fontWeight: '500',
  },
  clinicsList: {
    paddingHorizontal: 20,
    flex: 1,
  },
  clinicItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eaeaea',
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  lastClinicItem: {
    marginBottom: 20,
  },
  clinicImage: {
    width: 100,
    height: 120,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  clinicInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  clinicName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    lineHeight: 20,
  },
  clinicAddressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  clinicAddress: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    flex: 1,
    lineHeight: 16,
  },
  clinicDetailsRow: {
    flexDirection: 'column',
    gap: 4,
  },
  clinicHoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clinicHours: {
    fontSize: 12,
    color: '#0AD476',
    fontWeight: '500',
    marginLeft: 4,
  },
  clinicPhoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clinicPhone: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  directionContainer: {
    justifyContent: 'center',
    paddingRight: 15,
    paddingLeft: 8,
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
    lineHeight: 22,
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
  refreshButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  refreshText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 20,
  },
});

export default RegionClinics;