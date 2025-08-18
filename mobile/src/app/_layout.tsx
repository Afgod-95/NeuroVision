import { useFonts } from "expo-font";
import { Text, View } from "react-native";
import { router, Slot, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { RootState, store, persistor } from "@/src/redux/store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Buffer } from "buffer";
import { Colors } from "../constants/Colors";
import BiometricAuthGate from "../components/biometricAuthGate/BiometricGateAuth";
import axios from "axios";
import Constants from "expo-constants";

axios.defaults.baseURL = Constants.expoConfig?.extra?.baseBackendUrl;

global.Buffer = global.Buffer || Buffer;
SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

// Loading component for PersistGate
const LoadingComponent = () => (
  <View
    style={{
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: Colors.dark.bgPrimary,
    }}
  >
    <Text style={{ color: "white", fontSize: 16 }}>Initializing...</Text>
  </View>
);

export default function RootLayout() {
  const [loaded, error] = useFonts({
    "Manrope-Regular": require("../assets/fonts/Manrope-Regular.ttf"),
    "Manrope-ExtraBold": require("../assets/fonts/Manrope-ExtraBold.ttf"),
    "Manrope-Medium": require("../assets/fonts/Manrope-Medium.ttf"),
  });

  // Log font loading errors
  useEffect(() => {
    if (error) {
      console.error('Font loading error:', error);
    }
  }, [error]);

  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <PersistGate loading={<LoadingComponent />} persistor={persistor}>
          <GestureHandlerRootView
            style={{ flex: 1, backgroundColor: Colors.dark.bgPrimary }}
          >
            <RootLayoutInner fontsLoaded={loaded} />
          </GestureHandlerRootView>
        </PersistGate>
      </Provider>
    </QueryClientProvider>
  );
}

function RootLayoutInner({ fontsLoaded }: { fontsLoaded: boolean }) {
  const user = useSelector((state: RootState) => state.auth);
  const currentPathname = usePathname();
  const [rehydrated, setRehydrated] = useState(false);
  const [initialNavigationDone, setInitialNavigationDone] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('RootLayoutInner state:', {
      fontsLoaded,
      rehydrated,
      user: {
        isAuthenticated: user?.isAuthenticated,
        isRegistrationComplete: user?.isRegistrationComplete
      },
      currentPathname,
      initialNavigationDone
    });
  }, [fontsLoaded, rehydrated, user, currentPathname, initialNavigationDone]);

  // Wait for redux-persist hydration
  useEffect(() => {
    const unsubscribe = persistor.subscribe(() => {
      const state = persistor.getState();
      if (state.bootstrapped) {
        console.log('Redux persist rehydrated');
        setRehydrated(true);
      }
    });

    // Check if already bootstrapped
    if (persistor.getState().bootstrapped) {
      setRehydrated(true);
    }

    return unsubscribe;
  }, []);

  // Hide splash only when BOTH fonts + redux are ready
  useEffect(() => {
    if (fontsLoaded && rehydrated) {
      console.log('Hiding splash screen');
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, rehydrated]);

  // Navigation logic - only run once after rehydration
  useEffect(() => {
    if (!rehydrated || !fontsLoaded || initialNavigationDone) return;

    const currentPath = currentPathname || "";
    console.log('Running navigation logic:', { currentPath, user });

    // Case 1: User is authenticated and registration is complete -> redirect to home
    if (user?.isAuthenticated && user?.isRegistrationComplete) {
      if (!currentPath.includes("/(home)")) {
        console.log('Redirecting to home');
        router.replace("/(home)");
      }
    } 
    // Case 2: User is authenticated but registration is NOT complete -> redirect to onboarding
    else if (user?.isAuthenticated && !user?.isRegistrationComplete) {
      if (!currentPath.includes("/onboarding")) {
        console.log('Redirecting to onboarding');
        router.replace("/"); // Adjust this path to your onboarding route
      }
    } 
    // Case 3: User is NOT authenticated -> redirect to login
    else if (!user?.isAuthenticated) {
      if (!currentPath.includes("/(auth)/")) {
        console.log('Redirecting to login');
        router.replace("/(auth)/login");
      }
    }

    setInitialNavigationDone(true);
  }, [
    rehydrated,
    fontsLoaded,
    user?.isAuthenticated,
    user?.isRegistrationComplete,
    currentPathname,
    initialNavigationDone,
  ]);

  // Show loading screen while waiting for redux + fonts
  if (!fontsLoaded || !rehydrated) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.dark.bgPrimary,
        }}
      >
        <Text style={{ color: "white", fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  const content = (
    <>
      <StatusBar
        style="light"
        backgroundColor="transparent"
        translucent={false}
        animated
      />
      <Slot />
    </>
  );

  // Only apply BiometricAuthGate for authenticated users with complete registration
  if (user?.isAuthenticated && user?.isRegistrationComplete) {
    return <BiometricAuthGate>{content}</BiometricAuthGate>;
  }

  return content;
}