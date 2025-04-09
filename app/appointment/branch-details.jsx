import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ScrollView, 
  SafeAreaView,
  Linking,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { DatabaseService } from '../../configs/AppwriteConfig';
import { BranchesData, ServicesData, initializeServices, COLLECTIONS } from '../../constants';
import PageHeader from '../../components/PageHeader';

const BranchDetails = () => {
  const router = useRouter();
  const { branchId, branchName } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [branchDetails, setBranchDetails] = useState(null);
  const [services, setServices] = useState([]);
  
  useEffect(() => {
    async function loadData() {
      try {
        // Initialize services data if needed
        await initializeServices();
        
        // Try to fetch branch details from database
        let branchData;
        try {
            const response = await DatabaseService.listDocuments(
                COLLECTIONS.BRANCHES,  // Use COLLECTIONS constant instead of 'branches'
                [DatabaseService.createQuery('equal', 'branch_id', branchId)],
              1
            );
            
            if (response.documents.length > 0) {
              branchData = response.documents[0];
            }
        } catch (error) {
            console.error("Error fetching branch:", error);
        }
        
        // If not found in database, use local data
        if (!branchData) {
            branchData = BranchesData.find(branch => branch.branch_id === branchId);
        }
        
        setBranchDetails(branchData);
        
        // Try to fetch services from database
        try {
          const servicesResponse = await DatabaseService.listDocuments(COLLECTIONS.SERVICES, [], 100);
          
          if (servicesResponse.documents.length > 0) {
            setServices(servicesResponse.documents);
          } else {
            setServices(ServicesData);
          }
        } catch (error) {
          console.error("Error fetching services:", error);
          setServices(ServicesData);
        }
      } catch (error) {
        console.error("Error in loadData:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [branchId]);

  const handleServiceSelect = (service) => {
    router.push({
      pathname: '/appointment/appointmentBooking',
      params: { 
        branchId: branchId, 
        branchName: branchName,
        serviceId: service.service_id || service.$id, 
        serviceName: service.name 
      }
    });
  };

  const openMap = () => {
    if (branchDetails && branchDetails.coordinates) {
      const { latitude, longitude } = branchDetails.coordinates;
      const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0AD476" />
        <Text>Loading branch details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <PageHeader onPress={() => router.back()} />
      
      <ScrollView>
        <View style={styles.header}>
          <Image 
            source={require('../../assets/images/polyclinic-logo.png')} 
            style={styles.logo} 
          />
          <Text style={styles.title}>PolyClinic</Text>
          <Text style={styles.branchName}>{branchName} Branch</Text>
        </View>

        {branchDetails && (
          <View style={styles.locationContainer}>
            <Text style={styles.sectionTitle}>LOCATION DETAILS</Text>
            <View style={styles.locationCard}>
              <Text style={styles.address}>{branchDetails.address}</Text>
              <Text style={styles.phone}>Phone: {branchDetails.phone}</Text>
              <Text style={styles.hours}>
                <Text style={styles.hoursLabel}>Operating Hours:</Text>{'\n'}
                {branchDetails.operatingHours}
              </Text>
              <TouchableOpacity style={styles.mapButton} onPress={openMap}>
                <Text style={styles.mapButtonText}>View on Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.servicesContainer}>
          <Text style={styles.sectionTitle}>AVAILABLE SERVICES</Text>
          <Text style={styles.subtitle}>
            Select a service to schedule an appointment
          </Text>

          {services.map((service) => (
            <TouchableOpacity
              key={service.service_id || service.$id}
              style={styles.serviceItem}
              onPress={() => handleServiceSelect(service)}
            >
              <View style={styles.serviceContent}>
                <Text style={styles.serviceText}>{service.name}</Text>
                <Text style={styles.serviceDescription}>{service.description}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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
  branchName: {
    fontSize: 18,
    color: '#555',
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 20,
    marginBottom: 10,
    marginHorizontal: 20,
  },
  locationContainer: {
    marginBottom: 20,
  },
  locationCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  address: {
    fontSize: 16,
    marginBottom: 8,
  },
  phone: {
    fontSize: 16,
    marginBottom: 8,
    color: '#0066cc',
  },
  hours: {
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 20,
  },
  hoursLabel: {
    fontWeight: 'bold',
  },
  mapButton: {
    backgroundColor: '#0AD476',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  mapButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  servicesContainer: {
    paddingBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 15,
    marginHorizontal: 20,
    color: '#333',
  },
  serviceItem: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceContent: {
    flex: 1,
    paddingRight: 10,
  },
  serviceText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
  },
  chevron: {
    fontSize: 20,
    color: '#999',
  },
});

export default BranchDetails;