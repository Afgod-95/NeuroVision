import { useFonts } from "expo-font";
import { router, Slot } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import axios from 'axios';
import { Provider, useSelector } from "react-redux";
import { RootState, store } from "@/src/redux/store";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Constants from "expo-constants";
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

// Axios config
axios.defaults.baseURL = Constants.expoConfig?.extra?.baseBackendUrl;
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.withCredentials = true;

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

export default function RootLayout() {
  const [loaded] = useFonts({
    'Manrope-Regular': require('../src/assets/fonts/Manrope-Regular.ttf'),
    'Manrope-ExtraBold': require('../src/assets/fonts/Manrope-ExtraBold.ttf'),
    'Manrope-Medium': require('../src/assets/fonts/Manrope-Medium.ttf'),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutInner />
        </GestureHandlerRootView>
      </Provider>
    </QueryClientProvider>
  );
}

// Move useSelector inside here
function RootLayoutInner() {
  const user = useSelector((state: RootState) => state.user);

  useEffect(() => {
    if (user.isAuthenticated === true) {
      router.replace('/(home)');
    }
  }, [user]);

  return (
    <>
      <StatusBar
        style="light"
        backgroundColor="transparent"
        translucent={false}
        animated={true}
      />
      <Slot />
    </>
  );
}
