import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { initializeApp } from "firebase/app";
import * as firebaseAuth from 'firebase/auth';
import { GoogleAuthProvider, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId
};


// Initialize Firebase
const FIREBASE_APP = initializeApp(firebaseConfig);

const reactNativePersistence = (firebaseAuth as any).getReactNativePersistence(AsyncStorage);

// Initialize Auth with persistence
const FIREBASE_AUTH = initializeAuth(FIREBASE_APP, {
  persistence: reactNativePersistence
});

const FIREBASE_DB = getFirestore(FIREBASE_APP);



const GOOGLE_AUTH_PROVIDER = new GoogleAuthProvider();

export {
  FIREBASE_APP,
  FIREBASE_AUTH,
  FIREBASE_DB,
  GOOGLE_AUTH_PROVIDER
};
