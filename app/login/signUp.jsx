import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { useRouter } from 'expo-router';
import { auth } from '../../configs/FirebaseConfig';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import Toast from 'react-native-toast-message';
import { setLocalStorage } from '../../service/Storage';


export default function SignUp() {

    const router=useRouter();

    const [email,setEmail]=useState();
    const [password,setPassword]=useState();
    const [userName, setUserName]=useState();

    const onCreateAccount=()=> {

        if (!email||!password) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please fill all the details',
            });
            return; // Add return to prevent further execution
        }
        
        createUserWithEmailAndPassword(auth, email, password)
        .then(async(userCredential) => {
            // Signed up 
            const user = userCredential.user;
            
            await updateProfile(user,{
                displayName:userName
            })

            await setLocalStorage('userDetail', user);

            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Account created successfully!',
            });
            router.push('(tabs)')
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log(errorCode);
            if (errorCode=='auth/email-already-in-use') {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Email already exists!',
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'An error occurred. Please try again.',
                });
            }
        });
    }
  return (
    <View style={{ padding:25, marginTop:50}}>
          <Text style={styles.textHeader}>Create New Account</Text>
    
          <View style={{ marginTop:25}}> 
            <Text>Full Name</Text>
            <TextInput placeholder='Full Name' style={styles.textInput}
                onChangeText={(value)=>setUserName(value)}/>
          </View>
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
    
          <TouchableOpacity style={styles.button} onPress={onCreateAccount}>
            <Text style={{ fontSize:17, color:'white', textAlign:'center'}}>Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonCreate}
          onPress={()=>router.push('login/signIn')}>
            <Text style={{ fontSize:17, color:'#0AD476', textAlign:'center'}}>Already Account? Sign In</Text>
          </TouchableOpacity>
          
          {/* Include Toast component in your render method */}
          <Toast />
        </View>
  )
}

const styles = StyleSheet.create ({
    textHeader:{
        fontSize:30,
        fontWeight:'bold'
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