import { View, Text } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Tabs, useRouter } from 'expo-router'
import { FontAwesome } from '@expo/vector-icons'
import { getLocalStorage } from "../../service/Storage";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../configs/FirebaseConfig";

export default function TabLayout() {
  
    const router=useRouter();
    // const [authenticated,setAuthenticated]=useState();
    // //verify the user login or not
    // onAuthStateChanged(auth, (user) => {
    //     if (user) {
    //       // User is signed in, see docs for a list of available properties
    //       // https://firebase.google.com/docs/reference/js/auth.user
    //       const uid = user.uid;
    //       console.log(uid);
    //       setAuthenticated(true);
    //       // ...
    //     } else {
    //       // User is signed out
    //       setAuthenticated(false);
    //     }
    //   })

    // useEffect(()=>{
    //     if (authenticated==false) {
    //         router.push('/login')
    //     }
    // },[authenticated])

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