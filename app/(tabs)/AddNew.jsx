import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

const AddNew = () => {
  const router = useRouter();

  const services = [
    { id: '1', name: 'In-clinic consultation' },
    { id: '2', name: 'Online consultation' },
    { id: '3', name: 'Prenatal Care' },
    { id: '4', name: '5D Scan' },
  ];

  const handleServiceSelect = (service) => {
    router.push({
      pathname: '/appointment',
      params: { serviceId: service.id, serviceName: service.name }
    });
  };

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
        What type of appointment would you like to schedule?
      </Text>

      <ScrollView style={styles.serviceList}>
        {services.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={styles.serviceItem}
            onPress={() => handleServiceSelect(service)}
          >
            <Text style={styles.serviceText}>{service.name}</Text>
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
  serviceList: {
    marginTop: 10,
  },
  serviceItem: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceText: {
    fontSize: 16,
    color: '#333',
  },
  chevron: {
    fontSize: 20,
    color: '#999',
  },
});

export default AddNew;