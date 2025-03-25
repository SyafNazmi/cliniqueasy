import { View, Text } from 'react-native'
import React, { useEffect } from 'react'
import { Tabs, useRouter } from 'expo-router'
import { FontAwesome } from '@expo/vector-icons'
import { getLocalStorage } from "../../service/Storage";
import { account } from "../../configs/AppwriteConfig";

export default function TabLayout() {
    const router = useRouter();

    useEffect(() => {
        CheckUserAuthentication();
    }, [])

    const CheckUserAuthentication = async () => {
        try {
            // Check if user is authenticated in Appwrite
            const user = await account.get();
            // User is logged in, do nothing
        } catch (error) {
            // No active session, redirect to login
            router.replace('/login')
        }
    }
    
    return (
    <Tabs screenOptions={{
        headerShown:false
    }}>
        <Tabs.Screen name = 'index' 
            options={{
                tabBarLabel:'Home',
                tabBarIcon:({color,size}) =>(
                    <FontAwesome name="home" size={24} color="black" />
                )
            }}/>
        <Tabs.Screen name = 'AddNew' 
            options={{
                tabBarLabel:'Book',
                tabBarIcon:({color,size}) =>(
                    <FontAwesome name="calendar" size={24} color="black" />
                )
            }}/>
        <Tabs.Screen name = 'Profile' 
            options={{
                tabBarLabel:'Profile',
                tabBarIcon:({color,size}) =>(
                    <FontAwesome name="user" size={24} color="black" />
                )
            }}/>
    </Tabs>
  )
}