import { useFonts } from "expo-font";
import { router, Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { RootState, store, persistor } from "@/src/redux/store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Buffer } from "buffer";
import { Colors } from "../constants/Colors";
import BiometricAuthGate from "../components/biometricAuthGate/BiometricGateAuth";

global.Buffer = global.Buffer || Buffer;

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

export default function RootLayout() {
  const [loaded] = useFonts({
    "Manrope-Regular": require("../assets/fonts/Manrope-Regular.ttf"),
    "Manrope-ExtraBold": require("../assets/fonts/Manrope-ExtraBold.ttf"),
    "Manrope-Medium": require("../assets/fonts/Manrope-Medium.ttf"),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <PersistGate persistor={persistor}>
          <GestureHandlerRootView
            style={{ flex: 1, backgroundColor: Colors.dark.bgPrimary }}
          >
            <RootLayoutInner />
          </GestureHandlerRootView>
        </PersistGate>
      </Provider>
    </QueryClientProvider>
  );
}

function RootLayoutInner() {
  const user = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (user?.isAuthenticated) {
      router.replace("/(home)");
    } else {
      router.replace("/(auth)");
    }
  }, [user?.isAuthenticated]);

  const content = (
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

  // 🔐 Only wrap home side of the app with biometrics
  if (user?.isAuthenticated) {
    return <BiometricAuthGate>{content}</BiometricAuthGate>;
  }

  return content;
}
