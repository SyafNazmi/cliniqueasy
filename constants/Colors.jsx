// constants/colors.js
// You can create this file to maintain a consistent color palette across your app

export const COLORS = {
  // Primary brand colors
  primary: '#0AD476',      // Main green primary color
  primaryLight: '#d1fae5', // Light green background
  primaryDark: '#059669',  // Darker green for pressed states
  
  // Secondary colors
  secondary: '#3B82F6',    // Blue for secondary actions
  secondaryLight: '#dbeafe',
  secondaryDark: '#2563eb',
  
  // Accent colors
  accent1: '#8B5CF6',      // Purple for certain highlights
  accent2: '#F59E0B',      // Orange for warnings/notifications
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  
  // Gray scale
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  
  // Status colors
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  
  // Service-specific colors (for appointment cards)
  checkup: '#3B82F6',      // Blue for health check-ups
  diagnosis: '#8B5CF6',    // Purple for diagnosis appointments
  vaccination: '#F59E0B',  // Orange for vaccinations
  general: '#0AD476',      // Green for general appointments
  
  // Background colors
  background: '#FFFFFF',
  surfaceLight: '#f5f7fa',
  surface: '#FFFFFF',
  
  // Transparent colors (with alpha)
  transparentPrimary: 'rgba(10, 212, 118, 0.1)',  // Very light green background
  transparentLight: 'rgba(255, 255, 255, 0.2)',
  transparentDark: 'rgba(0, 0, 0, 0.1)',
};

// Usage example:
// import { COLORS } from '../constants/colors';
// 
// const styles = StyleSheet.create({
//   container: {
//     backgroundColor: COLORS.background,
//   },
//   button: {
//     backgroundColor: COLORS.primary,
//   },
//   text: {
//     color: COLORS.gray700,
//   }
// });