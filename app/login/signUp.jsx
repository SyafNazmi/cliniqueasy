import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch } from 'react-native'
import React, { useState } from 'react'
import { useRouter } from 'expo-router';
import { account } from '../../configs/AppwriteConfig';
import { ID } from 'react-native-appwrite';
import Toast from 'react-native-toast-message';
import { setLocalStorage } from '../../service/Storage';
import RoleManager from '../../configs/RoleManager';

export default function SignUp() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userName, setUserName] = useState('');
    const [isDoctor, setIsDoctor] = useState(false);
    const [doctorLicense, setDoctorLicense] = useState('');
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

        if (isDoctor && !doctorLicense.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please enter your doctor license number',
            });
            return;
        }

        try {
            setLoading(true);
            
            // Step 1: Create user account
            const user = await account.create(
                ID.unique(),
                email,
                password,
                userName
            );
            
            console.log("User created with ID:", user.$id);

            // Step 2: Create session immediately after account creation
            const session = await account.createEmailPasswordSession(email, password);
            console.log("Session created successfully");

            // Step 3: Set user preferences with role information
            // This is the critical step that was potentially failing
            const preferences = {
                role: isDoctor ? 'doctor' : 'patient',
                isDoctor: isDoctor,
                ...(isDoctor && doctorLicense.trim() && { doctorLicense: doctorLicense.trim() })
            };

            console.log("Setting user preferences:", preferences);
            await account.updatePrefs(preferences);
            console.log("User preferences set successfully");

            // Step 4: Verify the preferences were set (optional but helpful for debugging)
            const updatedUser = await account.get();
            console.log("User preferences after update:", updatedUser.prefs);

            // Step 5: Use RoleManager to set additional role data
            const role = isDoctor ? 'doctor' : 'patient';
            const additionalData = isDoctor && doctorLicense.trim() 
                ? { doctorLicense: doctorLicense.trim() }
                : {};
                
            await RoleManager.setUserRole(user.$id, role, account, additionalData);
            console.log(`RoleManager: User role set to: ${role}`);
            
            // Step 6: Save comprehensive user data to local storage
            const userData = {
                uid: user.$id,
                email: user.email,
                displayName: user.name,
                isDoctor: isDoctor,
                role: role,
                ...(isDoctor && doctorLicense.trim() && { doctorLicense: doctorLicense.trim() })
            };

            await setLocalStorage('userDetail', userData);
            console.log("User data saved to localStorage:", userData);

            // Step 7: Set role caches for immediate access
            await RoleManager.setGlobalRoleFlag(isDoctor);
            await RoleManager.cacheRole(user.$id, isDoctor);

            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Account created successfully!',
            });

            // Step 8: Redirect based on role
            console.log(`Redirecting ${isDoctor ? 'doctor' : 'patient'} to appropriate dashboard`);
            if (isDoctor) {
                router.push('/doctor');
            } else {
                router.push('(tabs)');
            }

        } catch (error) {
            console.error('Signup Error:', error);
            
            // Provide more specific error messages
            let errorMessage = 'Failed to create account';
            if (error.message.includes('email')) {
                errorMessage = 'Email is already in use or invalid';
            } else if (error.message.includes('password')) {
                errorMessage = 'Password is too weak (minimum 8 characters)';
            }
            
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: errorMessage,
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
            
            {/* Doctor role toggle */}
            <View style={styles.roleToggleContainer}>
                <Text style={styles.roleLabel}>Register as a Doctor</Text>
                <Switch
                    value={isDoctor}
                    onValueChange={(value) => {
                        setIsDoctor(value);
                        // Clear license field when switching off doctor mode
                        if (!value) {
                            setDoctorLicense('');
                        }
                    }}
                    trackColor={{ false: "#ccc", true: "#0AD476" }}
                    thumbColor={isDoctor ? "#fff" : "#fff"}
                />
            </View>

            {/* Conditional Doctor License Field */}
            {isDoctor && (
                <View style={[styles.licenseContainer, { marginTop: 25 }]}>
                    <Text style={styles.licenseLabel}>Doctor License Number</Text>
                    <TextInput 
                        placeholder='Enter your medical license number' 
                        style={styles.textInput}
                        value={doctorLicense}
                        onChangeText={(value) => setDoctorLicense(value)}
                        autoCapitalize='characters' // Capitalize license numbers
                        autoCorrect={false}
                    />
                    <Text style={styles.licenseHelperText}>
                        Please enter your valid medical license number
                    </Text>
                </View>
            )}
            
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
    },
    licenseContainer: {
        // Additional styling for the license container if needed
    },
    licenseLabel: {
        fontSize: 16,
        color: '#333',
        marginBottom: 5
    },
    licenseHelperText: {
        fontSize: 12,
        color: '#666',
        marginTop: 5,
        fontStyle: 'italic'
    }
})