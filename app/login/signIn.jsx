import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { useRouter } from 'expo-router'
import { account } from '../../configs/AppwriteConfig';
import { setLocalStorage, removeSpecificStorageKey, removeLocalStorage } from '../../service/Storage';
import Toast from 'react-native-toast-message';

export default function SignIn() {
    const router = useRouter();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const OnSignInClick = async () => {
        if (!email || !password) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please enter email & password',
            });
            return;
        }
        try {
            // Clear all local storage first
            await removeLocalStorage();

            // Attempt to delete existing sessions with error handling
            try {
                await account.deleteSessions();
            } catch (deleteError) {
                console.log('Session deletion error:', deleteError);
                // Continue even if session deletion fails
            }

            // Create new email session
            const session = await account.createEmailPasswordSession(email, password);
            
            // Get current user account details
            const user = await account.get();

            // Save user details to local storage
            await setLocalStorage('userDetail', {
                uid: user.$id,
                email: user.email,
                displayName: user.name
            });

            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Signed in successfully!',
            });

            router.replace('(tabs)');
        } catch (error) {
            console.error('Signin Error:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'Failed to sign in',
            });
        }
    }
    
    return (
        <View style={{ padding:25, marginTop:50}}>
            <Text style={styles.textHeader}>Let's Sign You In</Text>
            <Text style={styles.subText}>Welcome Back</Text>
            <Text style={styles.subText}>You've been Missed!</Text>
            <View style={{ marginTop:25}}> 
                <Text>Email</Text>
                <TextInput 
                    placeholder='Email' 
                    style={styles.textInput}
                    onChangeText={(value)=>setEmail(value)}
                    autoCapitalize='none'
                />
            </View>
            <View style={{ marginTop:25}}> 
                <Text>Password</Text>
                <TextInput 
                    placeholder='Password' 
                    secureTextEntry={true} 
                    style={styles.textInput}
                    onChangeText={(value)=>setPassword(value)}
                />
            </View>
            <TouchableOpacity style={styles.button} onPress={OnSignInClick}>
                <Text style={{ fontSize:17, color:'white', textAlign:'center'}}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={styles.buttonCreate}
                onPress={()=>router.push('login/signUp')}
            >
                <Text style={{ fontSize:17, color:'#0AD476', textAlign:'center'}}>Create Account</Text>
            </TouchableOpacity>
            <Toast />
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