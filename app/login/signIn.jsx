import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { useRouter } from 'expo-router'
import { account } from '../../configs/AppwriteConfig';
import { setLocalStorage, removeLocalStorage } from '../../service/Storage';
import Toast from 'react-native-toast-message';
import RoleManager from '../../configs/RoleManager';
import { useAuth } from '../_layout';

export default function SignIn() {
    const router = useRouter();
    const { setUser, setIsDoctor } = useAuth();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

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
            setLoading(true);
            console.log('Starting sign-in process...');
            
            // Clear previous session data
            await removeLocalStorage();
            
            try {
                await account.deleteSessions();
            } catch (deleteError) {
                console.log('Session deletion error (can be ignored):', deleteError);
            }

            // Create new session
            const session = await account.createEmailPasswordSession(email, password);
            console.log('New session created');
            
            // Get user details with preferences
            const user = await account.get();
            console.log('User details fetched:', user.$id);
            console.log('User preferences:', user.prefs);

            // SIMPLIFIED ROLE CHECKING - Primary method: user preferences
            let isUserDoctor = false;
            let doctorLicense = null;

            // Check user preferences first (most reliable since we set it during signup)
            if (user.prefs && typeof user.prefs === 'object') {
                // Direct boolean check
                if (user.prefs.isDoctor === true) {
                    isUserDoctor = true;
                    console.log('Doctor status found in preferences: isDoctor = true');
                }
                // Role string check
                else if (user.prefs.role === 'doctor') {
                    isUserDoctor = true;
                    console.log('Doctor status found in preferences: role = doctor');
                }
                
                // Get doctor license if available
                if (user.prefs.doctorLicense) {
                    doctorLicense = user.prefs.doctorLicense;
                }
            }

            // Fallback: Use RoleManager if preferences don't have clear role info
            if (!isUserDoctor && (!user.prefs || !user.prefs.role)) {
                console.log('No role in preferences, checking with RoleManager...');
                isUserDoctor = await RoleManager.isDoctor(user.$id);
                console.log('RoleManager check result:', isUserDoctor);
            }

            // Create user data object
            const userData = {
                uid: user.$id,
                email: user.email || email,
                displayName: user.name || email.split('@')[0],
                isDoctor: isUserDoctor,
                role: isUserDoctor ? 'doctor' : 'patient',
                ...(isUserDoctor && doctorLicense && { doctorLicense: doctorLicense })
            };

            console.log("Final user data being saved:", userData);
            
            // Save to local storage
            await setLocalStorage('userDetail', userData);
            
            // Update auth context
            setUser(userData);
            setIsDoctor(userData.isDoctor);

            // Set role caches for quick access
            await RoleManager.setGlobalRoleFlag(isUserDoctor);
            await RoleManager.cacheRole(user.$id, isUserDoctor);

            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Signed in successfully!',
            });

            // Redirect based on role
            setTimeout(() => {
                if (userData.isDoctor) {
                    console.log('Redirecting to doctor dashboard');
                    router.replace('/doctor');
                } else {
                    console.log('Redirecting to patient dashboard');
                    router.replace('/(tabs)');
                }
            }, 100);
            
        } catch (error) {
            console.error('Signin Error:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'Failed to sign in',
            });
        } finally {
            setLoading(false);
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
            <TouchableOpacity 
                style={[styles.button, loading && styles.buttonDisabled]} 
                onPress={OnSignInClick}
                disabled={loading}
            >
                <Text style={{ fontSize:17, color:'white', textAlign:'center'}}>
                    {loading ? "Signing In..." : "Login"}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={styles.buttonCreate}
                onPress={()=>router.push('login/signUp')}
                disabled={loading}
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
    buttonDisabled: {
        backgroundColor: '#88d8b0', // Lighter green
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