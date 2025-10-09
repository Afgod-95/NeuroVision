import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/src/constants/Colors';
import { Text, View,  TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setSidebarVisible } from '@/src/redux/slices/chatSlice';
import { RootState } from '@/src/redux/store';
import { useRealtimeChat } from '@/src/hooks/chat/realtime/useRealtimeChats';
import CustomSideBar from '@/src/components/chatUI/SideBar';
import { FontAwesome6 } from '@expo/vector-icons';


const Layout = () => {

  const dispatch = useDispatch();
  const { isSidebarVisible } = useSelector((state: RootState) => state.chat);
  const { messages: reduxMessages } = useSelector((state: RootState) => state.chat);
  const { startNewConversation } = useRealtimeChat({})
  const { conversation_id } = useLocalSearchParams();

  // Get the actual conversation ID - memoize to prevent re-renders
  const actualConversationId = useMemo(() =>
    Array.isArray(conversation_id) ? conversation_id[0] : conversation_id,
    [conversation_id]
  );

  // Sidebar handlers
  const handleToggleSidebar = useCallback(() => {
    dispatch(setSidebarVisible(true));
  }, [dispatch]);

  const handleCloseSidebar = useCallback(() => {
    dispatch(setSidebarVisible(false));
  }, [dispatch]);

  const handleOpenSidebar = useCallback(() => {
    dispatch(setSidebarVisible(!isSidebarVisible));
  }, [dispatch, isSidebarVisible]);

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
              <TouchableOpacity onPress={handleToggleSidebar}>
                <Image
                  source={require('@/src/assets/images/menu.png')}
                  style={styles.menuIcon}
                />
              </TouchableOpacity>
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
                    <TouchableOpacity onPress={startNewConversation}>
                      <FontAwesome6 name="edit" size={20} color={Colors.dark.txtPrimary} />
                    </TouchableOpacity>
                  ) : (<View />)}
                </>

              )
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

      <CustomSideBar
        startNewConversation={() => startNewConversation}
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
})

export default Layout;
