import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/src/constants/Colors';
import { Text, View, TouchableOpacity, Image, StyleSheet, Pressable } from 'react-native';
import { useCallback, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setSidebarVisible, setConversationId } from '@/src/redux/slices/chatSlice';
import { RootState } from '@/src/redux/store';
import { useRealtimeChat } from '@/src/hooks/chat/realtime/useRealtimeChats';
import CustomSideBar from '@/src/components/chatUI/SideBar';
import { FontAwesome6 } from '@expo/vector-icons';

const Layout = () => {
  const dispatch = useDispatch();
  const { isSidebarVisible, conversationId: reduxConversationId } = useSelector((state: RootState) => state.chat);
  const { messages: reduxMessages } = useSelector((state: RootState) => state.chat);
  const { startNewConversation } = useRealtimeChat({});
  const { conversation_id } = useLocalSearchParams();

  // Get the actual conversation ID from URL params
  const actualConversationId = useMemo(() => {
    const urlConvId = Array.isArray(conversation_id) ? conversation_id[0] : conversation_id;
    return urlConvId || '';
  }, [conversation_id]);

  // Sync URL conversation ID with Redux store
  useEffect(() => {
    if (actualConversationId && actualConversationId !== reduxConversationId) {
      console.log('Syncing conversation ID to Redux:', actualConversationId);
      dispatch(setConversationId(actualConversationId));
    }
  }, [actualConversationId, reduxConversationId, dispatch]);

  // Sidebar handlers - memoized to prevent recreating functions
  const handleToggleSidebar = useCallback(() => {
    dispatch(setSidebarVisible(true));
  }, [dispatch]);

  const handleCloseSidebar = useCallback(() => {
    dispatch(setSidebarVisible(false));
  }, [dispatch]);

  const handleOpenSidebar = useCallback(() => {
    console.log('Opening sidebar');
    dispatch(setSidebarVisible(true));
  }, [dispatch]);

  // Create a proper callback for startNewConversation
  const handleStartNewConversation = useCallback(() => {
    console.log('Starting new conversation');
    startNewConversation();
    // Close sidebar after starting new conversation
    dispatch(setSidebarVisible(false));
  }, [startNewConversation, dispatch]);

  const handleLibraryPress = useCallback(() => {
    console.log('Library pressed from layout');
    // Navigate to library or handle library logic
    // router.push('/(home)/library');
    dispatch(setSidebarVisible(false));
  }, [dispatch]);

  return (
    <>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: true,
            presentation: 'card',
            headerTransparent: true,
            headerLeft: () => (
              <Pressable
                onPress={handleToggleSidebar}
                style={styles.headerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Image
                  source={require('@/src/assets/images/menu.png')}
                  style={styles.menuIcon}
                />
              </Pressable>
            ),
            headerTitle: 'NeuroVision',
            headerTitleStyle: {
              color: '#fff',
              fontSize: 18,
              fontWeight: 'bold',
              fontFamily: 'Manrope'
            },
            headerStyle: {
              backgroundColor: 'transparent',
            },
            title: "NeuroVision",
            headerRight: () => {
              return (
                <>
                  {reduxMessages?.length !== 0 ? (
                    <TouchableOpacity 
                      onPress={handleStartNewConversation}
                      style={styles.headerButton}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <FontAwesome6 name="edit" size={20} color={Colors.dark.txtPrimary} />
                    </TouchableOpacity>
                  ) : null}
                </>
              );
            }
          }}
        />

        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />

        <Stack.Screen
          name='settings/privacy'
          options={{
            title: "Privacy Policy",
            headerShown: true,
            headerStyle: {
              backgroundColor: Colors.dark.bgPrimary,
            },
            headerTitleStyle: {
              color: Colors.dark.txtPrimary,
              fontSize: 18,
              fontWeight: 'bold',
            },
            headerTintColor: Colors.dark.txtPrimary,
          }}
        />

        <Stack.Screen
          name='settings/terms'
          options={{
            title: "Terms of Service",
            headerShown: true,
            headerStyle: {
              backgroundColor: Colors.dark.bgPrimary,
            },
            headerTitleStyle: {
              color: Colors.dark.txtPrimary,
              fontSize: 18,
              fontWeight: 'bold',
            },
            headerTintColor: Colors.dark.txtPrimary,
          }}
        />

        <Stack.Screen
          name='settings/help'
          options={{
            title: "Help and FAQ's",
            headerShown: true,
            headerStyle: {
              backgroundColor: Colors.dark.bgPrimary,
            },
            headerTitleStyle: {
              color: Colors.dark.txtPrimary,
              fontSize: 18,
              fontWeight: 'bold',
            },
            headerTintColor: Colors.dark.txtPrimary,
          }}
        />

        <Stack.Screen
          name='settings/support'
          options={{
            title: "Contact support",
            headerShown: true,
            presentation: 'card',
            headerStyle: {
              backgroundColor: Colors.dark.bgPrimary,
            },
            headerTitleStyle: {
              color: Colors.dark.txtPrimary,
              fontSize: 18,
              fontWeight: 'bold',
            },
            headerTintColor: Colors.dark.txtPrimary,
          }}
        />

        <Stack.Screen
          name='settings/account'
          options={{
            title: "Account",
            headerShown: false,
            presentation: 'card'
          }}
        />
      </Stack>

      {/* CustomSideBar with proper conversation ID tracking */}
      <CustomSideBar
        conversationId={actualConversationId}
        startNewConversation={handleStartNewConversation}
        onLibraryPress={handleLibraryPress}
        isVisible={isSidebarVisible}
        onClose={handleCloseSidebar}
        onOpen={handleOpenSidebar}
      />
    </>
  );
};

const styles = StyleSheet.create({
  menuIcon: {
    width: 24,
    height: 24,
  },
  headerButton: {
    width: 35,
    height: 35,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Layout;