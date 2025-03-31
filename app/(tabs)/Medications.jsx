// app/(tabs)/Medications.jsx
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions } from 'react-native';
import React, { act, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from 'react-native-svg';
import { Link } from 'expo-router';

const {width} = Dimensions.get("window");

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const QUICK_ACTIONS = [
    {
        icon: "add-circle-outline",
        label: "Add \nMedications",
        route: "medications/add",
        color: "#2E7D32",
        gradient: ["#4CAF50", "#2E7D32"],
    },
    {
        icon: "calendar-outline",
        label: "Add \nCalendar",
        route: "/calendar",
        color: "#1976D2",
        gradient: ["#2196F3", "#1976D2"],
    },
    {
        icon: "time-outline",
        label: "History \nLog",
        route: "/history",
        color: "#C2185B",
        gradient: ["#E91E63", "#C2185B"],
    },
    {
        icon: "medical-outline",
        label: "Refill \nTracker",
        route: "/refill",
        color: "#E64A19",
        gradient: ["#FF5722", "#E64A19"],
    },
];
interface CircularProgressProps {
    progress: number;
    totalDoses: number;
    completeDoses: number;
}

function CircularProgress({
    progress,
    totalDoses,
    completeDoses  
}: CircularProgressProps) {
    const animationValue = useRef(new Animated.Value(0)).current;
    const size = width * 0.55
    const strokeWidth = 15
    const radius = (size -  strokeWidth) / 2
    const circumference = 2 * Math.PI * radius

    useEffect(() => {
        Animated.timing(animationValue, {
            toValue: progress,
            duration: 1000,
            useNativeDriver: true,
        }).start();
    }, [progress]);

    const strokeDashoffset = animationValue.interpolate({
        inputRange: [0, 10],
        outputRange: [circumference, 0],
    });

    return (
        <View style={styles.progressContainer}>
            <View style={styles.progressTextContainer}>
                <Text style={styles.progressPercentage}> {Math.round(progress)}%</Text>
                <Text style={styles.progressLabel}> 
                    {" "}
                    {completeDoses} of {totalDoses} doses</Text>
                </View>
                <Svg width={size} height={size} style={styles.progressRing}>
                    <Circle 
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth={strokeWidth}
                    fill="none"
                    />
                    <AnimatedCircle 
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="white"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                </Svg>
            
        </View>
    )
}
export default function Medications() {
  return (
    <ScrollView style={styles.container}>
        <LinearGradient colors={["#0AD476", "#146922"]} style={styles.header}>
            <View style={styles.headerContent}>
                <View style={styles.headerTop}>
                    <View style={{flex: 1}}>
                        <Text style={styles.greeting}>Daily Progress</Text>
                    </View>
                    <TouchableOpacity style={styles.notificationButton}>
                        <Ionicons name="notifications-outline" size={24} color="white" />
                        {/* Render the notificationBadge */
                            <View style={styles.notificationBadge}>
                                <Text style={styles.notificationCount}>1</Text>
                            </View>
                        }
                    </TouchableOpacity>
                </View>
                <CircularProgress 
                    progress={50}
                    totalDoses={10}
                    completeDoses={5}/>
            </View>
        </LinearGradient>

        {/* Quick Action Section */}
        <View style={styles.content}>
            <View style={styles.quickActionsContainer}>
                <Text style={styles.sectionTitle}>Quick Action</Text>
            <View style={styles.quickActionsGrid}>
                {QUICK_ACTIONS.map((action) => (
                    <Link href={action.route} key={action.label} asChild>
                        <TouchableOpacity style={styles.actionButton}>
                            <LinearGradient colors={action.gradient} style={styles.actionGradient}>
                            <View style={styles.actionContent}>
                                <View style={styles.actionIcon}>
                                <Ionicons name={action.icon} size={24} color="white"/>
                                </View>
                                <Text style={styles.actionLabel}>{action.label}</Text>
                            </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Link>
                ))}
            </View>
            </View>
        </View>

        {/* Today Medicine Section */}
        <View style={ {paddingHorizontal: 20 }}> 
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Schedule</Text>
                <Link  href="/calendar" asChild/>
                <TouchableOpacity>
                    <Text style={styles.seeAllButton}>See All</Text>
                </TouchableOpacity>
            </View>
            {true ? (
                <View style={styles.emptyState}>
                    <Ionicons name="medical-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyStateText}>No Medications Scheduled for Today</Text>
                    <Link href="/medications/add"/>
                        <TouchableOpacity style={styles.addMedicationButton}>
                            <Text style={styles.addMedicationButtonText}>Add Medication</Text>
                        </TouchableOpacity>
                </View>
            ) : (
                [].map ((medications)=> {
                    return (
                        <View style={styles.doseCard}>
                            <View style={[styles.doseCard,
                                // { backgroundColor: medications.color }
                            ]}>
                                <Ionicons name="medical" size={24}/>
                            </View>
                            <View style={styles.doseInfo}>
                                <View>
                                    <Text style={styles.medicineName}>name</Text>
                                    <Text style={styles.dosageInfo}>dosage</Text>
                                </View>
                                <View style={styles.doseTime}>
                                    <Ionicons name="time-outline" size={14} color="#ccc"/>
                                    <Text style={styles.timeText}>Time</Text>
                                </View>
                            </View>
                            {true ? (
                                <View style={styles.takeDoseButton}>
                                <Ionicons name="checkmark-circle-outline" size={24}/>
                                <Text style={styles.takeDoseText}>Taken</Text>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.takeDoseButton}>
                                    <Text style={styles.takeDoseText}>Take</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })
            )}
        </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  greeting: {
    color: "white",
    opacity: 0.9,
    fontWeight: "bold"
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  notificationButton: {
    position: "relative",
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    marginLeft: 8,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ff5252",
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    minWidth: 20,
    borderWidth: 2,
    borderColor: "#146922"
  },
  notificationCount: {
    fontSize: 11,
    fontWeight: "bold",
    color: "white",
  },
  progressContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  progressTextContainer: {
    position: "absolute",
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  progressPercentage: {
    fontSize: 36,
    fontWeight: "bold",
    color: "white",
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "rgba(255, 255, 255, 0.9)",
  },
  progressDetails: {
    fontSize: 11,
    fontWeight: "bold",
    color: "white",
  },
  progressRing: {
    transform: [{rotate: "-90deg"}],
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "1a1a1a",
    marginBottom: 5,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 15,
  },
  actionButton: {
    width: (width - 52) / 2,
    height: 100,
    borderRadius: 16,
    overflow: "hidden"
  },
  actionGradient: {
    flex: 1,
    padding: 15,
  },
  actionContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  seeAllButton: {
    color: "#2E7D32",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "white",
    borderRadius: 16,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
    marginBottom: 20,
  },
  addMedicationButton: {
    backgroundColor: "#1a8e2d",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addMedicationButtonText: {
    color: "white",
    fontWeight: "600",
  },
  doseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  doseBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  doseInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  medicineName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  dosageInfo: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  doseTime: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    marginLeft: 5,
    color: "#666",
    fontSize: 14,
  },
  takeDoseButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginLeft: 10,
  },
  takeDoseText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
});