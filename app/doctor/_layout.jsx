// app/doctor/_layout.jsx - Updated with profile screen
import React from 'react';
import { Stack } from 'expo-router';
import RoleProtected from '../../components/RoleProtected';

export default function DoctorLayout() {
  return (
    <RoleProtected requiredRole="doctor" redirectPath="(tabs)">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="appointments" />
        <Stack.Screen name="prescriptions" />
        <Stack.Screen name="patients" />
        <Stack.Screen name="profile" />
      </Stack>
    </RoleProtected>
  );
}