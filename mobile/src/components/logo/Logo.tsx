import { View, Text, Image, StyleSheet } from 'react-native'
import React from 'react'
import { Colors } from '@/src/constants/Colors'

const Logo = () => {
  return (
    <View style = {styles.header}>
        <Image source={require('@/src/assets/images/icon.png')} 
          style = {{width: 80, height: 80, marginBottom: 10}}
        />
      <Text style={styles.headerText}>NeuroVision</Text>
    </View>
  )
}

const styles = StyleSheet.create({
   header: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
   },
   headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark.txtPrimary
   }
})

export default Logo