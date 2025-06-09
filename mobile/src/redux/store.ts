import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";

import authReducer from "./slices/authSlice";
import messageOptionsReducer from "./slices/messageOptionsSlice";



// Combine all reducers
const rootReducer = combineReducers({
  user: authReducer,
  messageOptions: messageOptionsReducer
});

// Configuration for persistence
const persistConfig = {
  key: "root",
  version: 1,
  storage: AsyncStorage, 
};

// Apply persistence to the combined reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Create and configure the store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Create the persistor
export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;