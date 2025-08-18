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

      <Stack.Screen
        name='settings/privacy'
        options={{
          title: "Privacy Policy",
          headerShown: true,
           headerStyle: {
            backgroundColor: Colors.dark.bgPrimary,
          },
          headerTitleStyle: {
            color: Colors.dark.txtPrimary, 
            fontSize: 18, 
            fontWeight: 'bold',
          },
          headerTintColor: Colors.dark.txtPrimary, 
        }}
      />

      <Stack.Screen
        name='settings/terms'
        options={{
          title: "Privacy Policy",
          headerShown: true,
          headerStyle: {
            backgroundColor: Colors.dark.bgPrimary,
          },
          headerTitleStyle: {
            color: Colors.dark.txtPrimary, 
            fontSize: 18, 
            fontWeight: 'bold',
          },
          headerTintColor: Colors.dark.txtPrimary, 
        }}
      />


       <Stack.Screen
        name='settings/help'
        options={{
          title: "Help and FAQ's",
          headerShown: true,
          headerStyle: {
            backgroundColor: Colors.dark.bgPrimary,
          },
          headerTitleStyle: {
            color: Colors.dark.txtPrimary, 
            fontSize: 18, 
            fontWeight: 'bold',
          },
          headerTintColor: Colors.dark.txtPrimary, 
        }}
      />

      <Stack.Screen
        name='settings/support'
        options={{
          title: "Contact support",
          headerShown: true,
          presentation: 'card',
          headerStyle: {
            backgroundColor: Colors.dark.bgPrimary,
          },
          headerTitleStyle: {
            color: Colors.dark.txtPrimary, 
            fontSize: 18, 
            fontWeight: 'bold',
          },
          headerTintColor: Colors.dark.txtPrimary, 
        }}
      />

      <Stack.Screen
        name='settings/account'
        options={{
          title: "Account",
          headerShown: false,
          presentation: 'card'
        }}
      />

    </Stack>
  );
};

export default _layout;
