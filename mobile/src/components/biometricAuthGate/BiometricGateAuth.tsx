import * as LocalAuthentication from "expo-local-authentication";
import { useSelector } from "react-redux";
import { ReactNode, useEffect } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";

const BiometricAuthGate = ({ children }: { children: ReactNode }) => {
    const useBiometrics = useSelector((state: any) => state.auth.useBiometrics);

    useEffect(() => {
        const authenticate = async () => {
            if (!useBiometrics) return;

            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

            if (!hasHardware || !isEnrolled) {
                console.log("Biometrics not available or not enrolled");
                return;
            }

            console.log("Supported biometrics:", types);

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: types.includes(2)
                    ? "Login with Face ID"
                    : "Login with Touch ID / Fingerprint",
                fallbackLabel: "Use Passcode",
                cancelLabel: "Cancel",
            });

            if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {


                if (!result.success) {
                    Alert.alert("Authentication failed", "Please login manually.");
                    router.replace("/(auth)");
                }
            } else {
                console.log("Face ID not available");
            }

        };

        authenticate();
    }, [useBiometrics]);

    return children;
};

export default BiometricAuthGate;
