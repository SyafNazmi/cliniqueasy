import { View, Text } from 'react-native'
import React, { useEffect } from 'react'
import { Tabs, useRouter } from 'expo-router'
import { FontAwesome } from '@expo/vector-icons'
import { getLocalStorage } from "../../service/Storage";


export default function TabLayout() {
  
    const router=useRouter();

    useEffect(()=>{
        GetUserDetail();
    },[])

    const GetUserDetail=async()=> {
        const userInfo = await getLocalStorage('userDetail');
        if(!userInfo){
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