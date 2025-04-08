import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import PageHeader from '../../components/PageHeader';

const services = ['Dental Checkup', 'Skin Consultation', 'Eye Exam', 'Physiotherapy'];

const ServiceSelection = () => {
  const router = useRouter();

  const handleSelect = (serviceName) => {
    router.push({
      pathname: '/appointment',
      params: { serviceName },
    });
  };

  return (
    <View style={{ padding: 20, marginTop: 50 }}>
      <PageHeader onPress={() => router.back()}/>  
      <Text style={{ fontSize: 20, marginBottom: 20 }}>Select a Service</Text>
      <FlatList
        data={services}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={{ padding: 10, borderBottomWidth: 1 }}
            onPress={() => handleSelect(item)}
          >
            <Text>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default ServiceSelection;
