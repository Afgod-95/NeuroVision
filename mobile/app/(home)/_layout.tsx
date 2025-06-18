import { Stack, router } from 'expo-router';
import { Colors } from '@/src/constants/Colors';
import { Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const _layout = () => {

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />

      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />

    </Stack>
  );
};

export default _layout;
