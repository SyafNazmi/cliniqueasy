import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch } from 'react-native'
import React, { useState } from 'react'
import { useRouter } from 'expo-router';
import { account } from '../../configs/AppwriteConfig';
import { ID } from 'appwrite';
import Toast from 'react-native-toast-message';
import { setLocalStorage } from '../../service/Storage';
import RoleManager from '../../configs/RoleManager';

export default function SignUp() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userName, setUserName] = useState('');
    const [isDoctor, setIsDoctor] = useState(false);
    const [loading, setLoading] = useState(false);

    const onCreateAccount = async () => {
        if (!email || !password || !userName) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please fill all the details',
            });
            return;
        }

        try {
            setLoading(true);
            
            // Create user account
            const user = await account.create(
                ID.unique(),    // Unique ID
                email,          // Email
                password,       // Password
                userName        // Name
            );
            
            console.log("User created with ID:", user.$id);

            // Create email session after account creation
            const session = await account.createEmailPasswordSession(email, password);
            console.log("Session created");
            
            // Set the user's role using our utility
            const role = isDoctor ? 'doctor' : 'patient';
            await RoleManager.setUserRole(user.$id, role, account);
            console.log(`User role set to: ${role}`);
            
            // Save user details to local storage with role info
            const userData = {
                uid: user.$id,
                email: user.email,
                displayName: user.name,
                isDoctor: isDoctor,
                role: role
            };
            await setLocalStorage('userDetail', userData);
            console.log("User data saved to localStorage");

            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Account created successfully!',
            });

            // Redirect based on role
            if (isDoctor) {
                console.log("Redirecting to doctor dashboard");
                router.push('/doctor');
            } else {
                console.log("Redirecting to patient dashboard");
                router.push('(tabs)');
            }
        } catch (error) {
            console.error('Signup Error:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'Failed to create account',
            });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <View style={{ padding:25, marginTop:50}}>
            <Text style={styles.textHeader}>Create New Account</Text>
        
            <View style={{ marginTop:25}}> 
                <Text>Full Name</Text>
                <TextInput 
                    placeholder='Full Name' 
                    style={styles.textInput}
                    onChangeText={(value)=>setUserName(value)}
                />
            </View>
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
            
            {/* Add doctor role toggle */}
            <View style={styles.roleToggleContainer}>
                <Text style={styles.roleLabel}>Register as a Doctor</Text>
                <Switch
                    value={isDoctor}
                    onValueChange={setIsDoctor}
                    trackColor={{ false: "#ccc", true: "#0AD476" }}
                    thumbColor={isDoctor ? "#fff" : "#fff"}
                />
            </View>
            
            <TouchableOpacity 
                style={[styles.button, loading && styles.buttonDisabled]} 
                onPress={onCreateAccount}
                disabled={loading}
            >
                <Text style={{ fontSize:17, color:'white', textAlign:'center'}}>
                    {loading ? "Creating Account..." : "Create Account"}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={styles.buttonCreate}
                onPress={()=>router.push('login/signIn')}
                disabled={loading}
            >
                <Text style={{ fontSize:17, color:'#0AD476', textAlign:'center'}}>Already Account? Sign In</Text>
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
    },
    roleToggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 25,
        paddingHorizontal: 5
    },
    roleLabel: {
        fontSize: 16,
        color: '#333'
    }
})