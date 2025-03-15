import { View, Text, Button } from 'react-native'
import React from 'react'
import { Redirect } from 'expo-router'
import { signOut } from 'firebase/auth'
import { auth } from '@/configs/FirebaseConfig'

export default function HomeScreen() {
  return (
    <View style={{ padding:25, marginTop:50}}>
      <Text>HomeScreen</Text>
      <Button title='Logout' onPress={()=>signOut(auth)} />
    </View>
  )
}