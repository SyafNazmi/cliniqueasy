import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import PageHeader from '../../components/PageHeader';

const DateSelection = () => {
  const router = useRouter();
  const { doctorId, doctorName } = useLocalSearchParams();

  const dates = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toDateString();
  });

  const handleDateSelect = (date) => {
    router.push({
      pathname: '/appointment/TimeSlotSelection',
      params: { doctorId, doctorName, date },
    });
  };

  return (
    <View style={{ flex: 1, padding: 20, padding: 16, marginTop: 50 }}>
      <PageHeader onPress={() => router.back()}/>
      <Text>Select Date for Dr. {doctorName}</Text>
      <FlatList
        data={dates}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={{ padding: 10, borderBottomWidth: 1 }}
            onPress={() => handleDateSelect(item)}
          >
            <Text>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default DateSelection;
