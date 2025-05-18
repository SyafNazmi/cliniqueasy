import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { useRouter } from 'expo-router'
import { account } from '../../configs/AppwriteConfig';
import { setLocalStorage, removeLocalStorage } from '../../service/Storage';
import Toast from 'react-native-toast-message';
import RoleManager from '../../configs/RoleManager';

export default function SignIn() {
    const router = useRouter();
    
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
            
            // Clear all local storage first
            await removeLocalStorage();
            console.log('Local storage cleared');

            // Attempt to delete existing sessions with error handling
            try {
                await account.deleteSessions();
                console.log('Existing sessions deleted');
            } catch (deleteError) {
                console.log('Session deletion error (can be ignored):', deleteError);
                // Continue even if session deletion fails
            }

            // Create new email session
            const session = await account.createEmailPasswordSession(email, password);
            console.log('New session created');
            
            // Get current user account details
            let user;
            try {
                user = await account.get();
                console.log('User details fetched:', user.$id);
                console.log('User labels:', user.labels);
            } catch (getUserError) {
                console.error('Error getting user:', getUserError);
                // If we can't get the user, we'll try to continue with the session information
                if (!session) {
                    throw new Error('Failed to authenticate user');
                }
                // Create a minimal user object from session
                user = { 
                    $id: session.userId,
                    email: email,
                    name: email.split('@')[0] // Fallback name from email
                };
                console.log('Created fallback user object from session');
            }
            
            // MANUAL ROLE CHECK FOR DEBUGGING
            // This checks if the user has the specific "doctor" label in Appwrite
            let isKnownDoctor = false;
            
            if (user.labels) {
                console.log("User labels found:", user.labels);
                
                // Direct check for doctor label
                if (user.labels === "doctor") {
                    isKnownDoctor = true;
                    console.log("Doctor label found directly");
                }
                // Check in array
                else if (Array.isArray(user.labels) && 
                    (user.labels.includes("doctor") || user.labels.includes("role:doctor"))) {
                    isKnownDoctor = true;
                    console.log("Doctor label found in array");
                }
                // Try to handle object with values
                else if (typeof user.labels === 'object') {
                    const hasDoctor = Object.values(user.labels).some(
                        label => label === 'doctor' || label === 'role:doctor'
                    );
                    
                    if (hasDoctor) {
                        isKnownDoctor = true;
                        console.log("Doctor label found in object");
                    }
                }
            }
            
            // Get role information using our utility
            const roleInfo = await RoleManager.getUserRole(user.$id, user.labels || []);
            console.log('Role information retrieved:', roleInfo);
            
            // OVERRIDE: If we found doctor label but roleInfo says patient, fix it
            if (isKnownDoctor && roleInfo.role !== 'doctor') {
                console.log("OVERRIDING ROLE: Found doctor label but roleInfo didn't catch it");
                roleInfo.role = 'doctor';
                roleInfo.isDoctor = true;
            }
            
            // Save user details to local storage
            const userData = {
                uid: user.$id,
                email: user.email || email,
                displayName: user.name || email.split('@')[0],
                isDoctor: roleInfo.isDoctor || isKnownDoctor,
                role: roleInfo.role || (isKnownDoctor ? 'doctor' : 'patient')
            };
            
            console.log("Final user data being saved:", userData);
            await setLocalStorage('userDetail', userData);
            console.log('User data saved to localStorage');

            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Signed in successfully!',
            });

            // Redirect based on role
            if (userData.isDoctor) {
                console.log('Redirecting to doctor dashboard');
                router.replace('/doctor');
            } else {
                console.log('Redirecting to patient dashboard');
                router.replace('(tabs)');
            }
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