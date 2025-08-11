import Button from "@/src/components/button/CustomButton";
import Onboarding from "@/src/components/onboarding/Onboarding";
import AuthWrapper from "@/src/components/wrapper/ScreenWrapper";
import { router } from "expo-router";


import { StyleSheet, Text, View } from "react-native";


export default function index() {
  return (
    <AuthWrapper>
      <Onboarding />
      <View style={styles.buttonContainer}>
        <Button
          title={'Get Started'}
          onPress={() => router.push('/(auth)/signup')}
        />
      </View>
    </AuthWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontFamily: 'Manrope-Medium',
    fontSize: 24,
  },

  buttonContainer: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: '20',
    flexWrap: 'wrap'
  }
}); 
