export default {
  expo: {
    name: "NeuroVision",
    slug: "NeuraVision",
    scheme: "neurovision",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./src/assets/images/icon.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    splash: {
      image: "./src/assets/images/adaptive-icon.png",
      imageWidth: 200,
      resizeMode: "contain",
      backgroundColor: "#0D0D0D"
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.afgod-95.Neurovision",
      deploymentTarget: "16.0", 
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./src/assets/images/adaptive-icon.png",
        backgroundColor: "#0D0D0D"
      },
      edgeToEdgeEnabled: true,
      package: "com.afgod95.NeuroVision",

    },
    web: {
      bundler: "metro",
      output: "server",
      favicon: "./src/assets/images/favicon.png"
    },
    plugins: [
      "expo-font",
      [
        "expo-router",
        {
          origin: "https://neuro-vision-kohl.vercel.app/"
        }
      ],
      "expo-web-browser",
      [
        "expo-document-picker",
        {
          iCloudContainerEnvironment: "Production"
        }
      ],
      [
        "expo-audio",
        {
          microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone."
        }
      ],
      "@react-native-google-signin/google-signin"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "190efbad-8406-4157-9923-2f5a5f4dc200"
      },

      // backend url 
      baseBackendUrl: process.env.BASE_BACKEND_URL,

      // supabase 
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    }
  }
};