import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router';


export default function LoginScreen() {

  const router = useRouter();

  return (
    <View>
    <View style={{ display:'flex', alignItems: 'center', marginTop:80 }}>
      <Image source={require('./../../assets/images/homescreen-page.png')} 
            style={styles?.image}/>
    </View>
    
    <View style={[styles.container]}>
        <Text style={styles.heading}>Your Friendly Health Booking
        Appointment & Medical Tracking App</Text>
        <Text style={styles.description}>
          Book Appointments Effortlessly and Track Your Health Journey
        </Text>

      
      {/* Continue Button */}
      <TouchableOpacity style={styles.button}
       onPress={()=>router.push('login/signIn')}>
          <Text style={{ textAlign:'center', fontSize:16, fontWeight:'bold', color:'#0AD476'}}>Continue</Text>
      </TouchableOpacity>
      <Text style={{color:'white', marginTop:7}}>Note: By Clicking Continue Button, you will agree to our terms and condition</Text>
    </View>
  </View>
);
}

const styles = StyleSheet.create({
    image: {
      width: 210,
      height: 450,
      objectFit: 'cover',
      borderRadius: 20,
      borderWidth: 3,
      borderColor: '#000',
      
    },
    container: {
      backgroundColor: '#0AD476',
      padding: 25,
      height: '100%',
      alignItems: 'center',
      marginTop: -20,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    heading: {
      fontSize: 25,
      fontWeight: 'bold',
      color:'white',
      textAlign: 'center',
    },
    description: {
      fontSize: 17,
      color:'white',
      textAlign: 'center',
      marginTop: 20,
    },
    button: {
      padding:15,
      backgroundColor:'white',
      borderRadius:99,
      paddingVertical: 12,
      paddingHorizontal: 16,
      width: Dimensions.get('window').width * 0.8,
      marginTop:25,
    },
});