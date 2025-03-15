import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native'
import React, { useState } from 'react'
import { Colors } from './../../constants/Colors'
import { useRouter } from 'expo-router'
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from "../../configs/FirebaseConfig";
import { setLocalStorage } from '../../service/Storage';

export default function SignIn() {

    const router=useRouter();
    
    const [email,setEmail]=useState();
    const [password,setPassword]=useState();

    const OnSignInClick=()=> {

     if (!email||!password) {
        Alert.alert('Please Enter email & password');
        return; // Add return to prevent further execution
             }
     signInWithEmailAndPassword(auth, email, password)
     .then(async(userCredential) => {
     // Signed in 
     const user = userCredential.user;
     console.log(user);
     await setLocalStorage('userDetail', user);
     router.replace('(tabs)')
    })
    .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;

        if (errorCode == 'auth/invalid-credential') {
            
            Alert.alert('Invalid Email or Password');
        }
    });
    }
  return (
    <View style={{ padding:25, marginTop:50}}>
      <Text style={styles.textHeader}>Let's Sign You In</Text>
      <Text style={styles.subText}>Welcome Back</Text>
      <Text style={styles.subText}>You've been Missed!</Text>

      <View style={{ marginTop:25}}> 
        <Text>Email</Text>
        <TextInput placeholder='Email' style={styles.textInput}
            onChangeText={(value)=>setEmail(value)}/>
      </View>
      <View style={{ marginTop:25}}> 
        <Text>Password</Text>
        <TextInput placeholder='Password' secureTextEntry={true} style={styles.textInput}
            onChangeText={(value)=>setPassword(value)}/>
      </View>

      <TouchableOpacity style={styles.button} onPress={OnSignInClick}>
        <Text style={{ fontSize:17, color:'white', textAlign:'center'}}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.buttonCreate}
      onPress={()=>router.push('login/signUp')}>
        <Text style={{ fontSize:17, color:'#0AD476', textAlign:'center'}}>Create Account</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create ({
    textHeader:{
        fontSize:30,
        fontWeight:'bold'
    },
    subText:{
        fontSize:30,
        fontWeight:'bold',
        marginTop:10,
        color:'#C0C0C0'
    },
    textInput:{
        padding:10,
        borderWidth:1,
        fontSize:17,
        borderRadius:10,
        marginTop:5,
        backgroundColor:'white'
    },
    button: {
        padding:15,
        backgroundColor:'#0AD476',
        borderRadius:10,
        marginTop:35
    },
    buttonCreate: {
        padding:15,
        backgroundColor:'white',
        borderRadius:10,
        marginTop:35,
        borderWidth:1,
        borderColor:'#0AD476'
    }
})