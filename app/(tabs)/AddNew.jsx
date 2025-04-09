import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { BranchesData, initializeBranches, COLLECTIONS } from '../../constants';
import { DatabaseService } from '../../configs/AppwriteConfig';

const AddNew = () => {
  const router = useRouter();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadBranches() {
      try {
        // Initialize branch data if needed
        await initializeBranches();
        
        // Try to fetch branches from the database first
        const response = await DatabaseService.listDocuments(COLLECTIONS.BRANCHES, [], 100);
        
        if (response.documents.length > 0) {
          setBranches(response.documents);
        } else {
          // If no branches in database, use local data
          setBranches(BranchesData);
        }
      } catch (error) {
        console.error("Error loading branches:", error);
        // Fallback to local data if there's an error
        setBranches(BranchesData);
      } finally {
        setLoading(false);
      }
    }
    
    loadBranches();
  }, []);

  const handleBranchSelect = (branch) => {
    router.push({
      pathname: '/appointment/branch-details',
      params: { branchId: branch.branch_id, branchName: branch.name }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0AD476" />
        <Text>Loading Branches...</Text>
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

      <Text style={styles.subtitle}>
        Select a branch to continue
      </Text>

      <ScrollView style={styles.branchList}>
        {branches.map((branch) => (
          <TouchableOpacity
            key={branch.branch_id}
            style={styles.branchItem}
            onPress={() => handleBranchSelect(branch)}
          >
            <Text style={styles.branchText}>{branch.name}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginVertical: 30,
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
    fontSize: 18,
    marginVertical: 20,
    textAlign: 'center',
    color: '#333',
  },
  branchList: {
    marginTop: 10,
  },
  branchItem: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  branchText: {
    fontSize: 16,
    color: '#333',
  },
  chevron: {
    fontSize: 20,
    color: '#999',
  },
});

export default AddNew;