import { View, Text } from 'react-native';
import React, { useState, useEffect } from 'react';
import { getLocalStorage } from '../service/Storage';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function Header() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            const storedUser = await getLocalStorage('userDetail');
            console.log("Retrieved user:", storedUser); // Debugging log
            if (storedUser) {
                setUser(storedUser);
            }
        };

        fetchUser();
    }, []);

    if (!user) return null; // Avoid rendering empty state

    return (
        <View style={{display:'flex', flexDirection:'row', alignItems:'center', justifyContent:'space-between'}}>
            <Text style={{fontSize:15, fontWeight:'bold'}}>Welcome, {user.displayName}!</Text>
            <Ionicons name="notifications-outline" size={24} color="black" />
        </View>
        
    );
}
