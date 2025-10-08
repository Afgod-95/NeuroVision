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

import authReducer, { updateTokens, resetState } from "./slices/authSlice";
import hepticFeedbackReducer from './slices/hepticFeedbackSlice'
import messageOptionsReducer from "./slices/messageOptionsSlice";
import { injectStore, setTokenRefreshCallback, setLogoutCallback } from "../services/axiosClient";
import chatReducer from "./slices/chatSlice";
import searchReducer from "./slices/searchSlice"

// Combine all reducers
const rootReducer = combineReducers({
  auth: authReducer,
  search: searchReducer,
  hepticFeedback:hepticFeedbackReducer,
  messageOptions: messageOptionsReducer,
  chat: chatReducer,
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
        serializableCheck: false,
      },
    }),
});

// Inject store and set up callbacks
injectStore(store);

// Set up token refresh callback
setTokenRefreshCallback((tokens: any) => {
  console.log('Updating tokens in store:', tokens);
  store.dispatch(updateTokens(tokens));
});

// Set up logout callback
setLogoutCallback(() => {
  console.log('Logging out user due to failed token refresh');
  store.dispatch(resetState());
});

// Create the persistor
export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;