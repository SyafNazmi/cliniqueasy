import AsyncStorage from "@react-native-async-storage/async-storage"

export const setLocalStorage = async(key, value) => {
    try {
        const jsonValue = JSON.stringify(value);
        await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
        console.error("Error storing data", error);
    }
}

export const getLocalStorage = async(key) => {
    try {
        const jsonValue = await AsyncStorage.getItem(key);
        return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
        console.error("Error retrieving data", error);
        return null;
    }
}

export const RemoveLocalStorage=async()=>{
    await AsyncStorage.clear();
}