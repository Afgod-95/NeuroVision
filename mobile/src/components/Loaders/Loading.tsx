
import { View, ActivityIndicator } from 'react-native'
import React from 'react'
import { Colors } from '@/src/constants/Colors';

const Loading = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size= { 30 } color={Colors.dark.link} />
    </View>
  );
}

export default Loading
