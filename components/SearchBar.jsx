import { View, Text, TextInput } from 'react-native'
import React, { useState } from 'react'
import Ionicons from '@expo/vector-icons/Ionicons';

export default function SearchBar({setSearchText}) {
    const [searchInput, setSearchInput]=useState();
  return (
    <View style={{marginTop:15}}>
        <View style={{display:'flex', flexDirection:'row', gap:5, alignItems:'center', borderWidth:0.6, borderColor:'grey', padding:8, borderRadius:8}}>
            <Ionicons name="search" size={24} color="black" />
            <TextInput 
            style={{width:100}} 
            placeholder='Search' 
            onChangeText={(value)=>setSearchInput(value)}
            onSubmitEditing={()=>setSearchText(searchInput)}/>
        </View>
    </View>
  )
}