import 'dotenv/config';

export default {
  expo: {
    name: "NeuroVision",
    slug: "NeuraVision",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./src/assets/images/icon.png",
    scheme: "neurachat",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.afgod-95.Neurovision",
      googleServicesFile: "./GoogleService-Info.plist"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./src/assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: "com.afgod95.NeuroVision",
      googleServicesFile: "./google-services.json"
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
      },
    ],
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          image: "./src/assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ],
      [
        "expo-document-picker",
        {
          "iCloudContainerEnvironment": "Production"
        }
      ],
      [
        "expo-audio",
        {
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone."
        }
      ],
      "@react-native-google-signin/google-signin",
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "190efbad-8406-4157-9923-2f5a5f4dc200"
      },
      // Firebase environment variables
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,

      //backed url 
      baseBackendUrl: process.env.BASE_BACKEND_URL,


      //supabase 
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    },
  }
};