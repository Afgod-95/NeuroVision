import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import React from 'react'
import Feather from '@expo/vector-icons/Feather';
import AntDesign from '@expo/vector-icons/AntDesign';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/src/constants/Colors';


type SearchbarProps = {
    value: string,
    onChangeText: (text: string) => void,
    onClear: () => void,
    onSearch: () => void,
 
    onCancel: () => void,
}

const SearchBar: React.FC<SearchbarProps> = ({
    value,
    onChangeText,
    onClear,
}) => {
    return (
       
            <Animated.View
                style = {{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 15,
                }}
            >
                <Animated.View
                    style={styles.searchContainer}
                    exiting={FadeOut.delay(1).duration(10)}
                >
                    <View style={styles.searchIcon}>
                        <Feather name="search" size={20} color={Colors.dark.txtSecondary} />
                    </View>
                    <TextInput
                        placeholder='Search'
                        value={value}
                        autoFocus = {false}
                        returnKeyType='search'
                        onChangeText={onChangeText}
                        placeholderTextColor={Colors.dark.txtSecondary}
                        style={styles.searchInput}
                    />
                    {value.length > 0 && (
                        <Animated.View
                            entering={FadeIn}
                            exiting={FadeOut}
                        >
                            <TouchableOpacity onPress = {onClear}
                            style={[
                                styles.searchIcon, 
                                { 
                                    marginLeft: 10,  
                                    marginRight: 0
                                }
                            ]}
                        >
                            <AntDesign name="closecircle" size={20} color={Colors.dark.txtSecondary} />
                        </TouchableOpacity>
                        </Animated.View>
                    )}
                </Animated.View>
            </Animated.View>
    
    ) 
};

const styles = StyleSheet.create({
    
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.dark.bgSecondary,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        
    },
    searchInput: {
        flex: 1,
        color: Colors.dark.txtPrimary,
        fontSize: 16,
        fontFamily: 'Manrope-Regular',
    },
    searchIcon: {
        marginRight: 10,
    },
    cancel: {
        color: Colors.dark.txtSecondary,
        fontSize: 14,
    },
    gradient: {
        position: 'absolute',
        bottom: -20,
        left: 0,
        right: 0,
        height: 20,
        zIndex: -1,
    }
})

export default SearchBar;