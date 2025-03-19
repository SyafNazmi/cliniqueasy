import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import Ionicons from '@expo/vector-icons/Ionicons';

export default function PageHeader({ onPress }) {
  return (
    <TouchableOpacity 
      onPress={onPress}  
      style={{ display: 'flex', flexDirection: 'row', gap: 6, alignItems: 'center' }}
    >
      <Ionicons name="arrow-back-circle-outline" size={30} color="black" />
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Back</Text>
    </TouchableOpacity>
  )
}
